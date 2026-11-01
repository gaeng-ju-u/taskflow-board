"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { formatIssueRef, subIssueProgress, type Issue } from "@/lib/api/issues";
import type { Member } from "@/lib/api/members";
import type { Project } from "@/lib/api/projects";
import { PENDING_NUMBER, useUpdateIssue } from "@/lib/queries/issues";
import { useHighlighted } from "@/lib/realtime/highlight";

import { CreateIssueDialog } from "./create-issue-dialog";
import { issuePath } from "./issue-list";
import { AssigneeSelect, StatusSelect } from "./property-selects";
import { SubIssueProgress } from "./sub-issue-progress";

// 이슈 상세의 하위 이슈 영역. 바로 아래 하위 이슈만 만든 순서대로 보여준다.
// 추가 버튼은 머리줄에 고정해 둔다. 첫 하위 이슈가 생겨 목록이 나타나도 대화상자가 언마운트되지 않는다.
export function SubIssueList({
  parent,
  subIssues,
  project,
  workspaceSlug,
  members,
}: {
  parent: Issue;
  subIssues: Issue[];
  project: Pick<Project, "id" | "workspace_id" | "name" | "key">;
  workspaceSlug: string;
  members: Member[];
}) {
  const { done, total } = subIssueProgress(subIssues);
  const sorted = subIssues.toSorted((a, b) => {
    // 낙관적으로 추가된 이슈(번호 없음)는 맨 아래
    if (a.number === PENDING_NUMBER) return 1;
    if (b.number === PENDING_NUMBER) return -1;
    return a.number - b.number;
  });

  const empty = subIssues.length === 0;

  // 비어 있으면 제목 없이 흐린 추가 버튼만 보여준다 (대부분의 이슈는 하위 이슈가 없다).
  // 제목은 화면에서만 숨겨 영역 이름(aria-labelledby)으로 남긴다. 요소의 자리는 바꾸지 않아,
  // 첫 하위 이슈가 생겨 머리줄 모양이 바뀌어도 생성 대화상자가 언마운트되지 않는다.
  return (
    <section aria-labelledby="sub-issues-heading" className="flex flex-col">
      <div className="flex h-9 items-center gap-2">
        <h2
          id="sub-issues-heading"
          className={cn("text-sm font-medium", empty && "sr-only")}
        >
          하위 이슈
        </h2>
        {!empty && <SubIssueProgress done={done} total={total} />}
        <CreateIssueDialog
          project={project}
          members={members}
          parent={{
            id: parent.id,
            ref: formatIssueRef(project.key, parent.number),
          }}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className={empty ? "-ml-2.5 text-muted-foreground" : "ml-auto"}
            >
              <PlusIcon />
              하위 이슈 추가
            </Button>
          }
        />
      </div>
      {!empty && (
        <ul className="rounded-md border">
          {sorted.map((issue) => (
            <SubIssueRow
              key={issue.id}
              issue={issue}
              projectKey={project.key}
              workspaceSlug={workspaceSlug}
              members={members}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SubIssueRow({
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
  const updateIssue = useUpdateIssue(issue.workspace_id);
  // 낙관적으로 추가된 이슈는 번호가 없어 아직 상세 화면으로 갈 수 없다.
  const pending = issue.number === PENDING_NUMBER;
  const ref = formatIssueRef(projectKey, issue.number);
  // 다른 사람이 방금 바꾼 이슈는 잠깐 강조한다 (Realtime).
  const highlighted = useHighlighted(issue.id);

  return (
    <li
      className={cn(
        "flex h-10 items-center gap-1 border-b px-2 last:border-b-0",
        highlighted && "animate-highlight",
      )}
    >
      <StatusSelect
        compact
        value={issue.status}
        onChange={(status) => updateIssue.mutate({ issue, patch: { status } })}
      />
      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
        {pending ? `${projectKey}-…` : ref}
      </span>
      {pending ? (
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {issue.title}
        </span>
      ) : (
        <Link
          href={issuePath(workspaceSlug, ref)}
          className="min-w-0 flex-1 truncate text-sm hover:underline"
        >
          {issue.title}
        </Link>
      )}
      <AssigneeSelect
        compact
        value={issue.assignee_id}
        members={members}
        onChange={(assignee_id) =>
          updateIssue.mutate({ issue, patch: { assignee_id } })
        }
      />
    </li>
  );
}
