import { z } from "zod";

export const projectNameSchema = z
  .string()
  .trim()
  .min(1, "이름을 입력하세요")
  .max(50, "50자 이하로 입력하세요");

export const createProjectSchema = z.object({
  name: projectNameSchema,
  // DB의 projects.key check 제약과 같은 규칙. 이슈 번호(TF-12) 앞에 붙고, 만든 뒤에는 바꿀 수 없다.
  key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z][A-Z0-9]{1,4}$/,
      "영문 대문자로 시작하는 2~5자 (영문 대문자, 숫자)",
    ),
});

export const renameProjectSchema = z.object({ name: projectNameSchema });

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// 이름에서 키 후보를 만든다. 여러 단어면 머리글자, 한 단어면 앞 3글자. 한글 이름이면 빈 문자열.
export function suggestProjectKey(name: string) {
  const words = name.toUpperCase().match(/[A-Z][A-Z0-9]*/g) ?? [];
  const key =
    words.length > 1
      ? words.map((word) => word[0]).join("")
      : (words[0]?.slice(0, 3) ?? "");
  return key.slice(0, 5);
}
