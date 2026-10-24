import { Suspense } from "react";

import { IssueDetail } from "@/components/issues/issue-detail";
import { getIssueByRef } from "@/lib/data/issues";
import { getLabels } from "@/lib/data/labels";
import { getMembers } from "@/lib/data/members";
import { getWorkspaceBySlug } from "@/lib/data/workspaces";

export default function IssuePage({
  params,
}: PageProps<"/[workspace]/issue/[ref]">) {
  return (
    <main className="flex flex-1 flex-col">
      <Suspense
        fallback={
          <div className="flex flex-col gap-4 p-6">
            <div className="h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
            <div className="h-40 animate-pulse rounded bg-muted" />
          </div>
        }
      >
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
  const [{ issue, project }, members, labels] = await Promise.all([
    getIssueByRef(workspace.id, ref),
    getMembers(workspace.id),
    getLabels(workspace.id),
  ]);
  return (
    <IssueDetail
      workspaceSlug={workspace.slug}
      project={project}
      initialIssue={issue}
      initialMembers={members}
      initialLabels={labels}
    />
  );
}
