import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Tables } from "@/lib/supabase/database.types";

// 서버(lib/data)와 클라이언트(lib/queries)가 함께 쓰는 조회 함수. 어느 Supabase 클라이언트든 받는다.
export type Supabase = SupabaseClient<Database>;

export type Project = Pick<
  Tables<"projects">,
  "id" | "workspace_id" | "name" | "key" | "created_at"
>;

export const PROJECT_COLUMNS = "id, workspace_id, name, key, created_at";

export async function listProjects(supabase: Supabase, workspaceId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("workspace_id", workspaceId)
    .order("created_at");
  if (error) throw error;
  return data;
}
