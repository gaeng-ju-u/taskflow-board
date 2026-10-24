"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  LABEL_COLUMNS,
  listLabels,
  sortLabels,
  type Label,
} from "@/lib/api/labels";
import { createClient } from "@/lib/supabase/client";
import type { CreateLabelInput } from "@/lib/validations/label";

import { queryKeys } from "./keys";
import {
  applyOptimistic,
  hasErrorCode,
  rollbackOptimistic,
  type MutationError,
  type OptimisticContext,
} from "./optimistic";

type Context = OptimisticContext<Label[]>;

const DUPLICATE_NAME_MESSAGE = "이미 있는 라벨 이름입니다.";

export function useLabels(workspaceId: string, initialData?: Label[]) {
  return useQuery({
    queryKey: queryKeys.labels(workspaceId),
    queryFn: () => listLabels(createClient(), workspaceId),
    initialData,
  });
}

// id는 호출하는 쪽에서 만든다. 만든 라벨을 바로 이슈에 붙일 때 서버 응답을 기다리지 않고 같은 id를 쓴다.
export function useCreateLabel(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.labels(workspaceId);

  return useMutation<
    Label,
    MutationError,
    CreateLabelInput & { id: string },
    Context
  >({
    mutationFn: async (input) => {
      const { data, error } = await createClient()
        .from("labels")
        .insert({ workspace_id: workspaceId, ...input })
        .select(LABEL_COLUMNS)
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: (input) =>
      applyOptimistic<Label[]>(queryClient, queryKey, (labels) =>
        sortLabels([
          ...labels,
          {
            ...input,
            workspace_id: workspaceId,
            created_at: new Date().toISOString(),
          },
        ]),
      ),
    onError: (error, _input, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: hasErrorCode(error, "23505")
          ? DUPLICATE_NAME_MESSAGE
          : "라벨을 만들지 못했습니다.",
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useUpdateLabel(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.labels(workspaceId);

  return useMutation<
    void,
    MutationError,
    { id: string; patch: Partial<CreateLabelInput> },
    Context
  >({
    mutationFn: async ({ id, patch }) => {
      const { error } = await createClient()
        .from("labels")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, patch }) =>
      applyOptimistic<Label[]>(queryClient, queryKey, (labels) =>
        sortLabels(
          labels.map((label) =>
            label.id === id ? { ...label, ...patch } : label,
          ),
        ),
      ),
    onError: (error, _vars, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: hasErrorCode(error, "23505")
          ? DUPLICATE_NAME_MESSAGE
          : "라벨을 수정하지 못했습니다.",
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

// 라벨을 지우면 DB에서 이슈에 붙은 연결(issue_labels)도 함께 지워진다(on delete cascade).
// 화면은 라벨 목록에 없는 id를 그리지 않으므로 라벨 목록만 낙관적으로 바꾸고, 이슈는 저장 후 다시 불러온다.
export function useDeleteLabel(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.labels(workspaceId);

  return useMutation<void, MutationError, string, Context>({
    mutationFn: async (id) => {
      const { error } = await createClient()
        .from("labels")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) =>
      applyOptimistic<Label[]>(queryClient, queryKey, (labels) =>
        labels.filter((label) => label.id !== id),
      ),
    onError: (error, _id, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: "라벨을 삭제하지 못했습니다.",
      }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.issues(workspaceId),
        }),
      ]),
  });
}
