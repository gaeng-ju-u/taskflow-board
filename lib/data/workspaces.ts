import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

// RLS 때문에 멤버가 아니면 존재하는 워크스페이스도 조회되지 않는다. 둘 다 404로 처리한다.
export const getWorkspaceBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name, slug")
    .eq("slug", slug)
    .maybeSingle();

  if (!workspace) notFound();
  return workspace;
});
