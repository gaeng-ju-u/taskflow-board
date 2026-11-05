"use client";

import {
  EllipsisIcon,
  IterationCwIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { cn } from "cn";

import { EmptyState } from "@/components/common/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  cycleStatus,
  cycleTiming,
  formatCycleRange,
  nextCycleDefaults,
  type Cycle,
  type CycleStatus,
} from "@/lib/api/cycles";
import { groupByCycle, issueProgress, type Issue } from "@/lib/api/issues";
import type { Project } from "@/lib/api/projects";
import { todayInSeoul } from "@/lib/date";
import { useCycles, useDeleteCycle } from "@/lib/queries/cycles";
import { useIssues } from "@/lib/queries/issues";
import { useNow } from "@/hooks/use-now";

import { CycleFormDialog } from "./cycle-form-dialog";
import { CycleProgressBar } from "./cycle-progress-bar";

const SECTIONS: { status: CycleStatus; title: string }[] = [
  { status: "active", title: "진행 중" },
  { status: "upcoming", title: "예정" },
  { status: "completed", title: "완료" },
];

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; cycle: Cycle }
  | { kind: "delete"; cycle: Cycle }
  | null;

// 프로젝트의 사이클 탭. 진행 중 → 예정(가까운 순) → 완료(최근 순)로 묶는다.
// 카드를 누르면 목록 화면에 그 사이클 필터(?cycle=<id>)가 걸린다.
export function CycleList({
  listPath,
  project,
  initialCycles,
  initialIssues,
}: {
  listPath: string;
  project: Project;
  initialCycles: Cycle[];
  initialIssues: Issue[];
}) {
  const workspaceId = project.workspace_id;
  const { data: cycles = initialCycles } = useCycles(
    workspaceId,
    project.id,
    initialCycles,
  );
  const { data: issues = initialIssues } = useIssues(
    workspaceId,
    project.id,
    initialIssues,
  );
  const today = todayInSeoul(useNow());
  const [dialog, setDialog] = useState<Dialog>(null);
  // 닫히는 동안에도 내용이 유지되도록 마지막 대상을 기억한다 (닫힘 애니메이션 중 빈 대화상자 방지).
  const [lastDialog, setLastDialog] = useState<Exclude<Dialog, null>>({
    kind: "create",
  });
  const open = (next: Exclude<Dialog, null>) => {
    setDialog(next);
    setLastDialog(next);
  };

  const issuesByCycle = groupByCycle(issues);
  const sections = SECTIONS.map((section) => {
    const items = cycles.filter(
      (cycle) => cycleStatus(cycle, today) === section.status,
    );
    return {
      ...section,
      cycles: section.status === "completed" ? items.toReversed() : items,
    };
  }).filter((section) => section.cycles.length > 0);

  const formTarget = lastDialog.kind === "edit" ? lastDialog.cycle : undefined;
  const deleteTarget =
    lastDialog.kind === "delete" ? lastDialog.cycle : undefined;

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 pb-6">
      {/* 만들기 버튼과 대화상자는 사이클이 0개일 때와 있을 때 같은 자리에 둔다 (언마운트 방지, CLAUDE.md 참고). */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">
          사이클 {cycles.length}개
        </span>
        <Button size="sm" onClick={() => open({ kind: "create" })}>
          <PlusIcon />새 사이클
        </Button>
      </div>

      {cycles.length === 0 ? (
        <EmptyState
          icon={IterationCwIcon}
          title="아직 사이클이 없습니다"
          description="일정 기간 동안 할 일을 묶어 진행 상황을 확인해 보세요."
        />
      ) : (
        sections.map((section) => (
          <section
            key={section.status}
            aria-labelledby={`cycles-${section.status}`}
            className="flex flex-col gap-2"
          >
            <h2
              id={`cycles-${section.status}`}
              className="text-sm font-medium text-muted-foreground"
            >
              {section.title}
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {section.cycles.map((cycle) => (
                <CycleCard
                  key={cycle.id}
                  cycle={cycle}
                  issues={issuesByCycle.get(cycle.id) ?? []}
                  today={today}
                  href={`${listPath}?cycle=${cycle.id}`}
                  onEdit={() => open({ kind: "edit", cycle })}
                  onDelete={() => open({ kind: "delete", cycle })}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      <CycleFormDialog
        workspaceId={workspaceId}
        projectId={project.id}
        cycles={cycles}
        cycle={formTarget}
        initial={
          formTarget
            ? {
                name: formTarget.name,
                starts_at: formTarget.starts_at,
                ends_at: formTarget.ends_at,
              }
            : nextCycleDefaults(cycles, today)
        }
        open={dialog?.kind === "create" || dialog?.kind === "edit"}
        onOpenChange={(next) => !next && setDialog(null)}
      />
      <DeleteCycleDialog
        workspaceId={workspaceId}
        projectId={project.id}
        cycle={deleteTarget}
        open={dialog?.kind === "delete"}
        onOpenChange={(next) => !next && setDialog(null)}
      />
    </div>
  );
}

function CycleCard({
  cycle,
  issues,
  today,
  href,
  onEdit,
  onDelete,
}: {
  cycle: Cycle;
  issues: Issue[];
  today: string;
  href: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = cycleStatus(cycle, today);
  const { done, total } = issueProgress(issues);
  const remaining = total - done;

  return (
    <li
      className={cn(
        "relative flex flex-col gap-3 rounded-lg border bg-card p-4 text-card-foreground hover:bg-muted/40",
        status === "active" && "border-indigo-500/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          {/* 카드 전체를 덮는 링크. 메뉴 버튼은 z-10으로 그 위에 둔다. */}
          <Link
            href={href}
            className="truncate font-medium outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/50"
          >
            {cycle.name}
          </Link>
          <span className="text-xs text-muted-foreground">
            {formatCycleRange(cycle)}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`${cycle.name} 메뉴`}
                className="relative z-10 -mt-1 -mr-2"
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto min-w-32">
            <DropdownMenuItem onClick={onEdit}>
              <PencilIcon />
              수정
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <CycleProgressBar done={done} total={total} />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span suppressHydrationWarning>{cycleTiming(cycle, today)}</span>
        <span>
          {issues.length === 0
            ? "이슈 없음"
            : status === "completed" && remaining > 0
              ? `미완료 ${remaining}개`
              : `이슈 ${issues.length}개`}
        </span>
      </div>
    </li>
  );
}

function DeleteCycleDialog({
  workspaceId,
  projectId,
  cycle,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  projectId: string;
  cycle: Cycle | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteCycle = useDeleteCycle(workspaceId, projectId);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {cycle?.name} 사이클을 삭제할까요?
          </AlertDialogTitle>
          <AlertDialogDescription>
            사이클에 배정된 이슈는 삭제되지 않고 사이클 배정만 해제됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (cycle) deleteCycle.mutate(cycle.id);
              onOpenChange(false);
            }}
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
