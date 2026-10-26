"use client";

import {
  ListFilterIcon,
  SearchIcon,
  SlidersHorizontalIcon,
  UserRoundIcon,
  XIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { LabelDot } from "@/components/labels/label-chip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import type { Label } from "@/lib/api/labels";
import type { Member } from "@/lib/api/members";
import {
  activeFilterCount,
  ASSIGNEE_ME,
  ASSIGNEE_NONE,
  CLEARED_FILTERS,
  DEFAULT_FILTERS,
  GROUP_KEYS,
  SORT_KEYS,
  type GroupKey,
  type IssueFilters,
  type SortKey,
} from "@/lib/issue-filters";

import {
  PRIORITY_META,
  PRIORITY_ORDER,
  STATUS_META,
  STATUS_ORDER,
} from "./issue-meta";
import { MemberAvatar } from "./property-selects";

export const SORT_LABELS: Record<SortKey, string> = {
  manual: "직접 정한 순서",
  updated: "최근 수정",
  created: "최근 생성",
  priority: "우선순위",
  number: "번호",
};

export const GROUP_LABELS: Record<GroupKey, string> = {
  status: "상태",
  priority: "우선순위",
  assignee: "담당자",
  label: "라벨",
  none: "그룹 없음",
};

type ListKey = "status" | "priority" | "assignee" | "label";

// 목록과 보드 위의 필터 막대. 정렬·그룹(표시 메뉴)은 목록에서만 쓴다(보드는 칸이 상태, 순서는 드래그).
export function IssueFilterBar({
  filters,
  setFilters,
  members,
  labels,
  currentUserId,
  showDisplayOptions,
  summary,
  actions,
}: {
  filters: IssueFilters;
  setFilters: (patch: Partial<IssueFilters>) => void;
  members: Member[];
  labels: Label[];
  currentUserId: string;
  showDisplayOptions: boolean;
  summary: ReactNode;
  actions: ReactNode;
}) {
  const count = activeFilterCount(filters);

  function toggle<K extends ListKey>(key: K, value: IssueFilters[K][number]) {
    const current = filters[key] as string[];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    setFilters({ [key]: next } as Partial<IssueFilters>);
  }

  const assigneeName = (value: string) =>
    value === ASSIGNEE_ME
      ? "나"
      : value === ASSIGNEE_NONE
        ? "담당자 없음"
        : (members.find((member) => member.id === value)?.name ?? null);

  // 적용 중인 조건을 종류별로 한 칩에 모아 보여준다. 지워진 라벨이나 나간 멤버는 이름이 없어 뺀다.
  const chips: { key: ListKey; title: string; values: string[] }[] = [
    {
      key: "status" as const,
      title: "상태",
      values: filters.status.map((status) => STATUS_META[status].label),
    },
    {
      key: "priority" as const,
      title: "우선순위",
      values: filters.priority.map((p) => PRIORITY_META[p].label),
    },
    {
      key: "assignee" as const,
      title: "담당자",
      values: filters.assignee.flatMap((value) => assigneeName(value) ?? []),
    },
    {
      key: "label" as const,
      title: "라벨",
      values: filters.label.flatMap(
        (id) => labels.find((label) => label.id === id)?.name ?? [],
      ),
    },
  ].filter((chip) => chip.values.length > 0);

  return (
    <div className="flex flex-col gap-2 px-6 pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <ListFilterIcon />
            필터
            {count > 0 && (
              <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {count}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto min-w-40">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>상태</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-40">
                {STATUS_ORDER.map((status) => {
                  const meta = STATUS_META[status];
                  return (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={filters.status.includes(status)}
                      onCheckedChange={() => toggle("status", status)}
                    >
                      <meta.icon className={meta.className} />
                      {meta.label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>우선순위</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-40">
                {PRIORITY_ORDER.map((priority) => {
                  const meta = PRIORITY_META[priority];
                  return (
                    <DropdownMenuCheckboxItem
                      key={priority}
                      checked={filters.priority.includes(priority)}
                      onCheckedChange={() => toggle("priority", priority)}
                    >
                      <meta.icon className={meta.className} />
                      {meta.label}
                    </DropdownMenuCheckboxItem>
                  );
                })}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>담당자</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-80 max-w-64 min-w-40 overflow-y-auto">
                <DropdownMenuCheckboxItem
                  checked={filters.assignee.includes(ASSIGNEE_ME)}
                  onCheckedChange={() => toggle("assignee", ASSIGNEE_ME)}
                >
                  <UserRoundIcon className="text-muted-foreground" />
                  나에게 할당
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.assignee.includes(ASSIGNEE_NONE)}
                  onCheckedChange={() => toggle("assignee", ASSIGNEE_NONE)}
                >
                  <UserRoundIcon className="text-muted-foreground" />
                  담당자 없음
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                {members.map((member) => (
                  <DropdownMenuCheckboxItem
                    key={member.id}
                    checked={filters.assignee.includes(member.id)}
                    onCheckedChange={() => toggle("assignee", member.id)}
                  >
                    <MemberAvatar member={member} />
                    <span className="truncate">
                      {member.name}
                      {member.id === currentUserId && " (나)"}
                    </span>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>라벨</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-80 max-w-64 min-w-40 overflow-y-auto">
                {labels.length === 0 ? (
                  <DropdownMenuItem disabled>라벨이 없습니다</DropdownMenuItem>
                ) : (
                  labels.map((label) => (
                    <DropdownMenuCheckboxItem
                      key={label.id}
                      checked={filters.label.includes(label.id)}
                      onCheckedChange={() => toggle("label", label.id)}
                    >
                      <LabelDot color={label.color} className="mx-1" />
                      <span className="truncate">{label.name}</span>
                    </DropdownMenuCheckboxItem>
                  ))
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>

        <SearchInput value={filters.q} onChange={(q) => setFilters({ q })} />

        {showDisplayOptions && (
          <DisplayMenu
            sort={filters.sort}
            group={filters.group}
            onChange={setFilters}
          />
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{summary}</span>
          {actions}
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex h-6 max-w-full items-center gap-1 rounded-md border bg-muted/40 pr-0.5 pl-2 text-xs"
            >
              <span className="text-muted-foreground">{chip.title}:</span>
              <span className="truncate">{chip.values.join(", ")}</span>
              <button
                type="button"
                aria-label={`${chip.title} 필터 해제`}
                onClick={() => setFilters({ [chip.key]: [] })}
                className="flex size-5 items-center justify-center rounded text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ))}
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setFilters(CLEARED_FILTERS)}
          >
            초기화
          </Button>
        </div>
      )}
    </div>
  );
}

// 입력값은 이 컴포넌트가 들고 있고, 바뀔 때마다 URL에 쓴다. URL을 거쳐 값을 다시 받으면
// 한글을 조합하는 중에 입력값이 바뀌어 조합이 끊길 수 있다.
function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [text, setText] = useState(value);
  // 초기화 버튼 등으로 URL의 값이 바깥에서 바뀌면 입력칸도 맞춘다.
  const [synced, setSynced] = useState(value);
  if (value !== synced) {
    setSynced(value);
    if (value.trim() !== text.trim()) setText(value);
  }

  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        aria-label="제목 검색"
        placeholder="제목 검색"
        maxLength={200}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          onChange(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape" && text) {
            setText("");
            onChange("");
          }
        }}
        className="h-7 w-40 pl-7 text-sm sm:w-52"
      />
    </div>
  );
}

function DisplayMenu({
  sort,
  group,
  onChange,
}: {
  sort: SortKey;
  group: GroupKey;
  onChange: (patch: Partial<IssueFilters>) => void;
}) {
  const changed =
    sort !== DEFAULT_FILTERS.sort || group !== DEFAULT_FILTERS.group;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />}>
        <SlidersHorizontalIcon />
        표시
        {changed && (
          <span
            aria-label="기본값에서 바뀜"
            className="size-1.5 rounded-full bg-primary"
          />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto min-w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>정렬</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sort}
            onValueChange={(value) => onChange({ sort: value as SortKey })}
          >
            {SORT_KEYS.map((key) => (
              <DropdownMenuRadioItem closeOnClick key={key} value={key}>
                {SORT_LABELS[key]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>그룹</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={group}
            onValueChange={(value) => onChange({ group: value as GroupKey })}
          >
            {GROUP_KEYS.map((key) => (
              <DropdownMenuRadioItem closeOnClick key={key} value={key}>
                {GROUP_LABELS[key]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
