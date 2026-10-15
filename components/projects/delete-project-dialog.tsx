"use client";

import { usePathname, useRouter } from "next/navigation";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Project } from "@/lib/api/projects";
import { useDeleteProject } from "@/lib/queries/projects";

import { projectPath } from "./types";

export function DeleteProjectDialog({
  project,
  workspaceSlug,
  open,
  onOpenChange,
}: {
  project: Project;
  workspaceSlug: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const deleteProject = useDeleteProject(project.workspace_id);

  function handleDelete() {
    deleteProject.mutate(project.id);
    onOpenChange(false);
    // 지우는 프로젝트를 보고 있었다면 워크스페이스 홈으로 나간다.
    if (pathname.startsWith(projectPath(workspaceSlug, project.key))) {
      router.push(`/${workspaceSlug}`);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {project.name} 프로젝트를 삭제할까요?
          </AlertDialogTitle>
          <AlertDialogDescription>
            프로젝트의 모든 이슈와 사이클이 함께 삭제되며 되돌릴 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleDelete}>
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
