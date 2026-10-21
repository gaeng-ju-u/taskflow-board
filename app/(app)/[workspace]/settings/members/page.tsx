import type { Metadata } from "next";
import { Suspense } from "react";

import { MemberSettings } from "@/components/members/member-settings";
import { getCurrentUser } from "@/lib/data/auth";
import { getInvitations, getMembers } from "@/lib/data/members";
import { getWorkspaceBySlug } from "@/lib/data/workspaces";

export const metadata: Metadata = { title: "멤버 | TaskFlow Board" };

export default function MembersPage({
  params,
}: PageProps<"/[workspace]/settings/members">) {
  return (
    <main className="flex flex-1 flex-col p-6">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold">멤버</h1>
          <p className="text-sm text-muted-foreground">
            워크스페이스 멤버와 역할을 관리합니다.
          </p>
        </div>
        <Suspense
          fallback={
            <div className="divide-y rounded-lg border">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <div className="size-8 animate-pulse rounded-full bg-muted" />
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          }
        >
          <MembersContent params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function MembersContent({
  params,
}: {
  params: PageProps<"/[workspace]/settings/members">["params"];
}) {
  const { workspace: slug } = await params;
  const [workspace, user] = await Promise.all([
    getWorkspaceBySlug(slug),
    getCurrentUser(),
  ]);
  const members = await getMembers(workspace.id);
  const isOwner = members.some(
    (member) => member.id === user.id && member.role === "owner",
  );
  // 초대 목록은 owner만 조회할 수 있다 (RLS). member에게는 요청하지 않는다.
  const invitations = isOwner ? await getInvitations(workspace.id) : undefined;

  return (
    <MemberSettings
      workspaceId={workspace.id}
      currentUserId={user.id}
      initialMembers={members}
      initialInvitations={invitations}
    />
  );
}
