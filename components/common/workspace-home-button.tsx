"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";

// not-found·error 화면은 params를 받지 못해, 지금 주소에서 워크스페이스를 읽어 그 홈으로 보낸다.
export function WorkspaceHomeButton({
  variant = "default",
}: {
  variant?: "default" | "outline";
}) {
  const { workspace } = useParams<{ workspace?: string }>();
  return (
    <Button
      variant={variant}
      render={<Link href={workspace ? `/${workspace}` : "/"} />}
      nativeButton={false}
    >
      워크스페이스 홈으로
    </Button>
  );
}
