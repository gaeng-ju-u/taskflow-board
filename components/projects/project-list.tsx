"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { Project } from "@/lib/api/projects";
import { useProjects } from "@/lib/queries/projects";

import { CreateProjectDialog } from "./create-project-dialog";
import { projectPath, type WorkspaceRef } from "./types";

// 워크스페이스 홈. 사이드바와 같은 쿼리 키를 쓰므로 한쪽에서 바꾸면 양쪽이 함께 바뀐다.
export function ProjectList({
  workspace,
  initialProjects,
}: {
  workspace: WorkspaceRef;
  initialProjects: Project[];
}) {
  const { data: projects = initialProjects } = useProjects(
    workspace.id,
    initialProjects,
  );

  return (
    <div className="space-y-4">
      {/* 생성 대화상자는 빈 상태와 목록 상태에서 같은 자리에 둔다. 첫 프로젝트를 낙관적으로 추가하는 순간
          화면이 목록 상태로 바뀌는데, 대화상자가 그때 언마운트되면 저장 후 이동 콜백이 실행되지 않는다. */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">프로젝트</h2>
        <CreateProjectDialog
          workspace={workspace}
          trigger={
            <Button>
              <PlusIcon />새 프로젝트
            </Button>
          }
        />
      </div>
      {projects.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed py-16 text-center">
          <p className="font-medium">아직 프로젝트가 없습니다</p>
          <p className="text-sm text-muted-foreground">
            프로젝트를 만들고 이슈를 관리해 보세요.
          </p>
        </div>
      ) : (
        <ProjectGrid projects={projects} workspaceSlug={workspace.slug} />
      )}
    </div>
  );
}

function ProjectGrid({
  projects,
  workspaceSlug,
}: {
  projects: Project[];
  workspaceSlug: string;
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <Link
            href={projectPath(workspaceSlug, project.key)}
            className="flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:bg-muted/50"
          >
            <span className="font-mono text-xs text-muted-foreground">
              {project.key}
            </span>
            <span className="truncate font-medium">{project.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
