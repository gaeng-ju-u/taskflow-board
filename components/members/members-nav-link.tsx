"use client";

import { UsersIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";

import { membersPath } from "@/lib/api/members";

export function MembersNavLink({ workspaceSlug }: { workspaceSlug: string }) {
  const href = membersPath(workspaceSlug);
  const active = usePathname() === href;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-sidebar-accent",
        active && "bg-sidebar-accent font-medium",
      )}
    >
      <UsersIcon className="size-4 text-muted-foreground" />
      멤버
    </Link>
  );
}
