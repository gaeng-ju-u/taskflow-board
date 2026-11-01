import type { Tables } from "@/lib/supabase/database.types";

import type { Supabase } from "./projects";

export type Issue = Pick<
  Tables<"issues">,
  | "id"
  | "workspace_id"
  | "project_id"
  | "number"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "assignee_id"
  | "parent_id"
  | "sort_order"
  | "created_at"
  | "updated_at"
> & {
  // 붙은 라벨. 이슈와 함께 조회해 목록·보드·상세가 같은 캐시로 갱신된다.
  issue_labels: { label_id: string }[];
};

export type IssueStatus = Issue["status"];
export type IssuePriority = Issue["priority"];

export const ISSUE_COLUMNS =
  "id, workspace_id, project_id, number, title, description, status, priority, assignee_id, parent_id, sort_order, created_at, updated_at, issue_labels(label_id)";

export async function listIssues(supabase: Supabase, projectId: string) {
  const { data, error } = await supabase
    .from("issues")
    .select(ISSUE_COLUMNS)
    .eq("project_id", projectId)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// "TF-12" 형식의 이슈 식별자. URL에서 이슈를 찾을 때 쓴다.
export function parseIssueRef(ref: string) {
  const match = /^([A-Za-z][A-Za-z0-9]{1,4})-(\d+)$/.exec(ref);
  if (!match) return null;
  return { key: match[1].toUpperCase(), number: Number(match[2]) };
}

export function formatIssueRef(projectKey: string, number: number) {
  return `${projectKey}-${number}`;
}

// 하위 이슈는 따로 조회하지 않고 프로젝트 이슈 목록에서 찾는다.
// 목록은 Realtime과 낙관적 업데이트로 이미 최신이라, 진행률도 함께 최신으로 유지된다.
export function childIssues(issues: Issue[], parentId: string) {
  return issues.filter((issue) => issue.parent_id === parentId);
}

// 상위 이슈 id → 하위 이슈들. 목록·보드에서 행마다 전체를 훑지 않도록 한 번에 묶는다.
// 필터 전의 전체 목록으로 만들어, 필터로 가려진 하위 이슈도 진행률에 들어간다.
export function groupByParent(issues: Issue[]) {
  const groups = new Map<string, Issue[]>();
  for (const issue of issues) {
    if (!issue.parent_id) continue;
    const group = groups.get(issue.parent_id);
    if (group) group.push(issue);
    else groups.set(issue.parent_id, [issue]);
  }
  return groups;
}

// 진행률: 완료 / (전체 - 취소). 취소한 일은 진행률을 깎지 않도록 분모에서 뺀다.
export function subIssueProgress(children: Issue[]) {
  const total = children.filter((issue) => issue.status !== "canceled").length;
  const done = children.filter((issue) => issue.status === "done").length;
  return { done, total };
}

// 자기 자신과 모든 하위 이슈의 id. 상위 이슈 후보에서 뺀다 (고르면 순환이 되어 DB가 거부한다).
export function selfAndDescendantIds(issues: Issue[], issueId: string) {
  const ids = new Set([issueId]);
  // 이미 모은 id의 자식을 더 이상 늘지 않을 때까지 모은다. 순환 데이터가 있어도 Set이라 끝난다.
  let size = 0;
  while (size !== ids.size) {
    size = ids.size;
    for (const issue of issues) {
      if (issue.parent_id && ids.has(issue.parent_id)) ids.add(issue.id);
    }
  }
  return ids;
}

// 두 카드 사이에 들어갈 순서값. 옮긴 카드 하나만 수정하면 되도록 앞뒤 값의 중간을 쓴다.
// 같은 자리에 수십 번 넣으면 실수 정밀도가 부족해질 수 있지만, 이 앱의 사용량에서는 문제되지 않는다.
export function sortOrderBetween(before?: number, after?: number) {
  if (before === undefined) return after === undefined ? 0 : after - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}
