// NEXT_PUBLIC_ 값은 빌드 시 문자열로 치환되므로 process.env.X 형태로 직접 참조해야 한다.
function required(name: string, value: string | undefined) {
  if (!value)
    throw new Error(
      `환경 변수 ${name}가 설정되지 않았습니다 (.env.local 확인)`,
    );
  return value;
}

export const supabaseUrl = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const supabasePublishableKey = required(
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);
