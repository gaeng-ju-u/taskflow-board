"use client";

import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import { useEffect } from "react";

import { errorDigest, PageMessage } from "@/components/common/page-message";
import { WorkspaceHomeButton } from "@/components/common/workspace-home-button";
import { Button } from "@/components/ui/button";

// 워크스페이스 안의 화면(목록, 보드, 이슈, 설정)에서 난 오류. 사이드바는 그대로 두고 본문만 바꾼다.
// retry: 그 화면의 데이터를 다시 불러와 다시 그린다 (Next 16. reset은 다시 불러오지 않는다).
export default function WorkspaceError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const digest = errorDigest(error);

  return (
    <PageMessage
      icon={TriangleAlertIcon}
      title="화면을 불러오지 못했습니다"
      description={
        <>
          잠시 후 다시 시도해 주세요. 계속되면 새로고침해 보세요.
          {digest && (
            <span className="mt-1 block font-mono text-xs">
              오류 코드: {digest}
            </span>
          )}
        </>
      }
    >
      <Button onClick={() => retry()}>
        <RotateCwIcon />
        다시 시도
      </Button>
      <WorkspaceHomeButton variant="outline" />
    </PageMessage>
  );
}
