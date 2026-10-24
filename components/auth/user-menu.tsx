"use client";

import { LogOutIcon, TagIcon, UsersIcon } from "lucide-react";
import Link from "next/link";

import { signOut } from "@/app/(app)/actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { labelsPath } from "@/lib/api/labels";
import { membersPath } from "@/lib/api/members";
import type { CurrentUser } from "@/lib/data/auth";

export function UserMenu({
  user,
  workspaceSlug,
}: {
  user: CurrentUser;
  workspaceSlug: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label="계정 메뉴"
          />
        }
      >
        <Avatar className="size-7">
          {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
          <AvatarFallback>{user.name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <div className="truncate font-medium text-foreground">
              {user.name}
            </div>
            <div className="truncate text-xs font-normal">{user.email}</div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={membersPath(workspaceSlug)} />}>
          <UsersIcon />
          멤버
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href={labelsPath(workspaceSlug)} />}>
          <TagIcon />
          라벨
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOut()}>
          <LogOutIcon />
          로그아웃
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
