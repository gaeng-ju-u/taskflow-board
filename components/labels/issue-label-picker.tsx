"use client";

import { TagIcon } from "lucide-react";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import type { Issue } from "@/lib/api/issues";
import { nextLabelColor, type Label } from "@/lib/api/labels";
import { useToggleIssueLabel } from "@/lib/queries/issues";
import { useCreateLabel } from "@/lib/queries/labels";

import { issueLabels, LabelChips } from "./label-chip";
import { LabelPicker } from "./label-picker";

// 이슈의 라벨을 고르는 버튼. compact는 목록 행·보드 카드용 아이콘 버튼이고, 아니면 붙은 라벨을 보여준다.
export function IssueLabelPicker({
  issue,
  labels,
  compact,
  className,
}: {
  issue: Issue;
  labels: Label[];
  compact?: boolean;
  className?: string;
}) {
  const toggleLabel = useToggleIssueLabel(issue.workspace_id);
  const createLabel = useCreateLabel(issue.workspace_id);
  const selected = issueLabels(issue.issue_labels, labels);
  const selectedIds = new Set(selected.map((label) => label.id));

  async function handleCreate(name: string) {
    const id = crypto.randomUUID();
    try {
      // issue_labels는 라벨이 DB에 있어야 저장되므로, 라벨 저장이 끝난 뒤 붙인다.
      // 실패(오프라인 포함)는 useCreateLabel이 롤백하고 알린다.
      await createLabel.mutateAsync({
        id,
        name,
        color: nextLabelColor(labels.length),
      });
    } catch {
      return;
    }
    toggleLabel.mutate({ issue, labelId: id, attach: true });
  }

  const label =
    selected.length > 0
      ? `라벨: ${selected.map((item) => item.name).join(", ")}`
      : "라벨 추가";

  return (
    <LabelPicker
      labels={labels}
      selectedIds={selectedIds}
      onToggle={(labelId, attach) =>
        toggleLabel.mutate({ issue, labelId, attach })
      }
      onCreate={handleCreate}
      align={compact ? "end" : "start"}
      trigger={
        compact ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={label}
            title={label}
            className={cn("text-muted-foreground", className)}
          >
            <TagIcon />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            aria-label={label}
            className={cn(
              // Button 기본값 shrink-0을 풀어 패널 폭 안에서 줄어들게 하고, 라벨이 많으면 칩이 여러 줄로 넘어가게 한다.
              "h-auto min-h-7 min-w-0 shrink justify-start py-1 whitespace-normal",
              className,
            )}
          >
            {selected.length > 0 ? (
              <LabelChips labels={selected} />
            ) : (
              <>
                <TagIcon className="text-muted-foreground" />
                <span className="text-muted-foreground">라벨 추가</span>
              </>
            )}
          </Button>
        )
      }
    />
  );
}
