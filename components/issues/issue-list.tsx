"use client";

import { PlusIcon, TagIcon, UserRoundIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "cn";

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
  CLEARED_FILTERS,
  filterIssues,
  sortIssues,
  type GroupKey,
} from "@/lib/issue-filters";
import {
  PENDING_NUMBER,
  useIssues,
  useUpdateIssue,
} from "@/lib/queries/issues";
import { useLabels } from "@/lib/queries/labels";
import { useMembers } from "@/lib/queries/members";

import { CreateIssueDialog } from "./create-issue-dialog";
import { IssueFilterBar } from "./issue-filter-bar";
import {
  PRIORITY_META,
  PRIORITY_ORDER,
  STATUS_META,
  STATUS_ORDER,
} from "./issue-meta";
import {
  AssigneeSelect,
  MemberAvatar,
  PrioritySelect,
  StatusSelect,
} from "./property-selects";
import { useIssueFilters } from "./use-issue-filters";

export function issuePath(workspaceSlug: string, ref: string) {
  return `/${workspaceSlug}/issue/${ref}`;
}

export function IssueList({
  workspaceSlug,
  project,
  currentUserId,
  initialIssues,
  initialMembers,
  initialLabels,
}: {
  workspaceSlug: string;
  project: Project;
  currentUserId: string;
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
  const { filters, setFilters } = useIssueFilters();

  const visible = sortIssues(
    filterIssues(issues, filters, {
      currentUserId,
      labelIds: new Set(labels.map((label) => label.id)),
    }),
    filters.sort,
  );
  const groups = buildGroups(visible, filters.group, { members, labels });

  return (
    <div className="flex flex-1 flex-col">
      {/* 생성 대화상자는 이슈가 0개일 때와 있을 때 같은 자리에 둔다 (언마운트 방지, CLAUDE.md 참고). */}
      <IssueFilterBar
        filters={filters}
        setFilters={setFilters}
        members={members}
        labels={labels}
        currentUserId={currentUserId}
        showDisplayOptions
        summary={
          visible.length === issues.length
            ? `이슈 ${issues.length}개`
            : `이슈 ${visible.length} / ${issues.length}개`
        }
        actions={
          <CreateIssueDialog
            project={project}
            members={members}
            trigger={
              <Button size="sm">
                <PlusIcon />새 이슈
              </Button>
            }
          />
        }
      />

      {issues.length === 0 ? (
        <div className="mx-6 flex flex-col items-center gap-1 rounded-lg border border-dashed py-16 text-center">
          <p className="font-medium">아직 이슈가 없습니다</p>
          <p className="text-sm text-muted-foreground">
            새 이슈를 만들어 할 일을 기록해 보세요.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <NoMatches onReset={() => setFilters(CLEARED_FILTERS)} />
      ) : (
        <div className="border-t">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.title}>
              {group.header && (
                <h2 className="flex items-center gap-2 border-b bg-muted/40 px-6 py-2 text-sm font-medium">
                  {group.header}
                  <span className="text-muted-foreground">
                    {group.issues.length}
                  </span>
                </h2>
              )}
              <ul>
                {group.issues.map((issue) => (
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
          ))}
        </div>
      )}
    </div>
  );
}

export function NoMatches({ onReset }: { onReset: () => void }) {
  return (
    <div className="mx-6 flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
      <p className="font-medium">조건에 맞는 이슈가 없습니다</p>
      <Button variant="outline" size="sm" onClick={onReset}>
        필터 초기화
      </Button>
    </div>
  );
}

type Group = {
  key: string;
  title: string;
  // 그룹 없음이면 제목 줄을 그리지 않는다.
  header: ReactNode | null;
  issues: Issue[];
};

// 그룹으로 나눈다. 입력 순서(정렬 결과)를 그룹 안에서도 유지하고, 빈 그룹은 뺀다.
// 라벨 그룹에서는 라벨이 여러 개인 이슈가 각 라벨 그룹에 모두 나타난다.
function buildGroups(
  issues: Issue[],
  group: GroupKey,
  { members, labels }: { members: Member[]; labels: Label[] },
): Group[] {
  const groups: Group[] = (() => {
    switch (group) {
      case "status":
        return STATUS_ORDER.map((status) => {
          const meta = STATUS_META[status];
          return {
            key: status,
            title: meta.label,
            header: (
              <>
                <meta.icon className={cn("size-4", meta.className)} />
                {meta.label}
              </>
            ),
            issues: issues.filter((issue) => issue.status === status),
          };
        });
      case "priority":
        return PRIORITY_ORDER.map((priority) => {
          const meta = PRIORITY_META[priority];
          return {
            key: priority,
            title: meta.label,
            header: (
              <>
                <meta.icon className={cn("size-4", meta.className)} />
                {meta.label}
              </>
            ),
            issues: issues.filter((issue) => issue.priority === priority),
          };
        });
      case "assignee": {
        const memberIds = new Set(members.map((member) => member.id));
        return [
          ...members.map((member) => ({
            key: member.id,
            title: member.name,
            header: (
              <>
                <MemberAvatar member={member} />
                {member.name}
              </>
            ),
            issues: issues.filter((issue) => issue.assignee_id === member.id),
          })),
          {
            key: "none",
            title: "담당자 없음",
            header: (
              <>
                <UserRoundIcon className="size-4 text-muted-foreground" />
                담당자 없음
              </>
            ),
            // 멤버 목록에 없는 담당자(목록을 아직 다시 불러오지 않은 경우)도 여기에 둔다.
            issues: issues.filter(
              (issue) =>
                !issue.assignee_id || !memberIds.has(issue.assignee_id),
            ),
          },
        ];
      }
      case "label": {
        const labelIds = new Set(labels.map((label) => label.id));
        return [
          ...labels.map((label) => ({
            key: label.id,
            title: label.name,
            header: (
              <>
                <LabelDot color={label.color} />
                {label.name}
              </>
            ),
            issues: issues.filter((issue) =>
              issue.issue_labels.some((item) => item.label_id === label.id),
            ),
          })),
          {
            key: "none",
            title: "라벨 없음",
            header: (
              <>
                <TagIcon className="size-4 text-muted-foreground" />
                라벨 없음
              </>
            ),
            issues: issues.filter(
              (issue) =>
                !issue.issue_labels.some((item) => labelIds.has(item.label_id)),
            ),
          },
        ];
      }
      case "none":
        return [{ key: "all", title: "이슈", header: null, issues }];
    }
  })();
  return groups.filter((item) => item.issues.length > 0);
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
