"use client";

import { ChevronDownIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkspaceRole } from "@/lib/api/members";

import { ROLE_META, ROLE_ORDER } from "./role-meta";

export function RoleSelect({
  value,
  onChange,
  disabled,
  label,
}: {
  value: WorkspaceRole;
  onChange: (role: WorkspaceRole) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled}
        render={
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${label}: ${ROLE_META[value].label}`}
          />
        }
      >
        {ROLE_META[value].label}
        <ChevronDownIcon className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-56">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as WorkspaceRole)}
        >
          {ROLE_ORDER.map((role) => (
            <DropdownMenuRadioItem closeOnClick key={role} value={role}>
              <div className="flex flex-col">
                <span>{ROLE_META[role].label}</span>
                <span className="text-xs text-muted-foreground">
                  {ROLE_META[role].description}
                </span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
