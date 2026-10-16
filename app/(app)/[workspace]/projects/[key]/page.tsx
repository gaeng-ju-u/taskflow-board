import { Suspense } from "react";

import { IssueList } from "@/components/issues/issue-list";
import { ProjectTitle } from "@/components/projects/project-title";
import { getIssues, getMembers } from "@/lib/data/issues";
import { getProjectByKey } from "@/lib/data/projects";
import { getWorkspaceBySlug } from "@/lib/data/workspaces";

type Params = PageProps<"/[workspace]/projects/[key]">["params"];

export default function ProjectPage({
  params,
}: PageProps<"/[workspace]/projects/[key]">) {
  return (
    <main className="flex flex-1 flex-col gap-4 pt-6">
      <div className="px-6">
        <Suspense
          fallback={<div className="h-7 w-48 animate-pulse rounded bg-muted" />}
        >
          <ProjectHeader params={params} />
        </Suspense>
      </div>
      <Suspense
        fallback={
          <div className="flex flex-col gap-2 px-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-10 animate-pulse rounded bg-muted" />
            ))}
          </div>
        }
      >
        <ProjectIssues params={params} />
      </Suspense>
    </main>
  );
}

// getWorkspaceBySlug, getProjectByKey는 React cache로 감싸져 있어 두 컴포넌트가 불러도 한 번만 조회한다.
async function loadProject(params: Params) {
  const { workspace: slug, key } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const project = await getProjectByKey(workspace.id, key);
  return { workspace, project };
}

async function ProjectHeader({ params }: { params: Params }) {
  const { project } = await loadProject(params);
  return <ProjectTitle project={project} />;
}

async function ProjectIssues({ params }: { params: Params }) {
  const { workspace, project } = await loadProject(params);
  const [issues, members] = await Promise.all([
    getIssues(project.id),
    getMembers(workspace.id),
  ]);
  return (
    <IssueList
      workspaceSlug={workspace.slug}
      project={project}
      initialIssues={issues}
      initialMembers={members}
    />
  );
}
