import Link from "next/link";
import { Suspense } from "react";

import { UserMenu } from "@/components/auth/user-menu";
import { ProjectNav } from "@/components/projects/project-nav";
import { RealtimeSync } from "@/components/realtime/realtime-sync";
import { SettingsNav } from "@/components/settings/settings-nav";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getCurrentUser } from "@/lib/data/auth";
import { getProjects } from "@/lib/data/projects";
import { getWorkspaceBySlug } from "@/lib/data/workspaces";

type Params = LayoutProps<"/[workspace]">["params"];

// 사이드바와 헤더 뼈대는 정적으로 먼저 보여주고, 세션과 DB를 읽는 부분만 Suspense로 스트리밍한다.
// layout 최상단에서 await하면 페이지 전체가 그 요청을 기다리게 된다.
export default function WorkspaceLayout({
  children,
  params,
}: LayoutProps<"/[workspace]">) {
  return (
    <div className="flex flex-1">
      {/* 다른 사람의 변경을 실시간으로 캐시에 반영한다. 화면에는 아무것도 그리지 않는다. */}
      <Suspense fallback={null}>
        <WorkspaceRealtime params={params} />
      </Suspense>
      {/* 모바일에서는 사이드바를 숨기고, 워크스페이스 홈의 프로젝트 목록을 쓴다. */}
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Suspense fallback={<NameSkeleton />}>
            <WorkspaceName params={params} />
          </Suspense>
        </div>
        <Suspense fallback={<NavSkeleton />}>
          <SidebarProjects params={params} />
        </Suspense>
        <div className="mt-auto border-t p-2">
          <Suspense fallback={<div className="h-16" />}>
            <SidebarSettings params={params} />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b px-4">
          <div className="md:invisible">
            <Suspense fallback={<NameSkeleton />}>
              <WorkspaceName params={params} />
            </Suspense>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Suspense
              fallback={
                <div className="size-8 animate-pulse rounded-full bg-muted" />
              }
            >
              <CurrentUserMenu params={params} />
            </Suspense>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function NameSkeleton() {
  return <div className="h-5 w-32 animate-pulse rounded bg-muted" />;
}

function NavSkeleton() {
  return (
    <div className="flex flex-col gap-2 p-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-6 animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

async function WorkspaceName({ params }: { params: Params }) {
  const { workspace: slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  return (
    <Link href={`/${workspace.slug}`} className="truncate font-semibold">
      {workspace.name}
    </Link>
  );
}

async function SidebarProjects({ params }: { params: Params }) {
  const { workspace: slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const projects = await getProjects(workspace.id);
  return <ProjectNav workspace={workspace} initialProjects={projects} />;
}

async function WorkspaceRealtime({ params }: { params: Params }) {
  const { workspace: slug } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  return <RealtimeSync workspaceId={workspace.id} />;
}

async function SidebarSettings({ params }: { params: Params }) {
  const { workspace: slug } = await params;
  return <SettingsNav workspaceSlug={slug} />;
}

async function CurrentUserMenu({ params }: { params: Params }) {
  const [{ workspace: slug }, user] = await Promise.all([
    params,
    getCurrentUser(),
  ]);
  return <UserMenu user={user} workspaceSlug={slug} />;
}
