import type { Tables } from "@/lib/supabase/database.types";

import type { Supabase } from "./projects";

export type Label = Pick<
  Tables<"labels">,
  "id" | "workspace_id" | "name" | "color" | "created_at"
>;

export const LABEL_COLUMNS = "id, workspace_id, name, color, created_at";

export async function listLabels(supabase: Supabase, workspaceId: string) {
  const { data, error } = await supabase
    .from("labels")
    .select(LABEL_COLUMNS)
    .eq("workspace_id", workspaceId);
  if (error) throw error;
  return sortLabels(data);
}

// 라벨은 이름순으로 보여준다. DB 정렬(collation)과 브라우저 정렬이 한글에서 다를 수 있어서,
// 서버 결과와 낙관적으로 추가한 목록 모두 이 함수로 정렬한다.
export function sortLabels(labels: Label[]) {
  return [...labels].sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

// 고를 수 있는 라벨 색. DB의 labels.color 제약(#rrggbb, 소문자)과 같은 형식이다.
// 라이트·다크 모두에서 보이는 중간 명도의 색이다.
export const LABEL_COLORS = [
  { value: "#6b7280", name: "회색" },
  { value: "#ef4444", name: "빨강" },
  { value: "#f97316", name: "주황" },
  { value: "#eab308", name: "노랑" },
  { value: "#22c55e", name: "초록" },
  { value: "#14b8a6", name: "청록" },
  { value: "#3b82f6", name: "파랑" },
  { value: "#6366f1", name: "남색" },
  { value: "#a855f7", name: "보라" },
  { value: "#ec4899", name: "분홍" },
] as const;

// 새 라벨의 기본 색. 이미 있는 라벨 수에 따라 돌아가며 골라 비슷한 색이 몰리지 않게 한다.
export function nextLabelColor(existingCount: number) {
  return LABEL_COLORS[(existingCount + 1) % LABEL_COLORS.length].value;
}

export function labelsPath(workspaceSlug: string) {
  return `/${workspaceSlug}/settings/labels`;
}
