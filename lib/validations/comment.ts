import { z } from "zod";

// DB의 comments.body check 제약(1~10000자)과 같은 규칙
export const commentBodySchema = z
  .string()
  .trim()
  .min(1, "내용을 입력하세요")
  .max(10000, "10000자 이하로 입력하세요");
