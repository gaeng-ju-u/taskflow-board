import { FileQuestionMarkIcon } from "lucide-react";

import { PageMessage } from "@/components/common/page-message";
import { WorkspaceHomeButton } from "@/components/common/workspace-home-button";

// 워크스페이스 안에서 없는 이슈·프로젝트 (notFound()). 사이드바는 그대로 두고 본문에만 보여준다.
export default function WorkspaceNotFound() {
  return (
    <PageMessage
      icon={FileQuestionMarkIcon}
      title="찾을 수 없습니다"
      description="삭제되었거나 주소가 잘못되었습니다. 다른 사람이 방금 지웠을 수도 있습니다."
    >
      <WorkspaceHomeButton />
    </PageMessage>
  );
}
