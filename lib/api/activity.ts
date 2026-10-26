import type { Tables } from "@/lib/supabase/database.types";

import type { Supabase } from "./projects";

export type Comment = Pick<
  Tables<"comments">,
  | "id"
  | "issue_id"
  | "workspace_id"
  | "author_id"
  | "body"
  | "created_at"
  | "updated_at"
>;

export const COMMENT_COLUMNS =
  "id, issue_id, workspace_id, author_id, body, created_at, updated_at";

export async function listComments(supabase: Supabase, issueId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select(COMMENT_COLUMNS)
    .eq("issue_id", issueId)
    .order("created_at");
  if (error) throw error;
  return data;
}

// DB 트리거(log_issue_activity, log_issue_label_activity)가 기록한다. 사용자는 읽기만 한다.
export type Activity = Pick<
  Tables<"activities">,
  "id" | "issue_id" | "actor_id" | "type" | "payload" | "created_at"
>;

export const ACTIVITY_COLUMNS =
  "id, issue_id, actor_id, type, payload, created_at";

export async function listActivities(supabase: Supabase, issueId: string) {
  const { data, error } = await supabase
    .from("activities")
    .select(ACTIVITY_COLUMNS)
    .eq("issue_id", issueId)
    .order("created_at")
    .order("id");
  if (error) throw error;
  return data;
}
