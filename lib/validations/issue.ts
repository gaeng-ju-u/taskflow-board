import { z } from "zod";

import { Constants } from "@/lib/supabase/database.types";

// DB enum과 같은 값. 생성된 타입의 Constants를 써서 DB와 어긋나지 않게 한다.
export const issueStatusSchema = z.enum(Constants.public.Enums.issue_status);
export const issuePrioritySchema = z.enum(
  Constants.public.Enums.issue_priority,
);

export const issueTitleSchema = z
  .string()
  .trim()
  .min(1, "제목을 입력하세요")
  .max(200, "200자 이하로 입력하세요");

export const issueDescriptionSchema = z
  .string()
  .max(10000, "10000자 이하로 입력하세요");

export const createIssueSchema = z.object({
  title: issueTitleSchema,
  description: issueDescriptionSchema,
  status: issueStatusSchema,
  priority: issuePrioritySchema,
  assignee_id: z.uuid().nullable(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
