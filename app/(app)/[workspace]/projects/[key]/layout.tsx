import { Suspense } from "react";

import { ProjectTabs } from "@/components/projects/project-tabs";
import { ProjectTitle } from "@/components/projects/project-title";
import { projectPath } from "@/components/projects/types";
import { PresenceAvatars } from "@/components/realtime/presence-avatars";
import { getCurrentUser } from "@/lib/data/auth";
import { loadProject } from "@/lib/data/project-page";
import { realtimeTopics } from "@/lib/realtime/topics";

// 목록과 보드가 공유하는 프로젝트 제목과 탭. 탭을 바꿔도 이 부분은 다시 그리지 않는다.
export default function ProjectLayout({
  children,
  params,
}: LayoutProps<"/[workspace]/projects/[key]">) {
  return (
    <main className="flex min-h-0 flex-1 flex-col gap-4 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6">
        <Suspense
          fallback={<div className="h-8 w-64 animate-pulse rounded bg-muted" />}
        >
          <ProjectHeader params={params} />
        </Suspense>
      </div>
      {children}
    </main>
  );
}

async function ProjectHeader({
  params,
}: {
  params: LayoutProps<"/[workspace]/projects/[key]">["params"];
}) {
  const [{ workspace, project }, user] = await Promise.all([
    loadProject(params),
    getCurrentUser(),
  ]);
  return (
    <>
      <div className="flex items-center gap-3">
        <ProjectTitle project={project} />
        {/* 이 프로젝트(목록·보드)를 지금 보고 있는 다른 사람들. layout에 있어 탭을 바꿔도 채널이 유지된다. */}
        <PresenceAvatars
          topic={realtimeTopics.project(workspace.id, project.id)}
          me={{ id: user.id, name: user.name, avatarUrl: user.avatarUrl }}
        />
      </div>
      <ProjectTabs basePath={projectPath(workspace.slug, project.key)} />
    </>
  );
}
