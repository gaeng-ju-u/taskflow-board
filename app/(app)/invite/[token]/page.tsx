import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { ROLE_META } from "@/components/members/role-meta";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { invitePath } from "@/lib/api/members";
import { getCurrentUser } from "@/lib/data/auth";
import { getInvitationByToken } from "@/lib/data/members";

import { AcceptInvitationForm } from "./accept-invitation-form";
import { switchAccount } from "./actions";

export const metadata: Metadata = { title: "초대 | TaskFlow Board" };

// 로그인 확인은 proxy.ts가 한다. 로그인하지 않았으면 로그인한 뒤 이 화면으로 돌아온다.
export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <Suspense
          fallback={
            <CardHeader>
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </CardHeader>
          }
        >
          <InviteContent params={params} />
        </Suspense>
      </Card>
    </main>
  );
}

async function InviteContent({
  params,
}: {
  params: PageProps<"/invite/[token]">["params"];
}) {
  const { token } = await params;
  const [invitation, user] = await Promise.all([
    getInvitationByToken(token),
    getCurrentUser(),
  ]);

  if (!invitation) {
    return (
      <InviteMessage
        title="초대를 찾을 수 없습니다"
        description="링크가 잘못되었거나 초대가 취소되었습니다. 초대한 사람에게 새 링크를 요청하세요."
      />
    );
  }

  const workspace = invitation.workspace_name;

  if (invitation.is_member) {
    return (
      <InviteMessage
        title={`이미 ${workspace} 멤버입니다`}
        action={
          <Button
            className="w-full"
            render={<Link href={`/${invitation.workspace_slug}`} />}
            nativeButton={false}
          >
            워크스페이스로 이동
          </Button>
        }
      />
    );
  }

  if (invitation.accepted_at) {
    return (
      <InviteMessage
        title="이미 사용된 초대입니다"
        description="초대한 사람에게 새 링크를 요청하세요."
      />
    );
  }

  if (invitation.is_expired) {
    return (
      <InviteMessage
        title="초대가 만료되었습니다"
        description="초대 링크는 7일 동안 유효합니다. 초대한 사람에게 새 링크를 요청하세요."
      />
    );
  }

  // 수락할 때 DB 함수가 로그인 이메일과 초대 이메일을 비교한다. 미리 확인해 안내한다.
  if (invitation.email !== user.email.toLowerCase()) {
    return (
      <InviteMessage
        title={`${workspace}에 초대되었습니다`}
        description={`이 초대는 ${invitation.email} 계정용입니다. 지금은 ${user.email}(으)로 로그인되어 있습니다.`}
        action={
          <form action={switchAccount}>
            <input type="hidden" name="next" value={invitePath(token)} />
            <Button type="submit" variant="outline" className="w-full">
              다른 계정으로 로그인
            </Button>
          </form>
        }
      />
    );
  }

  return (
    <InviteMessage
      title={`${workspace}에 초대되었습니다`}
      description={`${invitation.inviter_name || "관리자"}님이 ${ROLE_META[invitation.role].label} 역할로 초대했습니다.`}
      action={<AcceptInvitationForm token={token} />}
    />
  );
}

function InviteMessage({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {action && <CardContent>{action}</CardContent>}
    </>
  );
}
