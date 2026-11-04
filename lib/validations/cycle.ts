import { z } from "zod";

export const cycleNameSchema = z
  .string()
  .trim()
  .min(1, "이름을 입력하세요")
  .max(50, "50자 이하로 입력하세요");

// DB의 date 형식 "YYYY-MM-DD"
const dateSchema = z.iso.date("날짜를 입력하세요");

// DB의 check (ends_at >= starts_at)과 같은 규칙. 기간 겹침은 DB 제약(cycles_no_overlap)이 검사한다.
export const cycleSchema = z
  .object({
    name: cycleNameSchema,
    starts_at: dateSchema,
    ends_at: dateSchema,
  })
  .refine((cycle) => cycle.ends_at >= cycle.starts_at, {
    message: "종료일은 시작일 이후여야 합니다",
    path: ["ends_at"],
  });

export type CycleInput = z.infer<typeof cycleSchema>;
