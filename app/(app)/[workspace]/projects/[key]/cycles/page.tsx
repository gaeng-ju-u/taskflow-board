import { Suspense } from "react";

import { CycleList } from "@/components/cycles/cycle-list";
import { projectPath } from "@/components/projects/types";
import { loadProjectIssues } from "@/lib/data/project-page";

type Params = PageProps<"/[workspace]/projects/[key]/cycles">["params"];

// 프로젝트 제목과 탭은 layout.tsx에 있다.
export default function ProjectCyclesPage({
  params,
}: PageProps<"/[workspace]/projects/[key]/cycles">) {
  return (
    <Suspense
      fallback={
        <div className="grid gap-3 px-6 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      }
    >
      <ProjectCycles params={params} />
    </Suspense>
  );
}

async function ProjectCycles({ params }: { params: Params }) {
  const { workspace, project, issues, cycles } =
    await loadProjectIssues(params);
  return (
    <CycleList
      listPath={projectPath(workspace.slug, project.key)}
      project={project}
      initialCycles={cycles}
      initialIssues={issues}
    />
  );
}
