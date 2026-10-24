import { z } from "zod";

export const labelNameSchema = z
  .string()
  .trim()
  .min(1, "이름을 입력하세요")
  .max(30, "30자 이하로 입력하세요");

// DB의 labels.color check 제약과 같은 규칙
export const labelColorSchema = z
  .string()
  .regex(/^#[0-9a-f]{6}$/, "올바른 색이 아닙니다");

export const createLabelSchema = z.object({
  name: labelNameSchema,
  color: labelColorSchema,
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;
