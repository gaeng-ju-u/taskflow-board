import { z } from "zod";

// 워크스페이스 주소는 /[slug]로 쓰이므로 앱의 최상위 경로와 겹치면 안 된다.
const RESERVED_SLUGS = new Set([
  "api",
  "auth",
  "invite",
  "login",
  "logout",
  "new",
  "onboarding",
  "settings",
  "workspaces",
]);

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "이름을 입력하세요")
    .max(50, "50자 이하로 입력하세요"),
  // DB의 workspaces.slug check 제약과 같은 규칙
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(40, "40자 이하로 입력하세요")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "영문 소문자, 숫자, 하이픈(-)만 쓸 수 있습니다",
    )
    .refine((slug) => !RESERVED_SLUGS.has(slug), "사용할 수 없는 주소입니다"),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

// 이름에서 주소 후보를 만든다. 영문과 숫자만 남기므로 한글 이름이면 빈 문자열이 된다.
export function suggestSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
