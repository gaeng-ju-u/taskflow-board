import { FileQuestionMarkIcon } from "lucide-react";
import Link from "next/link";

import { PageMessage } from "@/components/common/page-message";
import { Button } from "@/components/ui/button";

// 일치하는 라우트가 없는 주소, 없는 워크스페이스. 이슈·프로젝트가 없을 때는 [workspace]/not-found.tsx가 쓰인다.
// "/"는 로그인한 사용자를 자기 워크스페이스로 보낸다(proxy.ts).
export default function NotFound() {
  return (
    <PageMessage
      icon={FileQuestionMarkIcon}
      title="페이지를 찾을 수 없습니다"
      description="주소가 잘못되었거나, 삭제되었거나, 볼 권한이 없는 페이지입니다."
    >
      <Button render={<Link href="/" />} nativeButton={false}>
        처음으로
      </Button>
    </PageMessage>
  );
}
