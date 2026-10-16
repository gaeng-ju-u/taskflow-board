import {
  CircleCheckIcon,
  CircleDashedIcon,
  CircleDotIcon,
  CircleIcon,
  CircleXIcon,
  MinusIcon,
  SignalHighIcon,
  SignalLowIcon,
  SignalMediumIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from "lucide-react";

import type { IssuePriority, IssueStatus } from "@/lib/api/issues";

type Meta = { label: string; icon: LucideIcon; className: string };

// 목록에서 그룹을 보여주는 순서
export const STATUS_ORDER: IssueStatus[] = [
  "in_progress",
  "todo",
  "backlog",
  "done",
  "canceled",
];

// 상태·우선순위 색은 의미를 전달하는 색이라 토큰 대신 중간 명도(500)를 쓴다. 라이트·다크 모두에서 읽힌다.
export const STATUS_META: Record<IssueStatus, Meta> = {
  backlog: {
    label: "백로그",
    icon: CircleDashedIcon,
    className: "text-muted-foreground",
  },
  todo: { label: "할 일", icon: CircleIcon, className: "text-foreground" },
  in_progress: {
    label: "진행 중",
    icon: CircleDotIcon,
    className: "text-amber-500",
  },
  done: { label: "완료", icon: CircleCheckIcon, className: "text-indigo-500" },
  canceled: {
    label: "취소",
    icon: CircleXIcon,
    className: "text-muted-foreground",
  },
};

export const PRIORITY_ORDER: IssuePriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
];

export const PRIORITY_META: Record<IssuePriority, Meta> = {
  none: {
    label: "우선순위 없음",
    icon: MinusIcon,
    className: "text-muted-foreground",
  },
  low: { label: "낮음", icon: SignalLowIcon, className: "text-foreground" },
  medium: {
    label: "보통",
    icon: SignalMediumIcon,
    className: "text-foreground",
  },
  high: { label: "높음", icon: SignalHighIcon, className: "text-foreground" },
  urgent: {
    label: "긴급",
    icon: TriangleAlertIcon,
    className: "text-orange-500",
  },
};
