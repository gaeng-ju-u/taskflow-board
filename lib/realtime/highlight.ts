"use client";

import { useSyncExternalStore } from "react";

// 다른 사람이 바꾼 항목(이슈, 코멘트) id를 잠깐 기억해 강조 표시한다. 시끄러운 알림 대신 화면에서 조용히 알린다.
const HIGHLIGHT_MS = 2000;
const highlighted = new Set<string>();
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function highlight(id: string) {
  highlighted.add(id);
  emit();
  setTimeout(() => {
    highlighted.delete(id);
    emit();
  }, HIGHLIGHT_MS);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 강조 중이면 true. 서버 렌더에서는 항상 false.
export function useHighlighted(id: string) {
  return useSyncExternalStore(
    subscribe,
    () => highlighted.has(id),
    () => false,
  );
}
