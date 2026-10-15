import { Suspense } from "react";

import { UserMenu } from "@/components/auth/user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getCurrentUser } from "@/lib/data/auth";
import { getWorkspaceBySlug } from "@/lib/data/workspaces";

// 헤더 뼈대는 정적으로 먼저 보여주고, 세션과 DB를 읽는 부분만 Suspense로 스트리밍한다.
// layout 최상단에서 await하면 페이지 전체가 그 요청을 기다리게 된다.
export default function WorkspaceLayout({
  children,
  params,
}: LayoutProps<"/[workspace]">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center justify-between border-b px-4">
        <Suspense
          fallback={<div className="h-5 w-32 animate-pulse rounded bg-muted" />}
        >
          <WorkspaceName params={params} />
        </Suspense>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Suspense
            fallback={
              <div className="size-8 animate-pulse rounded-full bg-muted" />
            }
          >
            <CurrentUserMenu />
          </Suspense>
        </div>
      </header>
      {children}
    </div>
  );
}

async function WorkspaceName({
  params,
}: {
  params: LayoutProps<"/[workspace]">["params"];
}) {
  const { workspace: slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  return <span className="font-semibold">{workspace.name}</span>;
}

async function CurrentUserMenu() {
  const user = await getCurrentUser();
  return <UserMenu user={user} />;
}
