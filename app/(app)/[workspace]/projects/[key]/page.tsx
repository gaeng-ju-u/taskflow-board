import { Suspense } from "react";

import { ProjectTitle } from "@/components/projects/project-title";
import { getProjectByKey } from "@/lib/data/projects";
import { getWorkspaceBySlug } from "@/lib/data/workspaces";

export default function ProjectPage({
  params,
}: PageProps<"/[workspace]/projects/[key]">) {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <Suspense
        fallback={<div className="h-7 w-48 animate-pulse rounded bg-muted" />}
      >
        <ProjectHeader params={params} />
      </Suspense>
      {/* 이슈 목록은 다음 PR(이슈 CRUD)에서 채운다. */}
      <p className="text-sm text-muted-foreground">아직 이슈가 없습니다.</p>
    </main>
  );
}

async function ProjectHeader({
  params,
}: {
  params: PageProps<"/[workspace]/projects/[key]">["params"];
}) {
  const { workspace: slug, key } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const project = await getProjectByKey(workspace.id, key);
  return <ProjectTitle project={project} />;
}
