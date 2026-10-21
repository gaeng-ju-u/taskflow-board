import { z } from "zod";

// 공백 제거와 소문자 변환을 먼저 한 뒤 이메일 형식을 검사한다. 초대 이메일도 같은 규칙을 쓴다
// (DB의 invitations.email은 소문자여야 하고, 수락할 때 로그인 이메일과 비교한다).
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("올바른 이메일 주소를 입력하세요"));

export const emailSignInSchema = z.object({ email: emailSchema });
