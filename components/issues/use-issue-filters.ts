"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";

import {
  parseIssueFilters,
  writeIssueFilters,
  type IssueFilters,
} from "@/lib/issue-filters";

// 필터 상태를 URL search params에서 읽고 쓴다. 쓰기는 window.history.replaceState로 해서
// 서버에 화면을 다시 요청하지 않는다 (Next 라우터와 연동되어 useSearchParams가 갱신됨).
// replace라서 필터를 바꿀 때마다 뒤로 가기 기록이 쌓이지 않는다.
// useSearchParams를 쓰므로 이 훅을 쓰는 컴포넌트는 <Suspense> 안에 있어야 한다.
export function useIssueFilters() {
  const searchParams = useSearchParams();
  // searchParams는 주소가 바뀔 때만 새 객체가 되므로, 필터 객체도 그때만 새로 만든다.
  const filters = useMemo(
    () => parseIssueFilters(searchParams),
    [searchParams],
  );

  function setFilters(patch: Partial<IssueFilters>) {
    const params = writeIssueFilters(
      new URLSearchParams(window.location.search),
      {
        ...parseIssueFilters(new URLSearchParams(window.location.search)),
        ...patch,
      },
    );
    const query = params.toString();
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}`,
    );
  }

  return { filters, setFilters };
}
