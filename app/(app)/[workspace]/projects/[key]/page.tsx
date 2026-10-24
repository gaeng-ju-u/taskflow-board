import { Suspense } from "react";

import { IssueList } from "@/components/issues/issue-list";
import { loadProjectIssues } from "@/lib/data/project-page";

type Params = PageProps<"/[workspace]/projects/[key]">["params"];

// 프로젝트 제목과 목록/보드 탭은 layout.tsx에 있다.
export default function ProjectListPage({
  params,
}: PageProps<"/[workspace]/projects/[key]">) {
  return (
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
  );
}

async function ProjectIssues({ params }: { params: Params }) {
  const { workspace, project, issues, members, labels } =
    await loadProjectIssues(params);
  return (
    <IssueList
      workspaceSlug={workspace.slug}
      project={project}
      initialIssues={issues}
      initialMembers={members}
      initialLabels={labels}
    />
  );
}
