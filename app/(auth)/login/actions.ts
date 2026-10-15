"use server";

import { redirect } from "next/navigation";

import { getRequestOrigin } from "@/lib/auth/origin";
import { safeNextPath } from "@/lib/auth/redirect";
import { createClient } from "@/lib/supabase/server";
import { emailSignInSchema } from "@/lib/validations/auth";

async function callbackUrl(next: string) {
  const url = new URL("/auth/callback", await getRequestOrigin());
  url.searchParams.set("next", next);
  return url.toString();
}

export async function signInWithGithub(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { redirectTo: await callbackUrl(next) },
  });

  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export type EmailSignInState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string };

export async function signInWithEmail(
  _prev: EmailSignInState,
  formData: FormData,
): Promise<EmailSignInState> {
  const parsed = emailSignInSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const next = safeNextPath(formData.get("next"));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: await callbackUrl(next) },
  });

  if (error) {
    return {
      status: "error",
      message:
        error.status === 429
          ? "요청이 너무 많습니다. 잠시 후 다시 시도하세요."
          : "메일을 보내지 못했습니다. 다시 시도하세요.",
    };
  }
  return { status: "sent", email: parsed.data.email };
}
