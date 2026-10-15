"use client";

import {
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project } from "@/lib/api/projects";
import { useProjects } from "@/lib/queries/projects";

import { CreateProjectDialog } from "./create-project-dialog";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { RenameProjectDialog } from "./rename-project-dialog";
import { projectPath, type WorkspaceRef } from "./types";

export function ProjectNav({
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
    <nav aria-label="프로젝트" className="flex flex-col gap-1 p-2">
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-xs font-medium text-muted-foreground">
          프로젝트
        </span>
        <CreateProjectDialog
          workspace={workspace}
          trigger={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="새 프로젝트"
              className="text-muted-foreground"
            >
              <PlusIcon />
            </Button>
          }
        />
      </div>
      {projects.length === 0 ? (
        <p className="px-2 py-1 text-sm text-muted-foreground">
          아직 프로젝트가 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-0.5">
          {projects.map((project) => (
            <ProjectNavItem
              key={project.id}
              project={project}
              workspaceSlug={workspace.slug}
            />
          ))}
        </ul>
      )}
    </nav>
  );
}

function ProjectNavItem({
  project,
  workspaceSlug,
}: {
  project: Project;
  workspaceSlug: string;
}) {
  const pathname = usePathname();
  const href = projectPath(workspaceSlug, project.key);
  const active = pathname === href || pathname.startsWith(`${href}/`);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <li className="group relative">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-8 items-center gap-2 rounded-md pr-8 pl-2 text-sm hover:bg-sidebar-accent",
          active && "bg-sidebar-accent font-medium",
        )}
      >
        <span className="rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">
          {project.key}
        </span>
        <span className="truncate">{project.name}</span>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label={`${project.name} 메뉴`}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-popup-open:opacity-100"
            />
          }
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setRenaming(true)}>
            <PencilIcon />
            이름 변경
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleting(true)}
          >
            <TrashIcon />
            삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameProjectDialog
        project={project}
        open={renaming}
        onOpenChange={setRenaming}
      />
      <DeleteProjectDialog
        project={project}
        workspaceSlug={workspaceSlug}
        open={deleting}
        onOpenChange={setDeleting}
      />
    </li>
  );
}
