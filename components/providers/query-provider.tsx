"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  // 컴포넌트마다 새 QueryClient가 생기지 않게 최초 렌더에서 한 번만 만든다.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 서버에서 받은 initialData를 바로 다시 요청하지 않게 한다.
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
          mutations: {
            // 기본값("online")은 오프라인일 때 요청을 일시정지했다가 온라인이 되면 다시 보낸다.
            // 그러면 실패가 아니라서 낙관적 업데이트가 되돌려지지 않고, 나중에 몰래 저장되어
            // 화면과 실제 상태가 어긋날 수 있다. 바로 보내서 실패하면 즉시 롤백하고 알린다.
            networkMode: "always",
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
