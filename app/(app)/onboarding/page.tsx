import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { CreateWorkspaceForm } from "./create-workspace-form";

export const metadata: Metadata = {
  title: "워크스페이스 만들기 | TaskFlow Board",
};

// 로그인 확인은 proxy.ts가 하므로 이 페이지는 정적으로 렌더된다.
export default function OnboardingPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">워크스페이스 만들기</CardTitle>
          <CardDescription>
            팀이 함께 프로젝트와 이슈를 관리할 공간입니다. 나중에 멤버를 초대할
            수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateWorkspaceForm />
        </CardContent>
      </Card>
    </main>
  );
}
