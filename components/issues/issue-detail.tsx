"use client";

import { ChevronRightIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";

import { cn } from "cn";

import { IssueLabelPicker } from "@/components/labels/issue-label-picker";
import { projectPath } from "@/components/projects/types";
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
import { Textarea } from "@/components/ui/textarea";
import { formatIssueRef, type Issue } from "@/lib/api/issues";
import type { Label } from "@/lib/api/labels";
import type { Member } from "@/lib/api/members";
import { useDeleteIssue, useIssue, useUpdateIssue } from "@/lib/queries/issues";
import { useLabels } from "@/lib/queries/labels";
import { useMembers } from "@/lib/queries/members";
import {
  issueDescriptionSchema,
  issueTitleSchema,
} from "@/lib/validations/issue";

import {
  AssigneeSelect,
  PrioritySelect,
  StatusSelect,
} from "./property-selects";

type ProjectRef = { id: string; key: string; name: string };

export function IssueDetail({
  workspaceSlug,
  project,
  initialIssue,
  initialMembers,
  initialLabels,
}: {
  workspaceSlug: string;
  project: ProjectRef;
  initialIssue: Issue;
  initialMembers: Member[];
  initialLabels: Label[];
}) {
  const workspaceId = initialIssue.workspace_id;
  const { data: issue } = useIssue(workspaceId, initialIssue.id, initialIssue);
  const { data: members = initialMembers } = useMembers(
    workspaceId,
    initialMembers,
  );
  const { data: labels = initialLabels } = useLabels(
    workspaceId,
    initialLabels,
  );
  const updateIssue = useUpdateIssue(workspaceId);

  if (!issue) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <p className="font-medium">이슈를 찾을 수 없습니다</p>
        <Link
          href={projectPath(workspaceSlug, project.key)}
          className="text-sm text-muted-foreground hover:underline"
        >
          {project.name}(으)로 돌아가기
        </Link>
      </div>
    );
  }

  const ref = formatIssueRef(project.key, issue.number);

  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <nav
          aria-label="위치"
          className="flex items-center gap-1 text-sm text-muted-foreground"
        >
          <Link
            href={projectPath(workspaceSlug, project.key)}
            className="hover:text-foreground"
          >
            {project.name}
          </Link>
          <ChevronRightIcon className="size-4" />
          <span className="font-mono">{ref}</span>
        </nav>

        <EditableTitle
          value={issue.title}
          onSave={(title, done) =>
            updateIssue.mutate({ issue, patch: { title } }, { onSettled: done })
          }
        />
        <EditableDescription
          value={issue.description}
          onSave={(description, done) =>
            updateIssue.mutate(
              { issue, patch: { description } },
              { onSettled: done },
            )
          }
        />
      </div>

      <aside
        aria-label="속성"
        className="flex flex-col gap-1 border-t p-4 lg:w-64 lg:border-t-0 lg:border-l"
      >
        <Property label="상태">
          <StatusSelect
            value={issue.status}
            onChange={(status) =>
              updateIssue.mutate({ issue, patch: { status } })
            }
          />
        </Property>
        <Property label="우선순위">
          <PrioritySelect
            value={issue.priority}
            onChange={(priority) =>
              updateIssue.mutate({ issue, patch: { priority } })
            }
          />
        </Property>
        <Property label="담당자">
          <AssigneeSelect
            value={issue.assignee_id}
            members={members}
            onChange={(assignee_id) =>
              updateIssue.mutate({ issue, patch: { assignee_id } })
            }
          />
        </Property>
        <Property label="라벨" alignTop>
          <IssueLabelPicker issue={issue} labels={labels} />
        </Property>
        <div className="mt-4 border-t pt-4">
          <DeleteIssueButton
            issue={issue}
            issueRef={ref}
            redirectTo={projectPath(workspaceSlug, project.key)}
          />
        </div>
      </aside>
    </div>
  );
}

// alignTop: 내용이 여러 줄로 늘어나는 속성(라벨)은 이름을 첫 줄에 맞춘다.
function Property({
  label,
  alignTop,
  children,
}: {
  label: string;
  alignTop?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn("flex gap-2", alignTop ? "items-start" : "items-center")}
    >
      <span
        className={cn(
          "w-16 shrink-0 text-xs text-muted-foreground",
          alignTop && "pt-1.5",
        )}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

type SaveText = (value: string, done: () => void) => void;

// 제목·설명 편집 상태. 입력값(draft)은 편집 중이거나 저장 요청이 끝나기 전까지만 보여주고,
// 그 외에는 캐시 값을 보여준다. 그래야 저장이 실패해 캐시가 되돌려지면 화면도 함께 되돌아가고
// (오프라인에서는 낙관적 적용과 롤백이 한 번의 렌더 안에 끝나서, 캐시만 보고는 변화를 알 수 없다),
// 저장하는 동안 이전 값이 잠깐 보이는 깜빡임도 생기지 않는다.
function useEditableText(
  value: string,
  schema: z.ZodType<string>,
  onSave: SaveText,
) {
  const [draft, setDraft] = useState<string | null>(null);
  // Esc로 취소한 뒤의 blur에서는 저장하지 않는다.
  const skipNextSave = useRef(false);

  function commit() {
    if (skipNextSave.current) {
      skipNextSave.current = false;
      setDraft(null);
      return;
    }
    if (draft === null) return;
    const parsed = schema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      setDraft(null);
      return;
    }
    if (parsed.data === value) {
      setDraft(null);
      return;
    }
    const saved = draft;
    // 저장이 끝났을 때 그사이 다시 편집을 시작했다면 그 입력값은 지우지 않는다.
    onSave(parsed.data, () =>
      setDraft((current) => (current === saved ? null : current)),
    );
  }

  return {
    inputProps: {
      value: draft ?? value,
      onFocus: () => setDraft((current) => current ?? value),
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => setDraft(event.target.value),
      onBlur: commit,
    },
    cancelNextSave: () => {
      skipNextSave.current = true;
    },
  };
}

function EditableTitle({ value, onSave }: { value: string; onSave: SaveText }) {
  const { inputProps, cancelNextSave } = useEditableText(
    value,
    issueTitleSchema,
    onSave,
  );

  return (
    <input
      aria-label="제목"
      maxLength={200}
      {...inputProps}
      onKeyDown={(e) => {
        // 한글 등 입력기로 글자를 조합하는 중의 Enter·Esc는 조합을 끝내는 키다. 여기서 blur하면
        // 조합 중이던 마지막 글자가 저장 뒤에 한 번 더 입력된다.
        if (e.nativeEvent.isComposing) return;
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          cancelNextSave();
          e.currentTarget.blur();
        }
      }}
      className="w-full rounded-md bg-transparent px-1 text-2xl font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}

function EditableDescription({
  value,
  onSave,
}: {
  value: string;
  onSave: SaveText;
}) {
  const { inputProps } = useEditableText(value, issueDescriptionSchema, onSave);

  return (
    <Textarea
      aria-label="설명"
      maxLength={10000}
      placeholder="설명을 추가하세요"
      rows={8}
      {...inputProps}
      className="resize-y border-transparent shadow-none hover:border-input focus-visible:border-ring"
    />
  );
}

function DeleteIssueButton({
  issue,
  issueRef,
  redirectTo,
}: {
  issue: Issue;
  issueRef: string;
  redirectTo: string;
}) {
  const router = useRouter();
  // 삭제가 성공한 뒤에만 이동한다. 실패하면(오프라인 포함) 이 화면에 머물고 알림만 뜬다.
  const deleteIssue = useDeleteIssue(issue.workspace_id, {
    onDeleted: () => router.push(redirectTo),
  });
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-start text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2Icon />
        이슈 삭제
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{issueRef} 이슈를 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            코멘트와 활동 기록도 함께 삭제되며 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              deleteIssue.mutate(issue);
              setOpen(false);
            }}
          >
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
