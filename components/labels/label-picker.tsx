"use client";

import { CheckIcon, PlusIcon } from "lucide-react";
import { useId, useState, type ReactElement } from "react";

import { cn } from "cn";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Label } from "@/lib/api/labels";
import { labelNameSchema } from "@/lib/validations/label";

import { LabelDot } from "./label-chip";

type Option =
  | { kind: "label"; label: Label; selected: boolean }
  | { kind: "create"; name: string };

// 여러 개를 고르는 라벨 선택 창. 검색칸이 필요해 드롭다운 메뉴 대신 Popover를 쓴다
// (Base UI Menu 안의 입력칸은 메뉴의 글자 단축키와 충돌한다). 고른 뒤에도 닫지 않아 여러 개를 이어서 고를 수 있다.
export function LabelPicker({
  labels,
  selectedIds,
  onToggle,
  onCreate,
  trigger,
  align = "start",
}: {
  labels: Label[];
  selectedIds: Set<string>;
  onToggle: (labelId: string, attach: boolean) => void;
  onCreate: (name: string) => void;
  trigger: ReactElement;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listId = useId();

  const keyword = query.trim();
  const matches = labels.filter((label) =>
    label.name.toLowerCase().includes(keyword.toLowerCase()),
  );
  const exact = labels.some(
    (label) => label.name.toLowerCase() === keyword.toLowerCase(),
  );
  const canCreate = labelNameSchema.safeParse(keyword).success && !exact;
  const options: Option[] = [
    ...matches.map((label): Option => ({
      kind: "label",
      label,
      selected: selectedIds.has(label.id),
    })),
    ...(canCreate ? [{ kind: "create", name: keyword } as const] : []),
  ];
  const activeIndex = Math.min(active, options.length - 1);

  function choose(option: Option) {
    if (option.kind === "label") {
      onToggle(option.label.id, !option.selected);
    } else {
      onCreate(option.name);
      setQuery("");
    }
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
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setQuery("");
          setActive(0);
        }
      }}
    >
      <PopoverTrigger render={trigger} />
      <PopoverContent align={align} className="w-60 gap-1 p-1">
        <input
          aria-label="라벨 검색 또는 새 라벨 이름"
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={
            options.length > 0 ? `${listId}-${activeIndex}` : undefined
          }
          autoFocus
          maxLength={30}
          value={query}
          placeholder="라벨 검색 또는 만들기"
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
          aria-multiselectable
          aria-label="라벨"
          className="max-h-64 overflow-y-auto"
        >
          {options.length === 0 && (
            <li className="px-2 py-1.5 text-sm text-muted-foreground">
              {labels.length === 0
                ? "라벨이 없습니다. 이름을 입력해 만드세요."
                : "일치하는 라벨이 없습니다."}
            </li>
          )}
          {options.map((option, index) => (
            <li
              key={option.kind === "label" ? option.label.id : "create"}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option.kind === "label" && option.selected}
              // 입력칸 포커스를 유지한 채 고른다 (mousedown에서 포커스가 옮겨 가지 않게).
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(option)}
              onMouseMove={() => setActive(index)}
              className={cn(
                "flex h-8 cursor-default items-center gap-2 rounded-md px-2 text-sm",
                index === activeIndex && "bg-accent text-accent-foreground",
              )}
            >
              {option.kind === "label" ? (
                <>
                  <LabelDot color={option.label.color} />
                  <span className="min-w-0 flex-1 truncate">
                    {option.label.name}
                  </span>
                  {option.selected && <CheckIcon className="size-4" />}
                </>
              ) : (
                <>
                  <PlusIcon className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">
                    &apos;{option.name}&apos; 라벨 만들기
                  </span>
                </>
              )}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
