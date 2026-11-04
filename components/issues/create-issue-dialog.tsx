"use client";

import { useState, type ReactElement } from "react";

import { CycleSelect } from "@/components/cycles/cycle-select";
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
import type { Cycle } from "@/lib/api/cycles";
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
  cycle_id: null as string | null,
};

export function CreateIssueDialog({
  project,
  members,
  cycles,
  defaultCycleId = null,
  parent,
  trigger,
}: {
  project: Pick<Project, "id" | "workspace_id" | "name" | "key">;
  members: Member[];
  cycles: Cycle[];
  // 열 때 고른 상태로 둘 사이클 (사이클로 필터링한 목록, 상위 이슈의 사이클)
  defaultCycleId?: string | null;
  // 주면 그 이슈의 하위 이슈로 만든다. ref는 제목에 보여줄 "TF-3".
  parent?: { id: string; ref: string };
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
    const parsed = createIssueSchema.safeParse({
      ...form,
      parent_id: parent?.id ?? null,
    });
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
        if (next) {
          setForm({ ...EMPTY, cycle_id: defaultCycleId });
        } else {
          setForm(EMPTY);
          setError(undefined);
        }
      }}
    >
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>
              {parent
                ? `새 하위 이슈 · ${parent.ref}`
                : `새 이슈 · ${project.name}`}
            </DialogTitle>
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
            {cycles.length > 0 && (
              <CycleSelect
                value={form.cycle_id}
                cycles={cycles}
                onChange={(value) => update("cycle_id", value)}
              />
            )}
          </div>

          <DialogFooter>
            <Button type="submit">이슈 만들기</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
