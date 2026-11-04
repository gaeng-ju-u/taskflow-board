import type { Tables } from "@/lib/supabase/database.types";

import type { Supabase } from "./projects";

export type Cycle = Pick<
  Tables<"cycles">,
  "id" | "project_id" | "name" | "starts_at" | "ends_at" | "created_at"
>;

export const CYCLE_COLUMNS =
  "id, project_id, name, starts_at, ends_at, created_at";

export async function listCycles(supabase: Supabase, projectId: string) {
  const { data, error } = await supabase
    .from("cycles")
    .select(CYCLE_COLUMNS)
    .eq("project_id", projectId);
  if (error) throw error;
  return sortCycles(data);
}

// 시작일 순. 서버 결과와 낙관적으로 추가·수정한 목록 모두 이 함수로 정렬한다.
export function sortCycles(cycles: Cycle[]) {
  return [...cycles].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
}

// 날짜는 DB의 date 그대로 "YYYY-MM-DD" 문자열로 다룬다. 같은 형식이라 문자열 비교로 순서를 정할 수 있다.
// today는 서울 기준 오늘 (lib/date.ts의 todayInSeoul). 종료일은 사이클에 포함된다.
export type CycleStatus = "active" | "upcoming" | "completed";

export function cycleStatus(cycle: Cycle, today: string): CycleStatus {
  if (today < cycle.starts_at) return "upcoming";
  if (today > cycle.ends_at) return "completed";
  return "active";
}

// 기간이 겹치지 않으므로(DB 제약) 진행 중인 사이클은 많아야 하나다.
export function currentCycle(cycles: Cycle[], today: string) {
  return cycles.find((cycle) => cycleStatus(cycle, today) === "active");
}

// 두 날짜 사이의 일수 (to - from)
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

// "3일 남음", "오늘 종료", "5일 후 시작", "종료됨"
export function cycleTiming(cycle: Cycle, today: string) {
  switch (cycleStatus(cycle, today)) {
    case "upcoming": {
      const days = daysBetween(today, cycle.starts_at);
      return days === 1 ? "내일 시작" : `${days}일 후 시작`;
    }
    case "active": {
      const days = daysBetween(today, cycle.ends_at);
      return days === 0 ? "오늘 종료" : `${days}일 남음`;
    }
    case "completed":
      return "종료됨";
  }
}

// "11월 2일 – 11월 15일". 연도가 바뀌는 사이클만 연도를 붙인다.
export function formatCycleRange(cycle: Cycle) {
  const format = (date: string, withYear: boolean) => {
    const [year, month, day] = date.split("-").map(Number);
    return `${withYear ? `${year}년 ` : ""}${month}월 ${day}일`;
  };
  const crossesYear = cycle.starts_at.slice(0, 4) !== cycle.ends_at.slice(0, 4);
  return `${format(cycle.starts_at, crossesYear)} – ${format(cycle.ends_at, crossesYear)}`;
}

// 기간이 겹치는 다른 사이클 (종료일 포함). 저장 전에 폼에서 알려주려는 용도이고, 최종 검사는 DB 제약이 한다.
export function findOverlap(
  cycles: Cycle[],
  range: { starts_at: string; ends_at: string },
  excludeId?: string,
) {
  return cycles.find(
    (cycle) =>
      cycle.id !== excludeId &&
      cycle.starts_at <= range.ends_at &&
      range.starts_at <= cycle.ends_at,
  );
}

// 새 사이클의 기본값: 마지막 사이클 다음 날부터(없으면 오늘부터) 2주, 이름은 "사이클 N".
export function nextCycleDefaults(cycles: Cycle[], today: string) {
  const last = cycles.at(-1);
  const start =
    last && last.ends_at >= today ? addDays(last.ends_at, 1) : today;
  return {
    name: `사이클 ${cycles.length + 1}`,
    starts_at: start,
    ends_at: addDays(start, 13),
  };
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function cyclesPath(projectPath: string) {
  return `${projectPath}/cycles`;
}
