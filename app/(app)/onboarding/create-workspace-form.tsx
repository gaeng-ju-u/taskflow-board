"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { suggestSlug } from "@/lib/validations/workspace";

import { createWorkspace, type CreateWorkspaceState } from "./actions";

export function CreateWorkspaceForm() {
  const [state, action, pending] = useActionState<
    CreateWorkspaceState,
    FormData
  >(createWorkspace, {});
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  // 사용자가 주소를 직접 고치기 전까지는 이름에서 자동으로 만든다.
  const [slugEdited, setSlugEdited] = useState(false);

  const nameError = state.fieldErrors?.name?.[0];
  const slugError = state.fieldErrors?.slug?.[0];

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">워크스페이스 이름</Label>
        <Input
          id="name"
          name="name"
          placeholder="우리 팀"
          required
          maxLength={50}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugEdited) setSlug(suggestSlug(e.target.value));
          }}
          aria-invalid={!!nameError}
          aria-describedby={nameError ? "name-error" : undefined}
        />
        {nameError && (
          <p id="name-error" className="text-sm text-destructive">
            {nameError}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="slug">주소</Label>
        <div className="flex items-center rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
          <span className="pl-2.5 text-sm text-muted-foreground">
            taskflow/
          </span>
          <Input
            id="slug"
            name="slug"
            placeholder="my-team"
            required
            maxLength={40}
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value.toLowerCase());
              setSlugEdited(true);
            }}
            className="border-0 pl-0.5 focus-visible:ring-0"
            aria-invalid={!!slugError}
            aria-describedby="slug-hint"
          />
        </div>
        <p
          id="slug-hint"
          className={
            slugError
              ? "text-sm text-destructive"
              : "text-xs text-muted-foreground"
          }
        >
          {slugError ?? "영문 소문자, 숫자, 하이픈(-)만 쓸 수 있습니다."}
        </p>
      </div>

      {state.message && (
        <p className="text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "만드는 중..." : "워크스페이스 만들기"}
      </Button>
    </form>
  );
}
