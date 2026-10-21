"use client";

import { CopyIcon, XIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/date";
import {
  invitePath,
  type Invitation,
  type WorkspaceRole,
} from "@/lib/api/members";
import {
  PENDING_TOKEN,
  useCreateInvitation,
  useDeleteInvitation,
  useInvitations,
} from "@/lib/queries/members";
import { createInvitationSchema } from "@/lib/validations/invitation";

import { ROLE_META } from "./role-meta";
import { RoleSelect } from "./role-select";

// owner에게만 보인다. 초대 메일은 보내지 않고, 만든 링크를 복사해 직접 전달한다.
export function InvitationSection({
  workspaceId,
  initialInvitations,
}: {
  workspaceId: string;
  initialInvitations: Invitation[] | undefined;
}) {
  const { data: invitations = [] } = useInvitations(
    workspaceId,
    initialInvitations,
  );
  // 만료 표시 기준 시각. 렌더마다 Date.now()를 부르면 렌더 결과가 매번 달라지므로 처음 한 번만 읽는다.
  const [now] = useState(() => Date.now());

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">초대</h2>
        <p className="text-sm text-muted-foreground">
          초대 링크를 만들어 전달하세요. 링크는 7일 동안 유효하고, 초대한
          이메일로 로그인해야 수락할 수 있습니다.
        </p>
      </div>
      <InviteForm workspaceId={workspaceId} invitations={invitations} />
      {invitations.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {invitations.map((invitation) => (
            <InvitationRow
              key={invitation.id}
              workspaceId={workspaceId}
              invitation={invitation}
              now={now}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function InviteForm({
  workspaceId,
  invitations,
}: {
  workspaceId: string;
  invitations: Invitation[];
}) {
  const createInvitation = useCreateInvitation(workspaceId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("member");
  const [error, setError] = useState<string>();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createInvitationSchema.safeParse({ email, role });
    if (!parsed.success) {
      setError(z.flattenError(parsed.error).fieldErrors.email?.[0]);
      return;
    }
    // 캐시에서 먼저 확인한다. DB의 unique 인덱스가 최종 방어선이다.
    if (invitations.some((item) => item.email === parsed.data.email)) {
      setError("이미 초대한 이메일입니다");
      return;
    }

    createInvitation.mutate({ id: crypto.randomUUID(), ...parsed.data });
    setEmail("");
    setError(undefined);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-1.5">
      <Label htmlFor="invite-email">이메일</Label>
      <div className="flex gap-2">
        <Input
          id="invite-email"
          type="email"
          value={email}
          placeholder="teammate@example.com"
          onChange={(e) => {
            setEmail(e.target.value);
            setError(undefined);
          }}
          aria-invalid={!!error}
          aria-describedby={error ? "invite-email-error" : undefined}
        />
        <RoleSelect label="초대 역할" value={role} onChange={setRole} />
        <Button type="submit">초대</Button>
      </div>
      {error && (
        <p id="invite-email-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

function InvitationRow({
  workspaceId,
  invitation,
  now,
}: {
  workspaceId: string;
  invitation: Invitation;
  now: number;
}) {
  const deleteInvitation = useDeleteInvitation(workspaceId);
  const pending = invitation.token === PENDING_TOKEN;
  const expired = new Date(invitation.expires_at).getTime() < now;

  async function copyLink() {
    const url = new URL(invitePath(invitation.token), window.location.origin);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success("초대 링크를 복사했습니다.");
    } catch {
      toast.error("링크를 복사하지 못했습니다.");
    }
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{invitation.email}</p>
        <p
          className={cn(
            "text-xs",
            expired ? "text-destructive" : "text-muted-foreground",
          )}
        >
          {ROLE_META[invitation.role].label} ·{" "}
          {expired ? "만료됨" : `${formatDateTime(invitation.expires_at)}까지`}
        </p>
      </div>
      {!expired && (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={copyLink}
        >
          <CopyIcon />
          {pending ? "만드는 중..." : "링크 복사"}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`${invitation.email} 초대 취소`}
        title="초대 취소"
        disabled={pending}
        className="text-muted-foreground"
        onClick={() => deleteInvitation.mutate(invitation.id)}
      >
        <XIcon />
      </Button>
    </li>
  );
}
