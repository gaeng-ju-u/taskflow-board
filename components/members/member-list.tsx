"use client";

import { LogOutIcon, UserMinusIcon } from "lucide-react";
import { useState } from "react";

import { MemberAvatar } from "@/components/issues/property-selects";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Member } from "@/lib/api/members";
import { formatDate } from "@/lib/date";
import { useRemoveMember, useUpdateMemberRole } from "@/lib/queries/members";

import { ROLE_META } from "./role-meta";
import { RoleSelect } from "./role-select";

export function MemberList({
  workspaceId,
  members,
  currentUserId,
  isOwner,
}: {
  workspaceId: string;
  members: Member[];
  currentUserId: string;
  isOwner: boolean;
}) {
  const updateRole = useUpdateMemberRole(workspaceId);
  const removeMember = useRemoveMember(workspaceId, {
    // 나간 워크스페이스의 쿼리 캐시가 남지 않도록 문서를 새로 불러온다. /auth/continue(Route Handler)가
    // 남은 워크스페이스나 생성 화면으로 보낸다.
    onRemoved: (userId) => {
      if (userId === currentUserId)
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- 캐시를 버리려고 의도적으로 전체 이동
        window.location.assign("/auth/continue");
    },
  });

  // 마지막 관리자는 역할을 낮추거나 나갈 수 없다 (DB 트리거가 최종 방어선).
  const ownerCount = members.filter((member) => member.role === "owner").length;

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">
        멤버{" "}
        <span className="font-normal text-muted-foreground">
          {members.length}
        </span>
      </h2>
      <ul className="divide-y rounded-lg border">
        {members.map((member) => {
          const isMe = member.id === currentUserId;
          const isLastOwner = member.role === "owner" && ownerCount === 1;
          return (
            <li key={member.id} className="flex items-center gap-3 px-4 py-3">
              <MemberAvatar member={member} className="size-8" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {member.name}
                  {isMe && (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      (나)
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(member.joinedAt)} 참여
                </p>
              </div>

              {isOwner ? (
                <RoleSelect
                  label={`${member.name} 역할`}
                  value={member.role}
                  disabled={isLastOwner}
                  onChange={(role) => {
                    if (role !== member.role)
                      updateRole.mutate({ userId: member.id, role });
                  }}
                />
              ) : (
                <span className="px-2.5 text-[0.8rem] text-muted-foreground">
                  {ROLE_META[member.role].label}
                </span>
              )}

              {isMe ? (
                <ConfirmButton
                  label="워크스페이스 나가기"
                  icon={<LogOutIcon />}
                  disabled={isLastOwner}
                  title="워크스페이스에서 나갈까요?"
                  description="맡은 이슈의 담당이 해제됩니다. 다시 참여하려면 새 초대가 필요합니다."
                  confirmLabel="나가기"
                  onConfirm={() => removeMember.mutate(member.id)}
                />
              ) : (
                isOwner && (
                  <ConfirmButton
                    label={`${member.name} 내보내기`}
                    icon={<UserMinusIcon />}
                    title={`${member.name}님을 내보낼까요?`}
                    description="맡은 이슈의 담당이 해제됩니다. 다시 참여하려면 새 초대가 필요합니다."
                    confirmLabel="내보내기"
                    onConfirm={() => removeMember.mutate(member.id)}
                  />
                )
              )}
            </li>
          );
        })}
      </ul>
      {isOwner && ownerCount === 1 && (
        <p className="text-xs text-muted-foreground">
          관리자가 한 명뿐이면 그 관리자의 역할을 바꾸거나 나갈 수 없습니다.
          다른 멤버를 관리자로 지정하세요.
        </p>
      )}
    </section>
  );
}

function ConfirmButton({
  label,
  icon,
  disabled,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        title={label}
        disabled={disabled}
        className="text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        {icon}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                onConfirm();
                setOpen(false);
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
