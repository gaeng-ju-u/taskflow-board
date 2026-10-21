import type { WorkspaceRole } from "@/lib/api/members";

// 화면에 보이는 역할 이름. DB 값은 owner/member다.
export const ROLE_META: Record<
  WorkspaceRole,
  { label: string; description: string }
> = {
  owner: {
    label: "관리자",
    description: "프로젝트·이슈 관리, 멤버 초대·역할 변경·내보내기",
  },
  member: { label: "멤버", description: "프로젝트·이슈 관리" },
};

export const ROLE_ORDER: WorkspaceRole[] = ["member", "owner"];
