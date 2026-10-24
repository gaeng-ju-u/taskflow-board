"use client";

import { TagIcon, UsersIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";

import { labelsPath } from "@/lib/api/labels";
import { membersPath } from "@/lib/api/members";

// 사이드바 아래쪽의 워크스페이스 설정 링크
export function SettingsNav({ workspaceSlug }: { workspaceSlug: string }) {
  return (
    <nav aria-label="워크스페이스 설정" className="flex flex-col gap-0.5">
      <SettingsLink
        href={membersPath(workspaceSlug)}
        icon={UsersIcon}
        label="멤버"
      />
      <SettingsLink
        href={labelsPath(workspaceSlug)}
        icon={TagIcon}
        label="라벨"
      />
    </nav>
  );
}

function SettingsLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
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
      <Icon className="size-4 text-muted-foreground" />
      {label}
    </Link>
  );
}
