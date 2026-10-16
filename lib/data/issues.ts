import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import {
  ISSUE_COLUMNS,
  listIssues,
  listMembers,
  parseIssueRef,
} from "@/lib/api/issues";
import { createClient } from "@/lib/supabase/server";

export const getIssues = cache(async (projectId: string) =>
  listIssues(await createClient(), projectId),
);

export const getMembers = cache(async (workspaceId: string) =>
  listMembers(await createClient(), workspaceId),
);

// "TF-12" → 해당 워크스페이스의 TF 프로젝트에서 12번 이슈. 없거나 권한이 없으면 404.
export const getIssueByRef = cache(async (workspaceId: string, ref: string) => {
  const parsed = parseIssueRef(ref);
  if (!parsed) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select(`${ISSUE_COLUMNS}, projects!inner(id, key, name)`)
    .eq("workspace_id", workspaceId)
    .eq("projects.key", parsed.key)
    .eq("number", parsed.number)
    .maybeSingle();

  if (!data) notFound();
  const { projects: project, ...issue } = data;
  return { issue, project };
});
