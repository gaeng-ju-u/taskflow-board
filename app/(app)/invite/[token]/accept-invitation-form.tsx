"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";

import { acceptInvitation, type AcceptInvitationState } from "./actions";

export function AcceptInvitationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<
    AcceptInvitationState,
    FormData
  >(acceptInvitation, {});

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      {state.message && (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "수락하는 중..." : "초대 수락"}
      </Button>
    </form>
  );
}
