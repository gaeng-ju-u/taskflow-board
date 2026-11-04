import { cn } from "cn";

// 하위 이슈 진행률: 작은 원형 막대 + "완료/전체". 전체에서 취소한 이슈는 뺀다 (issueProgress).
export function SubIssueProgress({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  const ratio = total === 0 ? 0 : done / total;
  // 둘레가 1이 되도록 pathLength를 주고, 채운 비율만큼 선을 그린다.
  // relative: 안의 sr-only(absolute)가 이 배지를 기준으로 놓이게 한다. 기준이 없으면 보드의 가로 스크롤
  // 영역에 잘리지 않고 화면 밖 칸의 위치에 놓여 페이지 전체에 가로 스크롤이 생긴다.
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums",
        className,
      )}
      title={`하위 이슈 ${total}개 중 ${done}개 완료`}
    >
      <svg viewBox="0 0 16 16" className="size-3.5 -rotate-90" aria-hidden>
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          strokeWidth="2.5"
          className="stroke-muted-foreground/25"
        />
        <circle
          cx="8"
          cy="8"
          r="6"
          fill="none"
          strokeWidth="2.5"
          pathLength={1}
          strokeDasharray={`${ratio} 1`}
          className={cn("stroke-indigo-500", ratio === 0 && "hidden")}
        />
      </svg>
      <span className="sr-only">하위 이슈 진행률 </span>
      {done}/{total}
    </span>
  );
}
