"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LABEL_COLORS } from "@/lib/api/labels";

import { LabelDot } from "./label-chip";

// 미리 정한 라벨 색 중에서 고른다. 고르면 닫는다.
export function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (color: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const current = LABEL_COLORS.find((color) => color.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`${label}: ${current?.name ?? value}`}
            title={current?.name}
          />
        }
      >
        <LabelDot color={value} className="size-3" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <div role="group" aria-label={label} className="grid grid-cols-5 gap-1">
          {LABEL_COLORS.map((color) => (
            <button
              key={color.value}
              type="button"
              aria-label={color.name}
              aria-pressed={color.value === value}
              title={color.name}
              onClick={() => {
                onChange(color.value);
                setOpen(false);
              }}
              className="flex size-7 items-center justify-center rounded-md outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {/* 체크는 테마 배경이 아니라 라벨 색 위에 그려지므로 테마와 관계없이 흰색이 맞다. */}
              <span
                className="flex size-4 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: color.value }}
              >
                {color.value === value && (
                  <CheckIcon className="size-3" strokeWidth={3} />
                )}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
