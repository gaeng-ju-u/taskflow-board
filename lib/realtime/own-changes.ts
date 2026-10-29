"use client";

import type { QueryClient } from "@tanstack/react-query";

// Realtime 이벤트에는 누가 바꿨는지가 없어서, 내 뮤테이션 기록으로 "내 변경"을 판단한다.
// 이 시간 안에 내가 다룬 id는 내 변경의 메아리로 보고 강조하지 않는다.
const RECENT_MS = 5000;

// 뮤테이션 변수에서 다루는 id를 꺼낸다. 변수 모양: id 문자열(삭제), { id, ... }(생성·수정),
// Issue, { issue, patch }, { issue, labelId, attach }, { userId, role } 등.
function idsOf(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const ids = ["id", "userId", "labelId"].flatMap((key) =>
    typeof record[key] === "string" ? [record[key]] : [],
  );
  return record.issue ? [...ids, ...idsOf(record.issue)] : ids;
}

export function trackOwnChanges(queryClient: QueryClient) {
  const touched = new Map<string, number>();
  const mutations = queryClient.getMutationCache();
  const unsubscribe = mutations.subscribe((event) => {
    if (event.type !== "added" && event.type !== "updated") return;
    for (const id of idsOf(event.mutation.state.variables)) {
      touched.set(id, Date.now());
    }
  });

  const isPending = (id: string) =>
    mutations
      .getAll()
      .some(
        (mutation) =>
          mutation.state.status === "pending" &&
          idsOf(mutation.state.variables).includes(id),
      );

  const isMine = (id: string) =>
    isPending(id) || Date.now() - (touched.get(id) ?? 0) < RECENT_MS;

  return { isPending, isMine, dispose: unsubscribe };
}
