"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  CYCLE_COLUMNS,
  listCycles,
  sortCycles,
  type Cycle,
} from "@/lib/api/cycles";
import { createClient } from "@/lib/supabase/client";
import type { CycleInput } from "@/lib/validations/cycle";

import { queryKeys } from "./keys";
import {
  applyOptimistic,
  hasErrorCode,
  rollbackOptimistic,
  type MutationError,
  type OptimisticContext,
} from "./optimistic";

type Context = OptimisticContext<Cycle[]>;

// 기간이 겹치면 DB 제약(cycles_no_overlap, exclusion)이 23P01로 거부한다.
function errorMessage(error: MutationError, fallback: string) {
  return hasErrorCode(error, "23P01")
    ? "다른 사이클과 기간이 겹칩니다."
    : fallback;
}

export function useCycles(
  workspaceId: string,
  projectId: string,
  initialData?: Cycle[],
) {
  return useQuery({
    queryKey: queryKeys.cycles(workspaceId, projectId),
    queryFn: () => listCycles(createClient(), projectId),
    initialData,
  });
}

// id는 호출하는 쪽에서 만든다. 낙관적 항목과 서버 결과가 같은 id를 갖는다.
export function useCreateCycle(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.cycles(workspaceId, projectId);

  return useMutation<
    Cycle,
    MutationError,
    CycleInput & { id: string },
    Context
  >({
    mutationFn: async (input) => {
      const { data, error } = await createClient()
        .from("cycles")
        // workspace_id는 타입상 필수라 넘기지만 DB 트리거가 프로젝트에서 채운다.
        .insert({ ...input, project_id: projectId, workspace_id: workspaceId })
        .select(CYCLE_COLUMNS)
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: (input) =>
      applyOptimistic<Cycle[]>(queryClient, queryKey, (cycles) =>
        sortCycles([
          ...cycles,
          {
            ...input,
            project_id: projectId,
            created_at: new Date().toISOString(),
          },
        ]),
      ),
    onError: (error, _input, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: errorMessage(error, "사이클을 만들지 못했습니다."),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useUpdateCycle(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.cycles(workspaceId, projectId);

  return useMutation<
    void,
    MutationError,
    { id: string; patch: Partial<CycleInput> },
    Context
  >({
    mutationFn: async ({ id, patch }) => {
      const { error } = await createClient()
        .from("cycles")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, patch }) =>
      applyOptimistic<Cycle[]>(queryClient, queryKey, (cycles) =>
        sortCycles(
          cycles.map((cycle) =>
            cycle.id === id ? { ...cycle, ...patch } : cycle,
          ),
        ),
      ),
    onError: (error, _vars, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: errorMessage(error, "사이클을 수정하지 못했습니다."),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

// 사이클을 지우면 DB에서 이슈의 cycle_id가 비워진다(on delete set null).
// 화면은 사이클 목록에 없는 id를 "사이클 없음"으로 그리므로 사이클 목록만 낙관적으로 바꾸고, 이슈는 저장 후 다시 불러온다.
export function useDeleteCycle(workspaceId: string, projectId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.cycles(workspaceId, projectId);

  return useMutation<void, MutationError, string, Context>({
    mutationFn: async (id) => {
      const { error } = await createClient()
        .from("cycles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) =>
      applyOptimistic<Cycle[]>(queryClient, queryKey, (cycles) =>
        cycles.filter((cycle) => cycle.id !== id),
      ),
    onError: (error, _id, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: "사이클을 삭제하지 못했습니다.",
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
