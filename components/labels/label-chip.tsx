import { cn } from "cn";

import type { Label } from "@/lib/api/labels";

// 라벨 색은 사용자가 고른 데이터라 토큰 클래스로 표현할 수 없다. 색 점에만 인라인 스타일을 쓰고,
// 글자와 테두리는 토큰 색을 써서 라이트·다크 모두에서 읽히게 한다.
export function LabelDot({
  color,
  className,
}: {
  color: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: color }}
    />
  );
}

export function LabelChip({ label }: { label: Label }) {
  return (
    <span className="inline-flex h-5 max-w-32 items-center gap-1 rounded-full border px-2 text-xs text-foreground">
      <LabelDot color={label.color} />
      <span className="truncate">{label.name}</span>
    </span>
  );
}

// max개까지 보여주고 나머지는 +n으로 줄인다.
export function LabelChips({
  labels,
  max = labels.length,
  className,
}: {
  labels: Label[];
  max?: number;
  className?: string;
}) {
  if (labels.length === 0) return null;
  const hidden = labels.length - max;
  return (
    <span className={cn("flex flex-wrap items-center gap-1", className)}>
      {labels.slice(0, max).map((label) => (
        <LabelChip key={label.id} label={label} />
      ))}
      {hidden > 0 && (
        <span
          className="text-xs text-muted-foreground"
          title={labels
            .slice(max)
            .map((label) => label.name)
            .join(", ")}
        >
          +{hidden}
        </span>
      )}
    </span>
  );
}

// 이슈에 붙은 라벨 id를 라벨 목록 순서대로 라벨로 바꾼다. 목록에 없는 id(방금 지운 라벨)는 뺀다.
export function issueLabels(
  labelIds: { label_id: string }[],
  labels: Label[],
): Label[] {
  const ids = new Set(labelIds.map((item) => item.label_id));
  return labels.filter((label) => ids.has(label.id));
}
