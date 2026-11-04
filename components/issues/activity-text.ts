import type { Activity } from "@/lib/api/activity";
import type { Label } from "@/lib/api/labels";
import type { Member } from "@/lib/api/members";

import { PRIORITY_META, STATUS_META } from "./issue-meta";

type Payload = Record<string, unknown>;

function isPayload(value: unknown): value is Payload {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const text = (value: unknown) => (typeof value === "string" ? value : null);

// 활동 로그 한 줄의 문장. 한국어 조사("~으로/로")를 피하려고 "무엇을 바꿨습니다: 이전 → 이후" 형식을 쓴다.
// 모르는 종류는 null(표시하지 않음).
export function describeActivity(
  activity: Activity,
  {
    members,
    labels,
    issueRef,
    cycleName,
  }: {
    members: Member[];
    labels: Label[];
    // 이슈 id → "TF-3". 지워졌거나 모르는 이슈면 null.
    issueRef: (id: string) => string | null;
    // 사이클 id → 이름. 지워졌거나 모르는 사이클이면 null.
    cycleName: (id: string) => string | null;
  },
): string | null {
  const payload = isPayload(activity.payload) ? activity.payload : {};
  const memberName = (id: string | null) =>
    id
      ? (members.find((member) => member.id === id)?.name ??
        "알 수 없는 사용자")
      : null;
  const statusLabel = (value: unknown) => {
    const key = text(value);
    return key && key in STATUS_META
      ? STATUS_META[key as keyof typeof STATUS_META].label
      : "알 수 없음";
  };
  const priorityLabel = (value: unknown) => {
    const key = text(value);
    return key && key in PRIORITY_META
      ? PRIORITY_META[key as keyof typeof PRIORITY_META].label
      : "알 수 없음";
  };
  // 라벨은 지금 이름을 우선 쓰고, 지워진 라벨이면 기록 당시 이름을 쓴다.
  const labelName = () =>
    labels.find((label) => label.id === text(payload.label_id))?.name ??
    text(payload.name) ??
    "알 수 없는 라벨";

  switch (activity.type) {
    case "created":
      return "이슈를 만들었습니다";
    case "label_added":
      return `라벨을 붙였습니다: ${labelName()}`;
    case "label_removed":
      return `라벨을 뗐습니다: ${labelName()}`;
    case "updated":
      switch (payload.field) {
        case "title":
          return `제목을 바꿨습니다: ${text(payload.to) ?? ""}`;
        case "description":
          return "설명을 수정했습니다";
        case "status":
          return `상태를 바꿨습니다: ${statusLabel(payload.from)} → ${statusLabel(payload.to)}`;
        case "priority":
          return `우선순위를 바꿨습니다: ${priorityLabel(payload.from)} → ${priorityLabel(payload.to)}`;
        case "assignee_id": {
          const to = memberName(text(payload.to));
          return to ? `담당자를 지정했습니다: ${to}` : "담당자를 해제했습니다";
        }
        case "parent_id": {
          const to = text(payload.to);
          if (!to) return "상위 이슈를 해제했습니다";
          const ref = issueRef(to);
          return ref
            ? `상위 이슈를 지정했습니다: ${ref}`
            : "상위 이슈를 지정했습니다";
        }
        case "cycle_id": {
          const to = text(payload.to);
          if (!to) return "사이클을 해제했습니다";
          const name = cycleName(to);
          return name
            ? `사이클을 지정했습니다: ${name}`
            : "사이클을 지정했습니다";
        }
        default:
          return null;
      }
    default:
      return null;
  }
}
