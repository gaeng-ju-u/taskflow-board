import { NextResponse, type NextRequest } from "next/server";

import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";

// GitHub OAuth와 매직링크 모두 여기로 돌아온다. PKCE code를 세션으로 교환한다.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  // 링크가 만료됐거나, 매직링크를 요청한 브라우저가 아닌 곳에서 열었을 때
  return NextResponse.redirect(new URL("/login?error=callback", request.url));
}
