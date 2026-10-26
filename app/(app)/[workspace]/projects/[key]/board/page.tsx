import { Suspense } from "react";

import { IssueBoard } from "@/components/issues/issue-board";
import { loadProjectIssues } from "@/lib/data/project-page";

type Params = PageProps<"/[workspace]/projects/[key]/board">["params"];

export default function ProjectBoardPage({
  params,
}: PageProps<"/[workspace]/projects/[key]/board">) {
  return (
    <Suspense
      fallback={
        <div className="flex gap-3 px-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-64 w-72 shrink-0 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      }
    >
      <ProjectBoard params={params} />
    </Suspense>
  );
}

async function ProjectBoard({ params }: { params: Params }) {
  const { workspace, project, issues, members, labels, user } =
    await loadProjectIssues(params);
  return (
    <IssueBoard
      workspaceSlug={workspace.slug}
      project={project}
      currentUserId={user.id}
      initialIssues={issues}
      initialMembers={members}
      initialLabels={labels}
    />
  );
}
