import { NextResponse, type NextRequest } from "next/server";

import { AFTER_LOGIN_PATH } from "@/lib/auth/redirect";
import { updateSession } from "@/lib/supabase/proxy";

// 로그인 없이 볼 수 있는 경로. 나머지는 로그인이 필요하다.
function isPublicPath(pathname: string) {
  return (
    pathname === "/" || pathname === "/login" || pathname.startsWith("/auth/")
  );
}

// 리다이렉트할 때도 갱신된 세션 쿠키를 잃지 않게 옮겨 담는다.
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

// 여기서는 낙관적인 리다이렉트만 한다. 실제 데이터 접근 권한은 RLS가 보장한다.
export async function proxy(request: NextRequest) {
  const { response, userId } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!userId && !isPublicPath(pathname)) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return redirectWithCookies(url, response);
  }

  if (userId && (pathname === "/" || pathname === "/login")) {
    return redirectWithCookies(
      new URL(AFTER_LOGIN_PATH, request.url),
      response,
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
