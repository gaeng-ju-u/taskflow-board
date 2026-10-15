"use client";

import { Toaster as Sonner } from "sonner";

import { useTheme } from "@/hooks/use-theme";

// shadcn의 sonner 컴포넌트는 next-themes에 의존하므로, 직접 만든 useTheme에 연결한다.
export function Toaster() {
  const { theme } = useTheme();
  return <Sonner theme={theme} position="bottom-right" richColors />;
}
