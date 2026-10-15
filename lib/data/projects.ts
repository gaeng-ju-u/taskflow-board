import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";

import { listProjects, PROJECT_COLUMNS } from "@/lib/api/projects";
import { createClient } from "@/lib/supabase/server";

export const getProjects = cache(async (workspaceId: string) =>
  listProjects(await createClient(), workspaceId),
);

export const getProjectByKey = cache(
  async (workspaceId: string, key: string) => {
    const supabase = await createClient();
    const { data: project } = await supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .eq("workspace_id", workspaceId)
      .eq("key", key.toUpperCase())
      .maybeSingle();

    if (!project) notFound();
    return project;
  },
);
