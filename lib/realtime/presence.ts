"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export type PresenceUser = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

// 같은 채널(이슈, 프로젝트)에 지금 접속한 사람들. 비공개 채널이라 워크스페이스 멤버만 들어온다(마이그레이션 참고).
// Presence 키를 사용자 id로 두어, 같은 사람이 탭을 여러 개 열어도 한 명으로 센다.
export function usePresence(topic: string, me: PresenceUser | null) {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const meId = me?.id;
  const meName = me?.name;
  const meAvatar = me?.avatarUrl ?? null;

  useEffect(() => {
    if (!meId || meName === undefined) return;
    const supabase = createClient();
    const channel = supabase.channel(topic, {
      config: { private: true, presence: { key: meId } },
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceUser>();
      setUsers(
        Object.values(state).flatMap((metas) => {
          const meta = metas[0];
          return meta
            ? [{ id: meta.id, name: meta.name, avatarUrl: meta.avatarUrl }]
            : [];
        }),
      );
    });

    // 구독 요청에는 그 순간의 토큰이 실리므로 로그인 토큰을 먼저 채운다 (realtime-sync.tsx 참고).
    // 토큰 없이 들어가면 비공개 채널 권한 검사에서 거부된다.
    let cancelled = false;
    void supabase.realtime.setAuth().then(() => {
      if (cancelled) return;
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ id: meId, name: meName, avatarUrl: meAvatar });
        }
      });
    });

    return () => {
      cancelled = true;
      setUsers([]);
      void supabase.removeChannel(channel);
    };
  }, [topic, meId, meName, meAvatar]);

  return users;
}
