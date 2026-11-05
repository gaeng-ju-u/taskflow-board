import { Suspense } from "react";

import { IssueDetail } from "@/components/issues/issue-detail";
import { getActivities, getComments } from "@/lib/data/activity";
import { getCurrentUser } from "@/lib/data/auth";
import { getCycles } from "@/lib/data/cycles";
import { getIssueByRef, getIssues } from "@/lib/data/issues";
import { getLabels } from "@/lib/data/labels";
import { getMembers } from "@/lib/data/members";
import { getWorkspaceBySlug } from "@/lib/data/workspaces";

export default function IssuePage({
  params,
}: PageProps<"/[workspace]/issue/[ref]">) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense fallback={<IssueSkeleton />}>
        <IssueContent params={params} />
      </Suspense>
    </main>
  );
}

async function IssueContent({
  params,
}: {
  params: PageProps<"/[workspace]/issue/[ref]">["params"];
}) {
  const { workspace: slug, ref } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const [{ issue, project }, members, labels, user] = await Promise.all([
    getIssueByRef(workspace.id, ref),
    getMembers(workspace.id),
    getLabels(workspace.id),
    getCurrentUser(),
  ]);
  // 프로젝트 이슈 목록은 상위·하위 이슈 표시에 쓴다 (목록·보드와 같은 캐시).
  const [comments, activities, issues, cycles] = await Promise.all([
    getComments(issue.id),
    getActivities(issue.id),
    getIssues(project.id),
    getCycles(project.id),
  ]);
  return (
    <IssueDetail
      workspaceSlug={workspace.slug}
      project={project}
      initialIssue={issue}
      initialIssues={issues}
      initialCycles={cycles}
      initialMembers={members}
      initialLabels={labels}
      initialComments={comments}
      initialActivities={activities}
      currentUserId={user.id}
    />
  );
}

// IssueDetail과 같은 배치 (휴대폰: 제목·설명 → 속성 → 활동, lg: 오른쪽 속성 열)
function IssueSkeleton() {
  return (
    <div className="grid flex-1 grid-cols-1 content-start lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="flex flex-col gap-4 p-6">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
        <div className="hidden h-40 animate-pulse rounded bg-muted lg:block" />
      </div>
      <div className="flex flex-col gap-3 border-y px-6 py-4 lg:border-y-0 lg:border-l lg:p-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-6 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  );
}
