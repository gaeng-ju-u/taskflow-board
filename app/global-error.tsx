"use client";

import { useEffect } from "react";

import { themeScript } from "@/lib/theme";

import "./globals.css";

// 루트 레이아웃까지 실패했을 때. 루트 레이아웃을 대신하므로 html·body, 전역 스타일, 테마 스크립트를 직접 넣는다.
// 다른 컴포넌트가 함께 깨졌을 수 있어 기본 요소만 쓴다.
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <title>오류 | TaskFlow Board</title>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background p-6 text-center text-foreground">
        <h1 className="text-lg font-semibold">문제가 생겼습니다</h1>
        <p className="text-sm text-muted-foreground">
          잠시 후 다시 시도해 주세요.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="mt-2 h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
