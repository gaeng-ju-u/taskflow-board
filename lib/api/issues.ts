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
  | "sort_order"
  | "created_at"
  | "updated_at"
>;

export type IssueStatus = Issue["status"];
export type IssuePriority = Issue["priority"];

export const ISSUE_COLUMNS =
  "id, workspace_id, project_id, number, title, description, status, priority, assignee_id, sort_order, created_at, updated_at";

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

// 두 카드 사이에 들어갈 순서값. 옮긴 카드 하나만 수정하면 되도록 앞뒤 값의 중간을 쓴다.
// 같은 자리에 수십 번 넣으면 실수 정밀도가 부족해질 수 있지만, 이 앱의 사용량에서는 문제되지 않는다.
export function sortOrderBetween(before?: number, after?: number) {
  if (before === undefined) return after === undefined ? 0 : after - 1;
  if (after === undefined) return before + 1;
  return (before + after) / 2;
}
