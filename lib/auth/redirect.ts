export const AFTER_LOGIN_PATH = "/auth/continue";

// 로그인 후 돌아갈 경로. 외부 사이트로 보내는 open redirect를 막기 위해 같은 사이트의 경로만 허용한다.
export function safeNextPath(next: FormDataEntryValue | string | null) {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.startsWith("/\\")
  ) {
    return AFTER_LOGIN_PATH;
  }
  return next;
}
