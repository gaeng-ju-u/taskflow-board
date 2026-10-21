import type { Tables } from "@/lib/supabase/database.types";

import type { Supabase } from "./projects";

export type WorkspaceRole = Tables<"workspace_members">["role"];

export type Member = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: WorkspaceRole;
  joinedAt: string;
};

// 멤버 화면, 담당자 선택, 아바타 표시가 함께 쓴다. profiles는 같은 워크스페이스 멤버끼리만 보이도록 RLS가 걸려 있다.
export async function listMembers(supabase: Supabase, workspaceId: string) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, created_at, profiles(id, name, avatar_url)")
    .eq("workspace_id", workspaceId)
    .order("created_at");
  if (error) throw error;
  return data.flatMap(({ role, created_at, profiles }): Member[] =>
    profiles
      ? [
          {
            id: profiles.id,
            name: profiles.name,
            avatarUrl: profiles.avatar_url,
            role,
            joinedAt: created_at,
          },
        ]
      : [],
  );
}

export type Invitation = Pick<
  Tables<"invitations">,
  | "id"
  | "workspace_id"
  | "email"
  | "role"
  | "token"
  | "expires_at"
  | "created_at"
>;

export const INVITATION_COLUMNS =
  "id, workspace_id, email, role, token, expires_at, created_at";

// 수락되지 않은 초대만 보여준다. owner만 조회할 수 있다 (RLS). 만료된 초대도 취소할 수 있게 포함한다.
export async function listInvitations(supabase: Supabase, workspaceId: string) {
  const { data, error } = await supabase
    .from("invitations")
    .select(INVITATION_COLUMNS)
    .eq("workspace_id", workspaceId)
    .is("accepted_at", null)
    .order("created_at");
  if (error) throw error;
  return data;
}

export function membersPath(workspaceSlug: string) {
  return `/${workspaceSlug}/settings/members`;
}

export function invitePath(token: string) {
  return `/invite/${token}`;
}
