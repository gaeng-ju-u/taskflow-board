"use client";

import type { Project } from "@/lib/api/projects";
import { useProjects } from "@/lib/queries/projects";

// 서버가 렌더한 이름 대신 캐시를 보므로, 사이드바에서 이름을 바꾸면 제목도 즉시 바뀐다.
export function ProjectTitle({ project }: { project: Project }) {
  const { data: projects } = useProjects(project.workspace_id);
  const name = projects?.find((p) => p.id === project.id)?.name ?? project.name;

  return (
    <h1 className="flex items-center gap-2 text-lg font-semibold">
      <span className="rounded bg-muted px-1.5 font-mono text-xs text-muted-foreground">
        {project.key}
      </span>
      {name}
    </h1>
  );
}
