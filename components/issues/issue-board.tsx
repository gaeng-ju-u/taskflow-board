"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  formatIssueRef,
  sortOrderBetween,
  type Issue,
  type IssueStatus,
  type Member,
} from "@/lib/api/issues";
import type { Project } from "@/lib/api/projects";
import {
  PENDING_NUMBER,
  useIssues,
  useMembers,
  useUpdateIssue,
} from "@/lib/queries/issues";

import { CreateIssueDialog } from "./create-issue-dialog";
import { issuePath } from "./issue-list";
import { PRIORITY_META, STATUS_META } from "./issue-meta";
import { MemberAvatar } from "./property-selects";

// 보드의 칸 순서. 왼쪽에서 오른쪽으로 일이 진행되는 방향이다.
const BOARD_STATUSES: IssueStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "done",
  "canceled",
];

type Columns = Record<IssueStatus, string[]>;

function groupIssues(issues: Issue[]): Columns {
  const columns = Object.fromEntries(
    BOARD_STATUSES.map((status) => [status, [] as string[]]),
  ) as Columns;
  [...issues]
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach((issue) => columns[issue.status].push(issue.id));
  return columns;
}

function isStatus(id: UniqueIdentifier): id is IssueStatus {
  return (BOARD_STATUSES as UniqueIdentifier[]).includes(id);
}

function findColumn(columns: Columns, id: UniqueIdentifier) {
  if (isStatus(id)) return id;
  return BOARD_STATUSES.find((status) => columns[status].includes(String(id)));
}

// 키보드 이동. 기본 함수(sortableKeyboardCoordinates)는 ←/→에서 카드가 들어 있는 칸 자체를 "오른쪽의
// 놓을 곳"으로 잡아 같은 칸에 머문다. ←/→는 이웃 칸의 맨 위로 직접 옮기고, ↑/↓만 기본 동작(칸 안 순서)을 쓴다.
const boardKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  if (event.code === "ArrowRight" || event.code === "ArrowLeft") {
    event.preventDefault();
    const { active, droppableRects } = args.context;
    // 카드가 지금 들어 있는 칸. SortableContext의 id를 상태값으로 붙여 두었다.
    const current = active?.data.current?.sortable?.containerId;
    if (!current || !isStatus(current)) return undefined;
    const next =
      BOARD_STATUSES[
        BOARD_STATUSES.indexOf(current) + (event.code === "ArrowRight" ? 1 : -1)
      ];
    const rect = next && droppableRects.get(next);
    return rect ? { x: rect.left + 8, y: rect.top + 8 } : undefined;
  }
  return sortableKeyboardCoordinates(event, args);
};

export function IssueBoard({
  workspaceSlug,
  project,
  initialIssues,
  initialMembers,
}: {
  workspaceSlug: string;
  project: Project;
  initialIssues: Issue[];
  initialMembers: Member[];
}) {
  const { data: issues = initialIssues } = useIssues(
    project.workspace_id,
    project.id,
    initialIssues,
  );
  const { data: members = initialMembers } = useMembers(
    project.workspace_id,
    initialMembers,
  );
  const updateIssue = useUpdateIssue(project.workspace_id);

  const byId = useMemo(
    () => new Map(issues.map((issue) => [issue.id, issue])),
    [issues],
  );
  const cached = useMemo(() => groupIssues(issues), [issues]);
  // 드래그 중과 놓은 뒤 저장이 끝날 때까지는 이 배치를 보여준다. 놓자마자 지우면 캐시에 반영되기 전
  // 한 프레임 동안 카드가 원래 자리로 튀었다가 돌아온다 (그 자리 편집 필드와 같은 이유).
  const [draft, setDraft] = useState<Columns | null>(null);
  const columns = draft ?? cached;
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    // 5px 이상 움직여야 드래그가 시작된다. 그냥 클릭하면 카드의 링크가 동작한다.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    // 키보드: 스페이스바로 집고 놓는다. Enter는 카드를 여는 데 쓰므로 집기에서 뺀다 (놓기는 Enter도 가능).
    useSensor(KeyboardSensor, {
      coordinateGetter: boardKeyboardCoordinates,
      keyboardCodes: {
        start: ["Space"],
        cancel: ["Escape"],
        end: ["Space", "Enter"],
      },
    }),
  );

  const refOf = (id: UniqueIdentifier) => {
    const issue = byId.get(String(id));
    return issue ? formatIssueRef(project.key, issue.number) : "카드";
  };
  const columnLabel = (id: UniqueIdentifier | undefined) =>
    id === undefined
      ? ""
      : STATUS_META[findColumn(columns, id) ?? "todo"].label;

  const announcements: Announcements = {
    onDragStart: ({ active }) => `${refOf(active.id)} 카드를 집었습니다.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${refOf(active.id)} 카드가 ${columnLabel(over.id)} 칸 위에 있습니다.`
        : `${refOf(active.id)} 카드가 칸 밖에 있습니다.`,
    onDragEnd: ({ active, over }) =>
      over
        ? `${refOf(active.id)} 카드를 ${columnLabel(over.id)} 칸에 놓았습니다.`
        : `${refOf(active.id)} 카드를 놓지 않았습니다.`,
    onDragCancel: ({ active }) =>
      `이동을 취소했습니다. ${refOf(active.id)} 카드는 원래 자리에 있습니다.`,
  };

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(String(active.id));
    setDraft(columns);
  }

  // 다른 칸 위로 가면 그 칸으로 옮긴다. 같은 칸 안의 순서는 놓을 때 정한다.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return;
    setDraft((current) => {
      if (!current) return current;
      const from = findColumn(current, active.id);
      const to = findColumn(current, over.id);
      if (!from || !to || from === to) return current;
      const target = current[to];
      const overIndex = target.indexOf(String(over.id));
      const index = overIndex === -1 ? target.length : overIndex;
      return {
        ...current,
        [from]: current[from].filter((id) => id !== active.id),
        [to]: [
          ...target.slice(0, index),
          String(active.id),
          ...target.slice(index),
        ],
      };
    });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    const issue = byId.get(String(active.id));
    if (!over || !draft || !issue) {
      setDraft(null);
      return;
    }

    const status = findColumn(draft, active.id);
    if (!status) {
      setDraft(null);
      return;
    }
    let ids = draft[status];
    const overIndex = ids.indexOf(String(over.id));
    if (overIndex !== -1) {
      ids = arrayMove(ids, ids.indexOf(issue.id), overIndex);
    }
    const final = { ...draft, [status]: ids };

    const index = ids.indexOf(issue.id);
    const before = byId.get(ids[index - 1])?.sort_order;
    const after = byId.get(ids[index + 1])?.sort_order;
    const unchanged =
      status === issue.status && cached[status].indexOf(issue.id) === index;
    if (unchanged) {
      setDraft(null);
      return;
    }

    setDraft(final);
    updateIssue.mutate(
      { issue, patch: { status, sort_order: sortOrderBetween(before, after) } },
      // 저장이 끝나면(실패해서 롤백된 경우 포함) 캐시 값을 보여준다.
      { onSettled: () => setDraft(null) },
    );
  }

  const activeIssue = activeId ? byId.get(activeId) : undefined;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between px-6 pb-3">
        <span className="text-sm text-muted-foreground">
          이슈 {issues.length}개
        </span>
        <CreateIssueDialog
          project={project}
          members={members}
          trigger={
            <Button size="sm">
              <PlusIcon />새 이슈
            </Button>
          }
        />
      </div>

      {/* id를 고정해야 서버와 클라이언트의 접근성 속성 id가 같아져 hydration 경고가 나지 않는다. */}
      <DndContext
        id="issue-board"
        sensors={sensors}
        collisionDetection={closestCorners}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Enter를 누르면 이슈를 엽니다. 카드를 옮기려면 스페이스바로 집고, 방향키로 옮긴 뒤 다시 스페이스바로 놓습니다. Esc를 누르면 취소합니다.",
          },
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setDraft(null);
        }}
      >
        <div className="flex flex-1 gap-3 overflow-x-auto px-6 pb-6">
          {BOARD_STATUSES.map((status) => (
            <BoardColumn
              key={status}
              status={status}
              count={columns[status].length}
            >
              <SortableContext
                id={status}
                items={columns[status]}
                strategy={verticalListSortingStrategy}
              >
                {columns[status].map((id) => {
                  const issue = byId.get(id);
                  if (!issue) return null;
                  return (
                    <SortableCard
                      key={id}
                      issue={issue}
                      projectKey={project.key}
                      workspaceSlug={workspaceSlug}
                      members={members}
                    />
                  );
                })}
              </SortableContext>
            </BoardColumn>
          ))}
        </div>

        <DragOverlay>
          {activeIssue && (
            <IssueCard
              issue={activeIssue}
              projectKey={project.key}
              members={members}
              className="rotate-2 shadow-lg"
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function BoardColumn({
  status,
  count,
  children,
}: {
  status: IssueStatus;
  count: number;
  children: React.ReactNode;
}) {
  // 빈 칸에도 카드를 놓을 수 있도록 칸 자체를 놓는 곳으로 등록한다.
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const meta = STATUS_META[status];

  return (
    <section
      aria-label={meta.label}
      className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/40"
    >
      <h2 className="flex items-center gap-2 px-3 py-2 text-sm font-medium">
        <meta.icon className={cn("size-4", meta.className)} />
        {meta.label}
        <span className="text-muted-foreground">{count}</span>
      </h2>
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-24 flex-1 flex-col gap-2 rounded-b-lg p-2 transition-colors",
          isOver && "bg-muted",
        )}
      >
        {children}
      </div>
    </section>
  );
}

function SortableCard({
  issue,
  projectKey,
  workspaceSlug,
  members,
}: {
  issue: Issue;
  projectKey: string;
  workspaceSlug: string;
  members: Member[];
}) {
  // 낙관적으로 추가돼 아직 저장되지 않은 이슈는 옮길 수 없다.
  const router = useRouter();
  const pending = issue.number === PENDING_NUMBER;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: issue.id, disabled: pending });
  const href = pending
    ? undefined
    : issuePath(workspaceSlug, formatIssueRef(projectKey, issue.number));

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      onKeyDown={(event) => {
        if (event.key === "Enter" && href && !isDragging) {
          router.push(href);
          return;
        }
        listeners?.onKeyDown?.(event);
      }}
      className={cn(
        "rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        isDragging && "opacity-40",
      )}
    >
      <IssueCard
        issue={issue}
        projectKey={projectKey}
        members={members}
        href={href}
      />
    </div>
  );
}

function IssueCard({
  issue,
  projectKey,
  members,
  href,
  className,
}: {
  issue: Issue;
  projectKey: string;
  members: Member[];
  href?: string;
  className?: string;
}) {
  const priority = PRIORITY_META[issue.priority];
  const assignee = members.find((member) => member.id === issue.assignee_id);
  const pending = issue.number === PENDING_NUMBER;

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-card p-3 text-card-foreground",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-xs text-muted-foreground">
          {pending
            ? `${projectKey}-…`
            : formatIssueRef(projectKey, issue.number)}
        </span>
        {assignee && <MemberAvatar member={assignee} />}
      </div>
      {href ? (
        // 카드 전체가 드래그 손잡이라 링크는 키보드 포커스에서 뺀다. 키보드로는 카드에서 Enter로 연다.
        <Link
          href={href}
          tabIndex={-1}
          className="line-clamp-2 text-sm hover:underline"
          draggable={false}
        >
          {issue.title}
        </Link>
      ) : (
        <span className="line-clamp-2 text-sm text-muted-foreground">
          {issue.title}
        </span>
      )}
      <priority.icon
        aria-label={priority.label}
        className={cn("size-4", priority.className)}
      />
    </div>
  );
}
