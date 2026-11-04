"use client";

import { IterationCwIcon, KanbanIcon, ListIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "cn";

// 목록·보드 탭을 오갈 때 필터가 유지되도록 현재 쿼리(필터·정렬·그룹)를 링크에 붙인다.
// 사이클 탭에는 붙이지 않는다 (이슈 필터와 관계없는 화면).
// useSearchParams를 쓰므로 <Suspense> 안에 둔다 (프로젝트 layout의 ProjectHeader).
export function ProjectTabs({ basePath }: { basePath: string }) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const tabs = [
    { href: basePath, label: "목록", icon: ListIcon, keepQuery: true },
    {
      href: `${basePath}/board`,
      label: "보드",
      icon: KanbanIcon,
      keepQuery: true,
    },
    {
      href: `${basePath}/cycles`,
      label: "사이클",
      icon: IterationCwIcon,
      keepQuery: false,
    },
  ];

  return (
    <nav aria-label="보기" className="flex gap-1">
      {tabs.map(({ href, label, icon: Icon, keepQuery }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={query && keepQuery ? `${href}?${query}` : href}
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
