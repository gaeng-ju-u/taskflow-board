"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { useId, useState } from "react";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  formatIssueRef,
  selfAndDescendantIds,
  type Issue,
} from "@/lib/api/issues";
import { PENDING_NUMBER } from "@/lib/queries/issues";

import { STATUS_META } from "./issue-meta";

type Option = { kind: "none" } | { kind: "issue"; issue: Issue };

// 상위 이슈 선택 창. 번호·제목으로 검색해야 해서 드롭다운 메뉴 대신 Popover를 쓴다 (label-picker.tsx 참고).
// 자기 자신과 하위 이슈는 후보에서 뺀다. 고르면 순환이 되어 DB가 거부한다.
export function ParentIssuePicker({
  issue,
  issues,
  projectKey,
  onChange,
}: {
  issue: Issue;
  issues: Issue[];
  projectKey: string;
  onChange: (parentId: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();

  const parent = issue.parent_id
    ? issues.find((item) => item.id === issue.parent_id)
    : undefined;
  const excluded = selfAndDescendantIds(issues, issue.id);
  const keyword = query.trim().toLowerCase();
  const matches = issues.filter(
    (item) =>
      !excluded.has(item.id) &&
      item.number !== PENDING_NUMBER &&
      (item.title.toLowerCase().includes(keyword) ||
        formatIssueRef(projectKey, item.number)
          .toLowerCase()
          .includes(keyword)),
  );
  const options: Option[] = [
    ...(issue.parent_id && !keyword ? [{ kind: "none" } as const] : []),
    ...matches.map((item): Option => ({ kind: "issue", issue: item })),
  ];
  const activeIndex = Math.min(active, options.length - 1);

  function close() {
    setOpen(false);
    setQuery("");
    setActive(0);
  }

  function choose(option: Option) {
    const next = option.kind === "issue" ? option.issue.id : null;
    if (next !== issue.parent_id) onChange(next);
    close();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // 한글 조합 중의 Enter는 조합을 끝내는 키다. 여기서 처리하면 마지막 글자가 남거나 두 번 입력된다.
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => (next ? setOpen(true) : close())}
    >
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="max-w-full min-w-0 justify-start"
            aria-label={
              parent
                ? `상위 이슈: ${formatIssueRef(projectKey, parent.number)}`
                : "상위 이슈 지정"
            }
          />
        }
      >
        {parent ? (
          <>
            <span className="font-mono text-xs text-muted-foreground">
              {formatIssueRef(projectKey, parent.number)}
            </span>
            <span className="truncate">{parent.title}</span>
          </>
        ) : (
          <span className="text-muted-foreground">없음</span>
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 gap-1 p-1">
        <input
          aria-label="상위 이슈 검색"
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={
            options.length > 0 ? `${listId}-${activeIndex}` : undefined
          }
          autoFocus
          value={query}
          placeholder="번호 또는 제목으로 검색"
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={handleKeyDown}
          className="h-8 w-full rounded-md bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="-mx-1 border-t" />
        <ul
          id={listId}
          role="listbox"
          aria-label="상위 이슈"
          className="max-h-64 overflow-y-auto"
        >
          {options.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">
              고를 수 있는 이슈가 없습니다.
            </li>
          )}
          {options.map((option, index) => {
            const meta =
              option.kind === "issue" ? STATUS_META[option.issue.status] : null;
            return (
              <li
                key={option.kind === "issue" ? option.issue.id : "none"}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={
                  option.kind === "issue" && option.issue.id === issue.parent_id
                }
                // 입력칸 포커스를 유지한 채 고른다 (mousedown에서 포커스가 옮겨 가지 않게).
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
                onMouseMove={() => setActive(index)}
                className={cn(
                  "flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-sm",
                  index === activeIndex && "bg-accent text-accent-foreground",
                )}
              >
                {option.kind === "none" ? (
                  <>
                    <XIcon className="size-4 text-muted-foreground" />
                    <span className="flex-1">상위 이슈 해제</span>
                  </>
                ) : (
                  <>
                    {meta && (
                      <meta.icon className={cn("size-4", meta.className)} />
                    )}
                    <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
                      {formatIssueRef(projectKey, option.issue.number)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {option.issue.title}
                    </span>
                    {option.issue.id === issue.parent_id && (
                      <CheckIcon className="size-4" />
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
