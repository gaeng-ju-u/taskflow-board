"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { queryKeys } from "@/lib/queries/keys";
import {
  applyCommentChange,
  applyIssueChange,
  applyIssueLabelChange,
  applyLabelChange,
  applyProjectChange,
} from "@/lib/realtime/apply-change";
import { trackOwnChanges } from "@/lib/realtime/own-changes";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/database.types";

// 워크스페이스의 DB 변경을 구독해 캐시에 반영한다. 화면에는 아무것도 그리지 않는다.
// 인증 토큰은 Supabase 클라이언트가 세션에서 넣어 주므로(onAuthStateChange → realtime.setAuth),
// 추가·수정 이벤트는 로그인한 사용자의 RLS로 걸러진다.
export function RealtimeSync({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const tracker = trackOwnChanges(queryClient);
    const ctx = {
      queryClient,
      workspaceId,
      isPending: tracker.isPending,
      isMine: tracker.isMine,
    };
    // 삭제 이벤트도 이 필터로 거르려면 replica identity full이 필요하다(마이그레이션 참고).
    const filter = `workspace_id=eq.${workspaceId}`;
    let subscribedBefore = false;

    const channel = supabase
      .channel(`workspace-sync:${workspaceId}`)
      .on<Tables<"issues">>(
        "postgres_changes",
        { event: "*", schema: "public", table: "issues", filter },
        (payload) => applyIssueChange(payload, ctx),
      )
      .on<Tables<"comments">>(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter },
        (payload) => applyCommentChange(payload, ctx),
      )
      // issue_labels에는 workspace_id가 없어 필터를 걸 수 없다. 추가는 RLS로 걸러지고,
      // 다른 워크스페이스의 삭제는 내 캐시에 없는 id라 무시된다.
      .on<Tables<"issue_labels">>(
        "postgres_changes",
        { event: "*", schema: "public", table: "issue_labels" },
        (payload) => applyIssueLabelChange(payload, ctx),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "labels", filter },
        () => applyLabelChange(ctx),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects", filter },
        () => applyProjectChange(ctx),
      );

    // 구독 요청에는 subscribe()를 부르는 순간의 토큰이 실린다. 세션 토큰은 비동기로 채워지므로 먼저 채운 뒤
    // 구독한다. 토큰 없이 구독하면 서버가 구독자를 비로그인(anon)으로 등록해, RLS 때문에 추가·수정 이벤트가
    // 오지 않는다(삭제 이벤트는 RLS를 거치지 않아 온다). 인자 없이 부르면 세션에서 가져오는 방식이 유지되어
    // 토큰이 갱신될 때도 라이브러리가 새 토큰을 넣는다.
    let cancelled = false;
    void supabase.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel.subscribe((status) => {
        if (status !== "SUBSCRIBED") return;
        // 다시 연결되면(오프라인 후 등) 그사이 놓친 변경이 있을 수 있어 워크스페이스 데이터를 다시 불러온다.
        if (subscribedBefore) {
          void queryClient.invalidateQueries({
            queryKey: queryKeys.workspace(workspaceId),
          });
        }
        subscribedBefore = true;
      });
    });

    return () => {
      cancelled = true;
      tracker.dispose();
      void supabase.removeChannel(channel);
    };
  }, [queryClient, workspaceId]);

  return null;
}
