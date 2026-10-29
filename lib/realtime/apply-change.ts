"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import type { Comment } from "@/lib/api/activity";
import type { Issue } from "@/lib/api/issues";
import type { Tables } from "@/lib/supabase/database.types";
import { queryKeys } from "@/lib/queries/keys";

import { highlight } from "./highlight";

// Supabase Realtime(Postgres Changes) 이벤트를 TanStack Query 캐시에 반영한다. 다시 불러오지 않고 캐시를 직접 고친다.
//
// 규칙
// - 내 뮤테이션이 진행 중인 항목의 이벤트는 건너뛴다. 화면에는 이미 더 새로운 낙관적 값이 있고,
//   뮤테이션이 끝나면(onSettled) 다시 불러온다. 반영하면 이전 값의 메아리 때문에 화면이 잠깐 튄다.
// - 이슈·코멘트 수정은 캐시의 updated_at보다 새로운 것만 반영한다(순서가 뒤바뀌어 도착한 이벤트 무시).
// - 캐시에 없는 목록은 건드리지 않는다. 그 화면을 열 때 새로 불러온다.
// - 다른 사람이 바꾼 이슈·코멘트는 잠깐 강조한다(highlight). 내가 최근에 바꾼 것은 강조하지 않는다.

export type ChangeContext = {
  queryClient: QueryClient;
  workspaceId: string;
  // 진행 중인 내 뮤테이션이 이 id를 다루고 있는지
  isPending: (id: string) => boolean;
  // 진행 중이거나 최근에 내가 바꾼 id인지 (강조 여부 판단)
  isMine: (id: string) => boolean;
};

type Payload<T extends Record<string, unknown>> =
  RealtimePostgresChangesPayload<T>;

// 라벨·프로젝트 목록은 작아서 캐시를 고치지 않고 다시 불러온다.
export function applyLabelChange(ctx: ChangeContext) {
  return ctx.queryClient.invalidateQueries({
    queryKey: queryKeys.labels(ctx.workspaceId),
  });
}

export function applyProjectChange(ctx: ChangeContext) {
  return ctx.queryClient.invalidateQueries({
    queryKey: queryKeys.projects(ctx.workspaceId),
  });
}

// 이슈 하나를 모든 이슈 목록과 상세 캐시에서 바꾼다.
function updateIssueEverywhere(
  { queryClient, workspaceId }: ChangeContext,
  issueId: string,
  update: (issue: Issue) => Issue,
) {
  queryClient.setQueriesData<Issue[]>(
    { queryKey: queryKeys.issueLists(workspaceId) },
    (issues) =>
      issues?.map((issue) => (issue.id === issueId ? update(issue) : issue)),
  );
  queryClient.setQueryData<Issue | null>(
    queryKeys.issue(workspaceId, issueId),
    (issue) => (issue ? update(issue) : issue),
  );
}

const isNewer = (incoming: string, cached: string) =>
  new Date(incoming).getTime() >= new Date(cached).getTime();

export function applyIssueChange(
  change: Payload<Tables<"issues">>,
  ctx: ChangeContext,
) {
  const { queryClient, workspaceId } = ctx;

  if (change.eventType === "DELETE") {
    const id = change.old.id;
    if (!id) return;
    queryClient.setQueriesData<Issue[]>(
      { queryKey: queryKeys.issueLists(workspaceId) },
      (issues) => issues?.filter((issue) => issue.id !== id),
    );
    // 보고 있던 이슈가 지워지면 상세 화면이 "이슈를 찾을 수 없습니다"를 보여준다.
    queryClient.setQueryData<Issue | null>(
      queryKeys.issue(workspaceId, id),
      (issue) => (issue === undefined ? undefined : null),
    );
    return;
  }

  const row = change.new;
  if (ctx.isPending(row.id)) return;

  // 이벤트의 행에는 붙은 라벨이 없으므로 캐시에 있던 라벨을 유지한다.
  const merge = (issue: Issue): Issue =>
    isNewer(row.updated_at, issue.updated_at)
      ? { ...row, issue_labels: issue.issue_labels }
      : issue;

  queryClient.setQueryData<Issue[]>(
    queryKeys.issueList(workspaceId, row.project_id),
    (issues) => {
      if (!issues) return issues;
      return issues.some((issue) => issue.id === row.id)
        ? issues.map((issue) => (issue.id === row.id ? merge(issue) : issue))
        : [...issues, { ...row, issue_labels: [] }];
    },
  );
  queryClient.setQueryData<Issue | null>(
    queryKeys.issue(workspaceId, row.id),
    (issue) => (issue ? merge(issue) : issue),
  );
  void queryClient.invalidateQueries({
    queryKey: queryKeys.activities(workspaceId, row.id),
  });
  if (!ctx.isMine(row.id)) highlight(row.id);
}

export function applyIssueLabelChange(
  change: Payload<Tables<"issue_labels">>,
  ctx: ChangeContext,
) {
  // 삭제 이벤트에는 기본키(issue_id, label_id)만 온다.
  const link = change.eventType === "DELETE" ? change.old : change.new;
  const { issue_id: issueId, label_id: labelId } = link;
  if (!issueId || !labelId || ctx.isPending(issueId)) return;

  const attach = change.eventType !== "DELETE";
  updateIssueEverywhere(ctx, issueId, (issue) => {
    const has = issue.issue_labels.some((item) => item.label_id === labelId);
    if (attach === has) return issue;
    return {
      ...issue,
      issue_labels: attach
        ? [...issue.issue_labels, { label_id: labelId }]
        : issue.issue_labels.filter((item) => item.label_id !== labelId),
    };
  });
  void ctx.queryClient.invalidateQueries({
    queryKey: queryKeys.activities(ctx.workspaceId, issueId),
  });
  if (!ctx.isMine(issueId)) highlight(issueId);
}

export function applyCommentChange(
  change: Payload<Tables<"comments">>,
  ctx: ChangeContext,
) {
  const { queryClient, workspaceId } = ctx;

  if (change.eventType === "DELETE") {
    const id = change.old.id;
    if (!id) return;
    queryClient.setQueriesData<Comment[]>(
      { queryKey: queryKeys.commentLists(workspaceId) },
      (comments) => comments?.filter((comment) => comment.id !== id),
    );
    return;
  }

  const row = change.new;
  if (ctx.isPending(row.id)) return;

  queryClient.setQueryData<Comment[]>(
    queryKeys.comments(workspaceId, row.issue_id),
    (comments) => {
      if (!comments) return comments;
      const existing = comments.find((comment) => comment.id === row.id);
      if (!existing) {
        return [...comments, row].sort((a, b) =>
          a.created_at.localeCompare(b.created_at),
        );
      }
      return isNewer(row.updated_at, existing.updated_at)
        ? comments.map((comment) => (comment.id === row.id ? row : comment))
        : comments;
    },
  );
  if (!ctx.isMine(row.id)) highlight(row.id);
}
