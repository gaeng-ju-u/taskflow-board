"use client";

import { IterationCwIcon } from "lucide-react";
import Link from "next/link";

import { cycleTiming, formatCycleRange, type Cycle } from "@/lib/api/cycles";
import { issueProgress, type Issue } from "@/lib/api/issues";
import { todayInSeoul } from "@/lib/date";
import { useNow } from "@/hooks/use-now";

import { CycleProgressBar } from "./cycle-progress-bar";

// 목록·보드에 사이클 하나로 필터가 걸렸을 때 위에 보여주는 요약.
// 진행률은 다른 필터와 관계없이 그 사이클의 전체 이슈로 계산한다.
export function CycleSummary({
  cycle,
  issues,
  cyclesHref,
}: {
  cycle: Cycle;
  issues: Issue[];
  cyclesHref: string;
}) {
  const today = todayInSeoul(useNow());
  const { done, total } = issueProgress(
    issues.filter((issue) => issue.cycle_id === cycle.id),
  );

  return (
    <div className="mx-6 mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-muted/30 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <IterationCwIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium">{cycle.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatCycleRange(cycle)} ·{" "}
          <span suppressHydrationWarning>{cycleTiming(cycle, today)}</span>
        </span>
      </div>
      <CycleProgressBar done={done} total={total} className="min-w-48 flex-1" />
      <Link
        href={cyclesHref}
        className="text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        모든 사이클
      </Link>
    </div>
  );
}
