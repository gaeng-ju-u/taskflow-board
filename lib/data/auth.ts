import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};

// 요청 하나 안에서는 여러 컴포넌트가 불러도 한 번만 조회한다 (React cache).
// 쿠키를 읽으므로 이 함수를 쓰는 컴포넌트는 <Suspense> 안에 있어야 한다.
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, avatar_url")
    .eq("id", auth.claims.sub)
    .single();

  return {
    id: auth.claims.sub,
    email: auth.claims.email ?? "",
    name: profile?.name || auth.claims.email || "사용자",
    avatarUrl: profile?.avatar_url ?? null,
  };
});
