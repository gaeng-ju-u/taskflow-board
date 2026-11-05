"use client";

import type { Invitation, Member } from "@/lib/api/members";
import { useMembers } from "@/lib/queries/members";

import { InvitationSection } from "./invitation-section";
import { MemberList } from "./member-list";

// 역할은 멤버 캐시에서 계산한다. 내 역할을 바꾸면 초대 영역과 관리 버튼이 바로 사라지거나 나타난다.
// 화면에서 숨기는 것은 UX용이고, 실제 권한은 RLS가 보장한다.
export function MemberSettings({
  workspaceId,
  currentUserId,
  initialMembers,
  initialInvitations,
  isDemo,
}: {
  workspaceId: string;
  currentUserId: string;
  isDemo: boolean;
  initialMembers: Member[];
  initialInvitations: Invitation[] | undefined;
}) {
  const { data: members = initialMembers } = useMembers(
    workspaceId,
    initialMembers,
  );
  // 데모 계정은 owner지만 멤버 관리(초대, 역할, 내보내기, 나가기)를 할 수 없다 (DB 트리거가 막는다).
  const isOwner =
    !isDemo &&
    members.some(
      (member) => member.id === currentUserId && member.role === "owner",
    );

  return (
    <div className="space-y-8">
      {isDemo && (
        <p className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          데모 계정에서는 멤버 초대, 역할 변경, 내보내기를 할 수 없습니다. 내
          계정으로 로그인하면 팀원을 초대할 수 있습니다.
        </p>
      )}
      {isOwner && (
        <InvitationSection
          workspaceId={workspaceId}
          initialInvitations={initialInvitations}
        />
      )}
      <MemberList
        workspaceId={workspaceId}
        members={members}
        currentUserId={currentUserId}
        isOwner={isOwner}
        canLeave={!isDemo}
      />
    </div>
  );
}
