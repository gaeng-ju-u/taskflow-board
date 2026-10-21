import "server-only";

import { cache } from "react";
import { z } from "zod";

import { listInvitations, listMembers } from "@/lib/api/members";
import { createClient } from "@/lib/supabase/server";

export const getMembers = cache(async (workspaceId: string) =>
  listMembers(await createClient(), workspaceId),
);

export const getInvitations = cache(async (workspaceId: string) =>
  listInvitations(await createClient(), workspaceId),
);

// 초대 수락 화면용. 토큰 형식이 틀리거나 없는 초대면 null.
export const getInvitationByToken = cache(async (token: string) => {
  if (!z.uuid().safeParse(token).success) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_invitation", { invite_token: token })
    .maybeSingle();
  if (error) throw error;
  return data;
});
