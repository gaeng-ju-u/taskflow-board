import Link from "next/link";

import { DemoSignInButton } from "@/components/auth/demo-sign-in-button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center justify-between border-b px-6">
        <span className="font-semibold">TaskFlow Board</span>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          팀을 위한 이슈 트래커
        </h1>
        <p className="text-muted-foreground">
          프로젝트와 이슈를 한곳에서 관리하세요.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button render={<Link href="/login" />} nativeButton={false}>
            시작하기
          </Button>
          <DemoSignInButton />
        </div>
      </main>
    </div>
  );
}
