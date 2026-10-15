"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactElement } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateProject, useProjects } from "@/lib/queries/projects";
import {
  createProjectSchema,
  suggestProjectKey,
} from "@/lib/validations/project";

import { projectPath, type WorkspaceRef } from "./types";

type FieldErrors = { name?: string[]; key?: string[] };

export function CreateProjectDialog({
  workspace,
  trigger,
}: {
  workspace: WorkspaceRef;
  trigger: ReactElement;
}) {
  const router = useRouter();
  const { data: projects = [] } = useProjects(workspace.id);
  const createProject = useCreateProject(workspace.id);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyEdited, setKeyEdited] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  function reset() {
    setName("");
    setKey("");
    setKeyEdited(false);
    setErrors({});
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createProjectSchema.safeParse({ name, key });
    if (!parsed.success) {
      setErrors(z.flattenError(parsed.error).fieldErrors);
      return;
    }
    // 캐시에 있는 키와 겹치면 서버에 보내기 전에 알려준다. 서버의 unique 제약이 최종 방어선이다.
    if (projects.some((project) => project.key === parsed.data.key)) {
      setErrors({ key: ["이미 사용 중인 키입니다"] });
      return;
    }

    // 대화상자를 바로 닫고 사이드바에 먼저 추가한다. 저장이 끝나면 새 프로젝트로 이동한다.
    createProject.mutate(
      { id: crypto.randomUUID(), ...parsed.data },
      {
        onSuccess: (project) =>
          router.push(projectPath(workspace.slug, project.key)),
      },
    );
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>새 프로젝트</DialogTitle>
            <DialogDescription>
              키는 이슈 번호 앞에 붙습니다 (예: TF-12). 만든 뒤에는 바꿀 수
              없습니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="project-name">이름</Label>
            <Input
              id="project-name"
              value={name}
              maxLength={50}
              placeholder="TaskFlow"
              autoFocus
              onChange={(e) => {
                setName(e.target.value);
                if (!keyEdited) setKey(suggestProjectKey(e.target.value));
              }}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "project-name-error" : undefined}
            />
            {errors.name && (
              <p id="project-name-error" className="text-sm text-destructive">
                {errors.name[0]}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="project-key">키</Label>
            <Input
              id="project-key"
              value={key}
              maxLength={5}
              placeholder="TF"
              className="font-mono uppercase"
              onChange={(e) => {
                setKey(e.target.value.toUpperCase());
                setKeyEdited(true);
              }}
              aria-invalid={!!errors.key}
              aria-describedby="project-key-hint"
            />
            <p
              id="project-key-hint"
              className={
                errors.key
                  ? "text-sm text-destructive"
                  : "text-xs text-muted-foreground"
              }
            >
              {errors.key?.[0] ??
                "영문 대문자로 시작하는 2~5자 (영문 대문자, 숫자)"}
            </p>
          </div>

          <DialogFooter>
            <Button type="submit">만들기</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
