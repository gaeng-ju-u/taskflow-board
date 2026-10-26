"use client";

import { useEffect, useState } from "react";

// 상대 시간("3분 전") 표시용 현재 시각. 렌더 중에 Date.now()를 부르지 않도록 상태로 들고, 주기적으로 갱신한다.
export function useNow(intervalMs = 60_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
