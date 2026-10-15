"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createWorkspaceSchema } from "@/lib/validations/workspace";

export type CreateWorkspaceState = {
  fieldErrors?: { name?: string[]; slug?: string[] };
  message?: string;
};

export async function createWorkspace(
  _prev: CreateWorkspaceState,
  formData: FormData,
): Promise<CreateWorkspaceState> {
  const parsed = createWorkspaceSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  // created_by는 DB 기본값(auth.uid())이 채우고, 트리거가 만든 사람을 owner로 등록한다.
  const supabase = await createClient();
  const { error } = await supabase.from("workspaces").insert(parsed.data);

  if (error) {
    if (error.code === "23505") {
      return { fieldErrors: { slug: ["이미 사용 중인 주소입니다"] } };
    }
    return { message: "워크스페이스를 만들지 못했습니다. 다시 시도하세요." };
  }

  redirect(`/${parsed.data.slug}`);
}
