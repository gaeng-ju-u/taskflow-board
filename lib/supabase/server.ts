import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

import type { Database } from "./database.types";
import { supabasePublishableKey, supabaseUrl } from "./env";

// Server Component, Server Action, Route Handler용. 요청마다 새로 만든다.
export async function createClient() {
  // Supabase는 세션을 읽을 때 Date.now()로 토큰 만료를 확인한다. Partial Prefetching이 쿠키 기반 내용까지
  // 미리 렌더하는데, 그 단계에서 Date.now()를 쓰면 에러가 나므로 Supabase 작업은 실제 요청 시점에만 하게 한다.
  await connection();
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component에서는 쿠키를 쓸 수 없다. 세션 갱신은 proxy.ts가 담당한다.
        }
      },
    },
  });
}
