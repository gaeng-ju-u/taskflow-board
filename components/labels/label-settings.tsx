"use client";

import { PencilIcon, TrashIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { nextLabelColor, type Label } from "@/lib/api/labels";
import {
  useCreateLabel,
  useDeleteLabel,
  useLabels,
  useUpdateLabel,
} from "@/lib/queries/labels";
import { createLabelSchema, labelNameSchema } from "@/lib/validations/label";

import { ColorPicker } from "./color-picker";
import { LabelDot } from "./label-chip";

// 라벨 관리 화면. 라벨은 워크스페이스 멤버 누구나 관리할 수 있다 (RLS).
export function LabelSettings({
  workspaceId,
  initialLabels,
}: {
  workspaceId: string;
  initialLabels: Label[];
}) {
  const { data: labels = initialLabels } = useLabels(
    workspaceId,
    initialLabels,
  );

  return (
    <div className="space-y-6">
      <CreateLabelForm workspaceId={workspaceId} labels={labels} />
      {/* 목록은 라벨이 0개일 때와 있을 때 같은 자리에 둔다 (만들기 폼이 언마운트되지 않게). */}
      <section className="space-y-3">
        <h2 className="font-semibold">
          라벨{" "}
          <span className="font-normal text-muted-foreground">
            {labels.length}
          </span>
        </h2>
        {labels.length === 0 ? (
          <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed py-12 text-center">
            <p className="font-medium">아직 라벨이 없습니다</p>
            <p className="text-sm text-muted-foreground">
              라벨을 만들어 이슈를 분류해 보세요. 이슈의 라벨 메뉴에서도 바로
              만들 수 있습니다.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {labels.map((label) => (
              <LabelRow key={label.id} label={label} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CreateLabelForm({
  workspaceId,
  labels,
}: {
  workspaceId: string;
  labels: Label[];
}) {
  const createLabel = useCreateLabel(workspaceId);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(() =>
    nextLabelColor(labels.length),
  );
  const [error, setError] = useState<string>();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createLabelSchema.safeParse({ name, color });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.name?.[0]);
      return;
    }
    // 캐시에서 먼저 확인한다. DB의 unique 제약이 최종 방어선이다.
    if (labels.some((label) => label.name === parsed.data.name)) {
      setError("이미 있는 라벨 이름입니다");
      return;
    }
    createLabel.mutate({ id: crypto.randomUUID(), ...parsed.data });
    setName("");
    setError(undefined);
    // 다음 라벨은 다른 색으로 시작한다.
    setColor(nextLabelColor(labels.length + 1));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-1.5">
      <label htmlFor="label-name" className="text-sm font-medium">
        새 라벨
      </label>
      <div className="flex gap-2">
        <ColorPicker label="라벨 색" value={color} onChange={setColor} />
        <Input
          id="label-name"
          value={name}
          maxLength={30}
          placeholder="예: 버그, 기능, 디자인"
          onChange={(event) => {
            setName(event.target.value);
            setError(undefined);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? "label-name-error" : undefined}
        />
        <Button type="submit">만들기</Button>
      </div>
      {error && (
        <p id="label-name-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

function LabelRow({ label }: { label: Label }) {
  const updateLabel = useUpdateLabel(label.workspace_id);
  const deleteLabel = useDeleteLabel(label.workspace_id);
  // 이름 입력값은 편집 중과 저장 중에만 보여주고, 저장이 끝나면(onSettled) 버리고 캐시 값을 보여준다.
  // 저장이 실패해 롤백되면 화면에도 되돌아간 이름이 보인다 (issue-detail.tsx의 useEditableText와 같은 방식).
  const [draft, setDraft] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const skipSave = useRef(false);

  function save() {
    setEditing(false);
    if (skipSave.current || draft === null) {
      skipSave.current = false;
      setDraft(null);
      return;
    }
    const parsed = labelNameSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      setDraft(null);
      return;
    }
    if (parsed.data === label.name) {
      setDraft(null);
      return;
    }
    updateLabel.mutate(
      { id: label.id, patch: { name: parsed.data } },
      { onSettled: () => setDraft(null) },
    );
  }

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <ColorPicker
        label={`${label.name} 색`}
        value={label.color}
        onChange={(color) =>
          updateLabel.mutate({ id: label.id, patch: { color } })
        }
      />
      {!editing ? (
        <span className="min-w-0 flex-1 truncate text-sm">
          {draft ?? label.name}
        </span>
      ) : (
        <Input
          aria-label={`${label.name} 이름`}
          autoFocus
          maxLength={30}
          value={draft ?? label.name}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={save}
          onKeyDown={(event) => {
            // 한글 조합 중의 Enter·Esc는 조합을 끝내는 키라 무시한다.
            if (event.nativeEvent.isComposing) return;
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              skipSave.current = true;
              event.currentTarget.blur();
            }
          }}
          className="h-8 flex-1"
        />
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`${label.name} 이름 변경`}
        title="이름 변경"
        className="text-muted-foreground"
        onClick={() => {
          setDraft(label.name);
          setEditing(true);
        }}
      >
        <PencilIcon />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`${label.name} 삭제`}
        title="삭제"
        className="text-muted-foreground"
        onClick={() => setDeleting(true)}
      >
        <TrashIcon />
      </Button>
      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <LabelDot color={label.color} />
              {label.name} 라벨을 삭제할까요?
            </AlertDialogTitle>
            <AlertDialogDescription>
              이 라벨이 붙은 이슈에서도 빠지며 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                deleteLabel.mutate(label.id);
                setDeleting(false);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
