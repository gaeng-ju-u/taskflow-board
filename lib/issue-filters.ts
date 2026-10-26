import { z } from "zod";

import type { Issue, IssuePriority, IssueStatus } from "@/lib/api/issues";
import { Constants } from "@/lib/supabase/database.types";

// 목록·보드의 필터, 정렬, 그룹 상태. URL search params에 저장한다(CLAUDE.md).
// 예: ?status=todo,in_progress&assignee=me,none&label=<id>&q=로그인&sort=updated&group=priority

export const SORT_KEYS = [
  "manual",
  "updated",
  "created",
  "priority",
  "number",
] as const;
export const GROUP_KEYS = [
  "status",
  "priority",
  "assignee",
  "label",
  "none",
] as const;

export type SortKey = (typeof SORT_KEYS)[number];
export type GroupKey = (typeof GROUP_KEYS)[number];

// 담당자 필터의 특수 값. 'me'는 보는 사람 자신이라, 링크를 공유하면 받은 사람의 이슈가 보인다.
export const ASSIGNEE_ME = "me";
export const ASSIGNEE_NONE = "none";

export type IssueFilters = {
  status: IssueStatus[];
  priority: IssuePriority[];
  assignee: string[];
  label: string[];
  q: string;
  sort: SortKey;
  group: GroupKey;
};

export const DEFAULT_FILTERS: IssueFilters = {
  status: [],
  priority: [],
  assignee: [],
  label: [],
  q: "",
  sort: "manual",
  group: "status",
};

// 쉼표로 구분한 값 중 스키마에 맞는 것만 남긴다. URL을 손으로 고쳐 잘못된 값이 들어와도 무시한다.
function list<T>(raw: string | null, item: z.ZodType<T>): T[] {
  if (!raw) return [];
  const values = raw.split(",").flatMap((value) => {
    const parsed = item.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
  return [...new Set(values)];
}

const statusSchema = z.enum(Constants.public.Enums.issue_status);
const prioritySchema = z.enum(Constants.public.Enums.issue_priority);
// id는 형식(8-4-4-4-12 16진수)만 본다. z.uuid()는 RFC 버전 자리까지 검사해서, 시드 데이터처럼
// 버전 자리가 0인 고정 id를 버린다. 실제로 있는 멤버·라벨인지는 filterIssues에서 따로 대조한다.
const idSchema = z.guid();
const assigneeSchema = z.union([
  z.literal(ASSIGNEE_ME),
  z.literal(ASSIGNEE_NONE),
  idSchema,
]);

export function parseIssueFilters(params: URLSearchParams): IssueFilters {
  const sort = z.enum(SORT_KEYS).safeParse(params.get("sort"));
  const group = z.enum(GROUP_KEYS).safeParse(params.get("group"));
  return {
    status: list(params.get("status"), statusSchema),
    priority: list(params.get("priority"), prioritySchema),
    assignee: list(params.get("assignee"), assigneeSchema),
    label: list(params.get("label"), idSchema),
    q: (params.get("q") ?? "").slice(0, 200),
    sort: sort.success ? sort.data : DEFAULT_FILTERS.sort,
    group: group.success ? group.data : DEFAULT_FILTERS.group,
  };
}

// 기본값과 빈 조건은 쓰지 않아 주소를 짧게 유지한다. 필터와 관계없는 다른 파라미터는 그대로 둔다.
export function writeIssueFilters(
  base: URLSearchParams,
  filters: IssueFilters,
): URLSearchParams {
  const params = new URLSearchParams(base);
  const set = (key: string, value: string) =>
    value ? params.set(key, value) : params.delete(key);
  set("status", filters.status.join(","));
  set("priority", filters.priority.join(","));
  set("assignee", filters.assignee.join(","));
  set("label", filters.label.join(","));
  set("q", filters.q.trim());
  set("sort", filters.sort === DEFAULT_FILTERS.sort ? "" : filters.sort);
  set("group", filters.group === DEFAULT_FILTERS.group ? "" : filters.group);
  return params;
}

// 필터 조건만 비운다. 정렬·그룹은 보기 설정이라 유지한다.
export const CLEARED_FILTERS = {
  status: [],
  priority: [],
  assignee: [],
  label: [],
  q: "",
} satisfies Partial<IssueFilters>;

export function activeFilterCount(filters: IssueFilters) {
  return (
    filters.status.length +
    filters.priority.length +
    filters.assignee.length +
    filters.label.length +
    (filters.q.trim() ? 1 : 0)
  );
}

// 같은 종류 안에서는 "또는", 종류끼리는 "그리고"로 묶는다.
// labelIds: 지금 있는 라벨 id. 지워진 라벨이 URL에 남아 있으면 그 조건은 무시한다.
export function filterIssues(
  issues: Issue[],
  filters: IssueFilters,
  context: { currentUserId: string; labelIds: Set<string> },
): Issue[] {
  const assignees = new Set(
    filters.assignee.map((value) =>
      value === ASSIGNEE_ME ? context.currentUserId : value,
    ),
  );
  const labels = filters.label.filter((id) => context.labelIds.has(id));
  const keyword = filters.q.trim().toLowerCase();

  return issues.filter((issue) => {
    if (filters.status.length && !filters.status.includes(issue.status))
      return false;
    if (filters.priority.length && !filters.priority.includes(issue.priority))
      return false;
    if (assignees.size && !assignees.has(issue.assignee_id ?? ASSIGNEE_NONE))
      return false;
    if (
      labels.length &&
      !issue.issue_labels.some((item) => labels.includes(item.label_id))
    )
      return false;
    if (keyword && !issue.title.toLowerCase().includes(keyword)) return false;
    return true;
  });
}

const STATUS_RANK: Record<IssueStatus, number> = {
  in_progress: 0,
  todo: 1,
  backlog: 2,
  done: 3,
  canceled: 4,
};
const PRIORITY_RANK: Record<IssuePriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

// manual은 보드와 같은 순서다. sort_order는 상태 칸 안의 순서라, 상태가 섞인 그룹에서는 상태 순서를 먼저 본다.
export function sortIssues(issues: Issue[], sort: SortKey): Issue[] {
  const byManual = (a: Issue, b: Issue) =>
    STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
    a.sort_order - b.sort_order;
  const compare: Record<SortKey, (a: Issue, b: Issue) => number> = {
    manual: byManual,
    updated: (a, b) => b.updated_at.localeCompare(a.updated_at),
    created: (a, b) => b.created_at.localeCompare(a.created_at),
    priority: (a, b) =>
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || byManual(a, b),
    // 저장 전(번호 0) 이슈는 곧 가장 큰 번호를 받으므로 맨 뒤에 둔다.
    number: (a, b) => (a.number || Infinity) - (b.number || Infinity),
  };
  return [...issues].sort(compare[sort]);
}
