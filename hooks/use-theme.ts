"use client";

import { useCallback, useSyncExternalStore } from "react";

import { THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

// 다른 탭에서 테마를 바꾸거나 시스템 설정이 바뀌면 다시 적용한다.
function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  const sync = () => {
    applyTheme(readTheme());
    onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", sync);
  media.addEventListener("change", sync);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", sync);
    media.removeEventListener("change", sync);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore<Theme>(
    subscribe,
    readTheme,
    () => "system",
  );

  const setTheme = useCallback((next: Theme) => {
    try {
      if (next === "system") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // 저장소를 쓸 수 없어도 현재 탭에는 적용한다.
    }
    applyTheme(next);
    listeners.forEach((listener) => listener());
  }, []);

  return { theme, setTheme };
}
