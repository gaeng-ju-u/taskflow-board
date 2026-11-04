"use client";

import { IterationCwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cycleStatus, type Cycle } from "@/lib/api/cycles";
import { todayInSeoul } from "@/lib/date";
import { useNow } from "@/hooks/use-now";

// 라디오 그룹은 null 값을 가질 수 없어서 "사이클 없음"을 빈 문자열로 표현한다.
const NO_CYCLE = "";

// 이슈의 사이클 선택. 끝난 사이클은 후보에서 빼되, 지금 배정된 사이클은 끝났어도 보여준다.
// 하나만 고르는 메뉴라 고르면 닫는다 (closeOnClick).
export function CycleSelect({
  value,
  cycles,
  onChange,
}: {
  value: string | null;
  cycles: Cycle[];
  onChange: (cycleId: string | null) => void;
}) {
  const today = todayInSeoul(useNow());
  const selected = cycles.find((cycle) => cycle.id === value);
  const options = cycles.filter(
    (cycle) => cycle.id === value || cycleStatus(cycle, today) !== "completed",
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="max-w-full min-w-0 justify-start"
            aria-label={selected ? `사이클: ${selected.name}` : "사이클 지정"}
          />
        }
      >
        <IterationCwIcon className="text-muted-foreground" />
        {selected ? (
          <span className="truncate">{selected.name}</span>
        ) : (
          <span className="text-muted-foreground">사이클 없음</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-auto max-w-64 min-w-44">
        <DropdownMenuRadioGroup
          value={value ?? NO_CYCLE}
          onValueChange={(next) =>
            onChange(next === NO_CYCLE ? null : (next as string))
          }
        >
          <DropdownMenuRadioItem closeOnClick value={NO_CYCLE}>
            사이클 없음
          </DropdownMenuRadioItem>
          {options.map((cycle) => (
            <DropdownMenuRadioItem closeOnClick key={cycle.id} value={cycle.id}>
              <span className="truncate">{cycle.name}</span>
              {cycleStatus(cycle, today) === "active" && (
                <span className="ml-auto pl-2 text-xs text-indigo-500">
                  현재
                </span>
              )}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
