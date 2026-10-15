import { Suspense } from "react";

import { getWorkspaceBySlug } from "@/lib/data/workspaces";

export default function WorkspacePage({ params }: PageProps<"/[workspace]">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <Suspense
        fallback={<div className="h-8 w-64 animate-pulse rounded bg-muted" />}
      >
        <Welcome params={params} />
      </Suspense>
      {/* 프로젝트 목록은 다음 단계(프로젝트 CRUD)에서 채운다. */}
      <p className="text-muted-foreground">아직 프로젝트가 없습니다.</p>
    </main>
  );
}

async function Welcome({
  params,
}: {
  params: PageProps<"/[workspace]">["params"];
}) {
  const { workspace: slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  return (
    <h1 className="text-2xl font-semibold tracking-tight">
      {workspace.name}에 오신 것을 환영합니다
    </h1>
  );
}
