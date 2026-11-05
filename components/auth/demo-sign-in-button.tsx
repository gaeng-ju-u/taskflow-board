"use client";

import { PlayIcon } from "lucide-react";
import { useFormStatus } from "react-dom";

import { signInAsDemo } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";

// 가입 없이 공유 데모 계정으로 들어가는 버튼. 로그인 화면과 첫 화면에서 쓴다.
export function DemoSignInButton({ className }: { className?: string }) {
  return (
    <form action={signInAsDemo} className={className}>
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="secondary"
      className="w-full"
      disabled={pending}
    >
      <PlayIcon />
      {pending ? "들어가는 중..." : "데모로 둘러보기"}
    </Button>
  );
}
