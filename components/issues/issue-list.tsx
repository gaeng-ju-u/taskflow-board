"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { IssueLabelPicker } from "@/components/labels/issue-label-picker";
import {
  issueLabels,
  LabelChips,
  LabelDot,
} from "@/components/labels/label-chip";
import { Button } from "@/components/ui/button";
import { formatIssueRef, type Issue } from "@/lib/api/issues";
import type { Label } from "@/lib/api/labels";
import type { Member } from "@/lib/api/members";
import type { Project } from "@/lib/api/projects";
import {
  PENDING_NUMBER,
  useIssues,
  useUpdateIssue,
} from "@/lib/queries/issues";
import { useLabels } from "@/lib/queries/labels";
import { useMembers } from "@/lib/queries/members";

import { CreateIssueDialog } from "./create-issue-dialog";
import { STATUS_META, STATUS_ORDER } from "./issue-meta";
import {
  AssigneeSelect,
  PrioritySelect,
  StatusSelect,
} from "./property-selects";

export function issuePath(workspaceSlug: string, ref: string) {
  return `/${workspaceSlug}/issue/${ref}`;
}

export function IssueList({
  workspaceSlug,
  project,
  initialIssues,
  initialMembers,
  initialLabels,
}: {
  workspaceSlug: string;
  project: Project;
  initialIssues: Issue[];
  initialMembers: Member[];
  initialLabels: Label[];
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
  const { data: labels = initialLabels } = useLabels(
    project.workspace_id,
    initialLabels,
  );

  const groups = STATUS_ORDER.map((status) => ({
    status,
    issues: issues.filter((issue) => issue.status === status),
  })).filter((group) => group.issues.length > 0);

  return (
    <div className="flex flex-1 flex-col">
      {/* 생성 대화상자는 이슈가 0개일 때와 있을 때 같은 자리에 둔다 (언마운트 방지, CLAUDE.md 참고). */}
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

      {groups.length === 0 ? (
        <div className="mx-6 flex flex-col items-center gap-1 rounded-lg border border-dashed py-16 text-center">
          <p className="font-medium">아직 이슈가 없습니다</p>
          <p className="text-sm text-muted-foreground">
            새 이슈를 만들어 할 일을 기록해 보세요.
          </p>
        </div>
      ) : (
        <div className="border-t">
          {groups.map(({ status, issues: groupIssues }) => {
            const meta = STATUS_META[status];
            return (
              <section key={status} aria-label={meta.label}>
                <h2 className="flex items-center gap-2 border-b bg-muted/40 px-6 py-2 text-sm font-medium">
                  <meta.icon className={`size-4 ${meta.className}`} />
                  {meta.label}
                  <span className="text-muted-foreground">
                    {groupIssues.length}
                  </span>
                </h2>
                <ul>
                  {groupIssues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      projectKey={project.key}
                      workspaceSlug={workspaceSlug}
                      members={members}
                      labels={labels}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  projectKey,
  workspaceSlug,
  members,
  labels,
}: {
  issue: Issue;
  projectKey: string;
  workspaceSlug: string;
  members: Member[];
  labels: Label[];
}) {
  const updateIssue = useUpdateIssue(issue.workspace_id);
  // 낙관적으로 추가된 이슈는 번호가 없어 아직 상세 화면으로 갈 수 없다.
  const pending = issue.number === PENDING_NUMBER;
  const ref = formatIssueRef(projectKey, issue.number);
  const attached = issueLabels(issue.issue_labels, labels);

  return (
    <li className="group flex h-11 items-center gap-1 border-b px-4 hover:bg-muted/40">
      <PrioritySelect
        compact
        value={issue.priority}
        onChange={(priority) =>
          updateIssue.mutate({ issue, patch: { priority } })
        }
      />
      <span className="w-16 shrink-0 font-mono text-xs text-muted-foreground">
        {pending ? `${projectKey}-…` : ref}
      </span>
      <StatusSelect
        compact
        value={issue.status}
        onChange={(status) => updateIssue.mutate({ issue, patch: { status } })}
      />
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
      <LabelChips
        labels={attached}
        max={2}
        className="hidden shrink-0 flex-nowrap sm:flex"
      />
      {/* 좁은 화면에서는 칩 대신 색 점만 보여준다. */}
      {attached.length > 0 && (
        <span
          className="flex shrink-0 gap-0.5 sm:hidden"
          title={attached.map((label) => label.name).join(", ")}
        >
          {attached.map((label) => (
            <LabelDot key={label.id} color={label.color} />
          ))}
        </span>
      )}
      {!pending && (
        <IssueLabelPicker
          compact
          issue={issue}
          labels={labels}
          // 라벨이 없는 행은 마우스를 올리거나 포커스할 때만 버튼을 보여준다 (터치 화면에서는 항상 보임).
          className={
            attached.length === 0
              ? "sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100 sm:data-popup-open:opacity-100"
              : undefined
          }
        />
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
