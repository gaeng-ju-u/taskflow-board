"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { findOverlap, type Cycle } from "@/lib/api/cycles";
import { useCreateCycle, useUpdateCycle } from "@/lib/queries/cycles";
import { cycleSchema, type CycleInput } from "@/lib/validations/cycle";

type Errors = Partial<Record<keyof CycleInput, string>>;

// 사이클 만들기·수정 대화상자. cycle을 주면 수정, 아니면 initial 값으로 만든다.
// 기간 겹침은 저장 전에 지금 목록과 비교해 알려준다 (최종 검사는 DB 제약 cycles_no_overlap).
export function CycleFormDialog({
  workspaceId,
  projectId,
  cycles,
  cycle,
  initial,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  projectId: string;
  cycles: Cycle[];
  cycle?: Cycle;
  initial: CycleInput;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const createCycle = useCreateCycle(workspaceId, projectId);
  const updateCycle = useUpdateCycle(workspaceId, projectId);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  // 부모가 open을 true로 바꿔 열 때는 onOpenChange가 불리지 않는다. 열리는 순간 입력값을 새로 채운다.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(initial);
      setErrors({});
    }
  }

  function update(key: keyof CycleInput, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = cycleSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path[0], issue.message]),
        ),
      );
      return;
    }
    const overlap = findOverlap(cycles, parsed.data, cycle?.id);
    if (overlap) {
      setErrors({ ends_at: `'${overlap.name}'와 기간이 겹칩니다` });
      return;
    }
    if (cycle) {
      updateCycle.mutate({ id: cycle.id, patch: parsed.data });
    } else {
      createCycle.mutate({ id: crypto.randomUUID(), ...parsed.data });
    }
    onOpenChange(false);
  }

  const field = (key: keyof CycleInput) => ({
    id: `cycle-${key}`,
    "aria-invalid": !!errors[key],
    "aria-describedby": errors[key] ? `cycle-${key}-error` : undefined,
  });
  const errorText = (key: keyof CycleInput) =>
    errors[key] && (
      <p id={`cycle-${key}-error`} className="text-sm text-destructive">
        {errors[key]}
      </p>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{cycle ? "사이클 수정" : "새 사이클"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cycle-name">이름</Label>
            <Input
              {...field("name")}
              value={form.name}
              maxLength={50}
              autoFocus
              onChange={(e) => update("name", e.target.value)}
            />
            {errorText("name")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cycle-starts_at">시작일</Label>
              <Input
                {...field("starts_at")}
                type="date"
                value={form.starts_at}
                onChange={(e) => update("starts_at", e.target.value)}
              />
              {errorText("starts_at")}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cycle-ends_at">종료일</Label>
              <Input
                {...field("ends_at")}
                type="date"
                value={form.ends_at}
                min={form.starts_at || undefined}
                onChange={(e) => update("ends_at", e.target.value)}
              />
            </div>
          </div>
          {/* 종료일 오류(겹침 포함)는 두 칸 아래 한 줄에 보여준다 */}
          {errorText("ends_at")}
          <DialogFooter>
            <Button type="submit">{cycle ? "저장" : "사이클 만들기"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
