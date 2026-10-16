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

export type Member = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

// 담당자 선택과 아바타 표시용. profiles는 같은 워크스페이스 멤버끼리만 보이도록 RLS가 걸려 있다.
export async function listMembers(supabase: Supabase, workspaceId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("profiles(id, name, avatar_url)")
    .eq("workspace_id", workspaceId)
    .order("created_at");
  if (error) throw error;
  return data
    .flatMap((row) => (row.profiles ? [row.profiles] : []))
    .map((profile): Member => ({
      id: profile.id,
      name: profile.name,
      avatarUrl: profile.avatar_url,
    }));
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
