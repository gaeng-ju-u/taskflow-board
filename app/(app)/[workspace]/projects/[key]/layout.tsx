import { Suspense } from "react";

import { ProjectTabs } from "@/components/projects/project-tabs";
import { ProjectTitle } from "@/components/projects/project-title";
import { projectPath } from "@/components/projects/types";
import { loadProject } from "@/lib/data/project-page";

// 목록과 보드가 공유하는 프로젝트 제목과 탭. 탭을 바꿔도 이 부분은 다시 그리지 않는다.
export default function ProjectLayout({
  children,
  params,
}: LayoutProps<"/[workspace]/projects/[key]">) {
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6">
        <Suspense
          fallback={<div className="h-8 w-64 animate-pulse rounded bg-muted" />}
        >
          <ProjectHeader params={params} />
        </Suspense>
      </div>
      {children}
    </main>
  );
}

async function ProjectHeader({
  params,
}: {
  params: LayoutProps<"/[workspace]/projects/[key]">["params"];
}) {
  const { workspace, project } = await loadProject(params);
  return (
    <>
      <ProjectTitle project={project} />
      <ProjectTabs basePath={projectPath(workspace.slug, project.key)} />
    </>
  );
}
