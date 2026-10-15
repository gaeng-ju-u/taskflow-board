import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// 로그인 직후의 목적지를 정한다. 속한 워크스페이스가 있으면 그곳으로, 없으면 생성 화면으로 보낸다.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth) return NextResponse.redirect(new URL("/login", request.url));

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("workspaces(slug)")
    .eq("user_id", auth.claims.sub)
    .order("created_at")
    .limit(1)
    .maybeSingle();

  const slug = membership?.workspaces?.slug;
  return NextResponse.redirect(
    new URL(slug ? `/${slug}` : "/onboarding", request.url),
  );
}
