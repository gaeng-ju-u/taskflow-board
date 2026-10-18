"use client";

import { UserRoundIcon } from "lucide-react";

import { cn } from "cn";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { IssuePriority, IssueStatus, Member } from "@/lib/api/issues";

import {
  PRIORITY_META,
  PRIORITY_ORDER,
  STATUS_META,
  STATUS_ORDER,
} from "./issue-meta";

// 메뉴 너비는 기본값(트리거 버튼 너비)을 쓰지 않는다. 아이콘만 있는 버튼에서 열면 메뉴가 좁아져
// "담당자 없음"이 줄바꿈되기 때문이다. 내용에 맞추되 너무 긴 이름은 한 줄에서 말줄임한다.
const MENU_WIDTH = "w-auto min-w-40 max-w-64";

// 하나만 고르는 메뉴라 고르면 닫는다 (Base UI 라디오 항목의 closeOnClick 기본값은 false).

// 목록 행에서는 아이콘만(compact), 상세·생성 화면에서는 아이콘과 이름을 함께 보여준다.
type SelectProps<T> = {
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
};

function triggerButton(compact: boolean | undefined, label: string) {
  return (
    <Button
      variant="ghost"
      size={compact ? "icon-sm" : "sm"}
      aria-label={label}
      className={cn(!compact && "justify-start")}
    />
  );
}

export function StatusSelect({
  value,
  onChange,
  compact,
}: SelectProps<IssueStatus>) {
  const meta = STATUS_META[value];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={triggerButton(compact, `상태: ${meta.label}`)}
      >
        <meta.icon className={meta.className} />
        {!compact && meta.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={MENU_WIDTH}>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as IssueStatus)}
        >
          {STATUS_ORDER.map((status) => {
            const item = STATUS_META[status];
            return (
              <DropdownMenuRadioItem closeOnClick key={status} value={status}>
                <item.icon className={item.className} />
                <span className="truncate">{item.label}</span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PrioritySelect({
  value,
  onChange,
  compact,
}: SelectProps<IssuePriority>) {
  const meta = PRIORITY_META[value];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={triggerButton(compact, `우선순위: ${meta.label}`)}
      >
        <meta.icon className={meta.className} />
        {!compact && meta.label}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className={MENU_WIDTH}>
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as IssuePriority)}
        >
          {PRIORITY_ORDER.map((priority) => {
            const item = PRIORITY_META[priority];
            return (
              <DropdownMenuRadioItem
                closeOnClick
                key={priority}
                value={priority}
              >
                <item.icon className={item.className} />
                <span className="truncate">{item.label}</span>
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MemberAvatar({
  member,
  className,
}: {
  member: Member;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-5", className)}>
      {member.avatarUrl && <AvatarImage src={member.avatarUrl} alt="" />}
      <AvatarFallback className="text-[10px]">
        {member.name.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}

// 라디오 그룹은 null 값을 가질 수 없어서 "담당자 없음"을 빈 문자열로 표현한다.
const UNASSIGNED = "";

export function AssigneeSelect({
  value,
  onChange,
  members,
  compact,
}: SelectProps<string | null> & { members: Member[] }) {
  const assignee = members.find((member) => member.id === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={triggerButton(compact, `담당자: ${assignee?.name ?? "없음"}`)}
      >
        {assignee ? (
          <MemberAvatar member={assignee} />
        ) : (
          <UserRoundIcon className="text-muted-foreground" />
        )}
        {!compact && (assignee?.name ?? "담당자 없음")}
      </DropdownMenuTrigger>
      {/* 목록 행에서는 담당자 버튼이 오른쪽 끝에 있어서 왼쪽 기준으로 열면 화면 밖으로 나간다. */}
      <DropdownMenuContent
        align={compact ? "end" : "start"}
        className={MENU_WIDTH}
      >
        <DropdownMenuRadioGroup
          value={value ?? UNASSIGNED}
          onValueChange={(next) =>
            onChange(next === UNASSIGNED ? null : (next as string))
          }
        >
          <DropdownMenuRadioItem closeOnClick value={UNASSIGNED}>
            <UserRoundIcon className="text-muted-foreground" />
            <span className="truncate">담당자 없음</span>
          </DropdownMenuRadioItem>
          {members.map((member) => (
            <DropdownMenuRadioItem
              closeOnClick
              key={member.id}
              value={member.id}
            >
              <MemberAvatar member={member} />
              <span className="truncate">{member.name}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
