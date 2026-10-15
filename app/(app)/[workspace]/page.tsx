import { Suspense } from "react";

import { ProjectList } from "@/components/projects/project-list";
import { getProjects } from "@/lib/data/projects";
import { getWorkspaceBySlug } from "@/lib/data/workspaces";

export default function WorkspacePage({ params }: PageProps<"/[workspace]">) {
  return (
    <main className="flex flex-1 flex-col p-6">
      <Suspense
        fallback={
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        }
      >
        <WorkspaceProjects params={params} />
      </Suspense>
    </main>
  );
}

async function WorkspaceProjects({
  params,
}: {
  params: PageProps<"/[workspace]">["params"];
}) {
  const { workspace: slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const projects = await getProjects(workspace.id);
  return <ProjectList workspace={workspace} initialProjects={projects} />;
}
