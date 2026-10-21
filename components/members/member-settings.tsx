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
}: {
  workspaceId: string;
  currentUserId: string;
  initialMembers: Member[];
  initialInvitations: Invitation[] | undefined;
}) {
  const { data: members = initialMembers } = useMembers(
    workspaceId,
    initialMembers,
  );
  const isOwner = members.some(
    (member) => member.id === currentUserId && member.role === "owner",
  );

  return (
    <div className="space-y-8">
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
      />
    </div>
  );
}
