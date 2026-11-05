"use client";

import { RotateCwIcon, TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { errorDigest, PageMessage } from "@/components/common/page-message";
import { Button } from "@/components/ui/button";

// 워크스페이스 밖의 화면(로그인, 온보딩, 초대)과 워크스페이스 레이아웃 자체에서 난 오류.
// 루트 레이아웃의 오류는 global-error.tsx가 맡는다.
export default function RootError({
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
      title="문제가 생겼습니다"
      description={
        <>
          잠시 후 다시 시도해 주세요.
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
      <Button variant="outline" render={<Link href="/" />} nativeButton={false}>
        처음으로
      </Button>
    </PageMessage>
  );
}
