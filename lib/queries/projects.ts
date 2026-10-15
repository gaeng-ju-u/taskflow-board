"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";

import {
  listProjects,
  PROJECT_COLUMNS,
  type Project,
} from "@/lib/api/projects";
import { createClient } from "@/lib/supabase/client";
import type { CreateProjectInput } from "@/lib/validations/project";

import { queryKeys } from "./keys";
import {
  applyOptimistic,
  rollbackOptimistic,
  type OptimisticContext,
} from "./optimistic";

type Context = OptimisticContext<Project[]>;

// 서버 컴포넌트가 미리 읽은 목록을 initialData로 받아 첫 화면부터 데이터를 보여준다.
export function useProjects(workspaceId: string, initialData?: Project[]) {
  return useQuery({
    queryKey: queryKeys.projects(workspaceId),
    queryFn: () => listProjects(createClient(), workspaceId),
    initialData,
  });
}

export function useCreateProject(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.projects(workspaceId);

  // id를 호출하는 쪽에서 만들어 넘긴다. 낙관적으로 추가한 항목과 서버 결과가 같은 id를 갖게 된다.
  return useMutation<
    Project,
    PostgrestError,
    CreateProjectInput & { id: string },
    Context
  >({
    mutationFn: async (input) => {
      const { data, error } = await createClient()
        .from("projects")
        .insert({ workspace_id: workspaceId, ...input })
        .select(PROJECT_COLUMNS)
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: (input) =>
      applyOptimistic<Project[]>(queryClient, queryKey, (projects) => [
        ...projects,
        {
          workspace_id: workspaceId,
          created_at: new Date().toISOString(),
          ...input,
        },
      ]),
    onError: (error, _input, context) =>
      rollbackOptimistic(
        queryClient,
        queryKey,
        context,
        error.code === "23505"
          ? "이미 사용 중인 프로젝트 키입니다."
          : "프로젝트를 만들지 못했습니다.",
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useRenameProject(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.projects(workspaceId);

  return useMutation<
    void,
    PostgrestError,
    { id: string; name: string },
    Context
  >({
    mutationFn: async ({ id, name }) => {
      const { error } = await createClient()
        .from("projects")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, name }) =>
      applyOptimistic<Project[]>(queryClient, queryKey, (projects) =>
        projects.map((project) =>
          project.id === id ? { ...project, name } : project,
        ),
      ),
    onError: (_error, _input, context) =>
      rollbackOptimistic(
        queryClient,
        queryKey,
        context,
        "이름을 바꾸지 못했습니다.",
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteProject(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.projects(workspaceId);

  return useMutation<void, PostgrestError, string, Context>({
    mutationFn: async (id) => {
      const { error } = await createClient()
        .from("projects")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) =>
      applyOptimistic<Project[]>(queryClient, queryKey, (projects) =>
        projects.filter((project) => project.id !== id),
      ),
    onError: (_error, _id, context) =>
      rollbackOptimistic(
        queryClient,
        queryKey,
        context,
        "프로젝트를 삭제하지 못했습니다.",
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
