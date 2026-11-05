import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "cn";

// 목록이 비었을 때의 안내 상자. 프로젝트·이슈(목록·보드)·사이클·라벨이 같은 모양을 쓴다.
// 만들기 버튼은 넣지 않는다. 화면 위쪽의 만들기 버튼을 같은 자리에 두어야 첫 항목이 생겨 이 상자가 사라져도
// 생성 대화상자가 언마운트되지 않는다 (CLAUDE.md 참고).
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <Icon aria-hidden className="mb-2 size-6 text-muted-foreground" />
      )}
      <p className="font-medium">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
