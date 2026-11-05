import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

// 화면 전체를 쓰는 안내 (404, 오류). 버튼·링크는 children으로 받는다.
export function PageMessage({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
      <Icon aria-hidden className="mb-2 size-8 text-muted-foreground" />
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {children && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {children}
        </div>
      )}
    </main>
  );
}

// 서버 오류는 운영 환경에서 메시지 대신 식별자(digest)만 전달된다. 서버 로그와 대조할 때 쓴다.
export function errorDigest(error: unknown) {
  return error instanceof Error && "digest" in error && error.digest
    ? String(error.digest)
    : null;
}
