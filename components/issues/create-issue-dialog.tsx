"use client";

import { useState, type ReactElement } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@/lib/api/projects";
import type { IssuePriority, IssueStatus } from "@/lib/api/issues";
import type { Member } from "@/lib/api/members";
import { useCreateIssue } from "@/lib/queries/issues";
import { createIssueSchema } from "@/lib/validations/issue";

import {
  AssigneeSelect,
  PrioritySelect,
  StatusSelect,
} from "./property-selects";

const EMPTY = {
  title: "",
  description: "",
  status: "todo" as IssueStatus,
  priority: "none" as IssuePriority,
  assignee_id: null as string | null,
};

export function CreateIssueDialog({
  project,
  members,
  trigger,
}: {
  project: Project;
  members: Member[];
  trigger: ReactElement;
}) {
  const createIssue = useCreateIssue(project.workspace_id, project.key);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string>();

  function update<K extends keyof typeof EMPTY>(
    key: K,
    value: (typeof EMPTY)[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createIssueSchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    // 목록에 먼저 추가하고 대화상자를 닫는다. 생성 완료 알림은 훅이 띄운다.
    createIssue.mutate({
      id: crypto.randomUUID(),
      project_id: project.id,
      ...parsed.data,
    });
    setOpen(false);
    setForm(EMPTY);
    setError(undefined);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setForm(EMPTY);
          setError(undefined);
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>새 이슈 · {project.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="issue-title" className="sr-only">
              제목
            </Label>
            <Input
              id="issue-title"
              value={form.title}
              maxLength={200}
              placeholder="이슈 제목"
              autoFocus
              onChange={(e) => update("title", e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "issue-title-error" : undefined}
            />
            {error && (
              <p id="issue-title-error" className="text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="issue-description" className="sr-only">
              설명
            </Label>
            <Textarea
              id="issue-description"
              value={form.description}
              maxLength={10000}
              placeholder="설명 (선택)"
              rows={5}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-1">
            <StatusSelect
              value={form.status}
              onChange={(value) => update("status", value)}
            />
            <PrioritySelect
              value={form.priority}
              onChange={(value) => update("priority", value)}
            />
            <AssigneeSelect
              value={form.assignee_id}
              onChange={(value) => update("assignee_id", value)}
              members={members}
            />
          </div>

          <DialogFooter>
            <Button type="submit">이슈 만들기</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
