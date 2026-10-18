"use client";

import { KanbanIcon, ListIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "cn";

export function ProjectTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: basePath, label: "목록", icon: ListIcon },
    { href: `${basePath}/board`, label: "보드", icon: KanbanIcon },
  ];

  return (
    <nav aria-label="보기" className="flex gap-1">
      {tabs.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground",
              active && "bg-muted font-medium text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
