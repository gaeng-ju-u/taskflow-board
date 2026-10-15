import { z } from "zod";

export const emailSignInSchema = z.object({
  // 공백 제거와 소문자 변환을 먼저 한 뒤 이메일 형식을 검사한다.
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("올바른 이메일 주소를 입력하세요")),
});
