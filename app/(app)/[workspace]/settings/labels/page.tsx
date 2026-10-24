import type { Metadata } from "next";
import { Suspense } from "react";

import { LabelSettings } from "@/components/labels/label-settings";
import { getLabels } from "@/lib/data/labels";
import { getWorkspaceBySlug } from "@/lib/data/workspaces";

export const metadata: Metadata = { title: "라벨 | TaskFlow Board" };

export default function LabelsPage({
  params,
}: PageProps<"/[workspace]/settings/labels">) {
  return (
    <main className="flex flex-1 flex-col p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold">라벨</h1>
          <p className="text-sm text-muted-foreground">
            이슈를 분류하는 라벨을 관리합니다. 워크스페이스의 모든 프로젝트에서
            함께 씁니다.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="divide-y rounded-lg border">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="size-3 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          }
        >
          <LabelsContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function LabelsContent({
  params,
}: {
  params: PageProps<"/[workspace]/settings/labels">["params"];
}) {
  const { workspace: slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const labels = await getLabels(workspace.id);
  return <LabelSettings workspaceId={workspace.id} initialLabels={labels} />;
}
