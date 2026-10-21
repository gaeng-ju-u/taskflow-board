"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

export type AcceptInvitationState = { message?: string };

export async function acceptInvitation(
  _prev: AcceptInvitationState,
  formData: FormData,
): Promise<AcceptInvitationState> {
  const token = z.uuid().safeParse(formData.get("token"));
  if (!token.success) return { message: "유효하지 않은 초대입니다." };

  const supabase = await createClient();
  const { data: slug, error } = await supabase.rpc("accept_invitation", {
    invite_token: token.data,
  });

  if (error) {
    return {
      message:
        error.code === "22023"
          ? "초대가 만료되었거나 취소되었습니다. 새 초대를 요청하세요."
          : "초대를 수락하지 못했습니다. 다시 시도하세요.",
    };
  }
  redirect(`/${slug}`);
}

// 다른 계정으로 로그인되어 있을 때. 로그아웃한 뒤 로그인하면 초대 화면으로 돌아온다.
export async function switchAccount(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(`/login?next=${encodeURIComponent(next)}`);
}
