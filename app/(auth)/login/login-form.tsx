"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  signInWithEmail,
  signInWithGithub,
  type EmailSignInState,
} from "./actions";

const ERROR_MESSAGES: Record<string, string> = {
  oauth: "GitHub 로그인을 시작하지 못했습니다. 다시 시도하세요.",
  callback:
    "로그인 링크가 만료되었거나 다른 브라우저에서 열렸습니다. 다시 시도하세요.",
};

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .5Z" />
    </svg>
  );
}

// URL 파라미터를 읽는 부분만 Suspense로 분리해, 폼 자체는 정적 HTML에 포함되게 한다.
function NextPathInput() {
  const next = useSearchParams().get("next") ?? "";
  return <input type="hidden" name="next" value={next} />;
}

function CallbackError() {
  const message = ERROR_MESSAGES[useSearchParams().get("error") ?? ""];
  if (!message) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

export function LoginForm() {
  const [state, emailAction, pending] = useActionState<
    EmailSignInState,
    FormData
  >(signInWithEmail, { status: "idle" });

  if (state.status === "sent") {
    return (
      <div className="space-y-2 text-center" role="status">
        <p className="font-medium">메일함을 확인하세요</p>
        <p className="text-sm text-muted-foreground">
          {state.email}로 로그인 링크를 보냈습니다. 이 브라우저에서 링크를
          열어야 로그인됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Suspense>
        <CallbackError />
      </Suspense>

      <form action={signInWithGithub}>
        <Suspense>
          <NextPathInput />
        </Suspense>
        <Button type="submit" variant="outline" className="w-full">
          <GithubIcon />
          GitHub로 계속하기
        </Button>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        또는
        <span className="h-px flex-1 bg-border" />
      </div>

      <form action={emailAction} className="space-y-3">
        <Suspense>
          <NextPathInput />
        </Suspense>
        <div className="space-y-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
            aria-invalid={state.status === "error"}
            aria-describedby={
              state.status === "error" ? "email-error" : undefined
            }
          />
          {state.status === "error" && (
            <p id="email-error" className="text-sm text-destructive">
              {state.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "보내는 중..." : "로그인 링크 받기"}
        </Button>
      </form>
    </div>
  );
}
