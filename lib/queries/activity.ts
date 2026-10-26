"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  COMMENT_COLUMNS,
  listActivities,
  listComments,
  type Activity,
  type Comment,
} from "@/lib/api/activity";
import { createClient } from "@/lib/supabase/client";

import { queryKeys } from "./keys";
import {
  applyOptimistic,
  rollbackOptimistic,
  type MutationError,
  type OptimisticContext,
} from "./optimistic";

type Context = OptimisticContext<Comment[]>;

export function useComments(
  workspaceId: string,
  issueId: string,
  initialData?: Comment[],
) {
  return useQuery({
    queryKey: queryKeys.comments(workspaceId, issueId),
    queryFn: () => listComments(createClient(), issueId),
    initialData,
  });
}

export function useActivities(
  workspaceId: string,
  issueId: string,
  initialData?: Activity[],
) {
  return useQuery({
    queryKey: queryKeys.activities(workspaceId, issueId),
    queryFn: () => listActivities(createClient(), issueId),
    initialData,
  });
}

// id는 호출하는 쪽에서 만든다. 낙관적으로 추가한 코멘트와 서버 결과가 같은 id를 갖는다.
export function useCreateComment(
  workspaceId: string,
  issueId: string,
  authorId: string,
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.comments(workspaceId, issueId);

  return useMutation<
    Comment,
    MutationError,
    { id: string; body: string },
    Context
  >({
    mutationFn: async ({ id, body }) => {
      const { data, error } = await createClient()
        .from("comments")
        // workspace_id와 author_id는 DB 트리거와 기본값(auth.uid())이 채운다. 타입상 필수라 넘긴다.
        .insert({ id, issue_id: issueId, workspace_id: workspaceId, body })
        .select(COMMENT_COLUMNS)
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: ({ id, body }) =>
      applyOptimistic<Comment[]>(queryClient, queryKey, (comments) => [
        ...comments,
        {
          id,
          issue_id: issueId,
          workspace_id: workspaceId,
          author_id: authorId,
          body,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]),
    onError: (error, _vars, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: "코멘트를 등록하지 못했습니다.",
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useUpdateComment(workspaceId: string, issueId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.comments(workspaceId, issueId);

  return useMutation<
    void,
    MutationError,
    { id: string; body: string },
    Context
  >({
    mutationFn: async ({ id, body }) => {
      const { error } = await createClient()
        .from("comments")
        .update({ body })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, body }) =>
      applyOptimistic<Comment[]>(queryClient, queryKey, (comments) =>
        comments.map((comment) =>
          comment.id === id
            ? { ...comment, body, updated_at: new Date().toISOString() }
            : comment,
        ),
      ),
    onError: (error, _vars, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: "코멘트를 수정하지 못했습니다.",
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteComment(workspaceId: string, issueId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.comments(workspaceId, issueId);

  return useMutation<void, MutationError, string, Context>({
    mutationFn: async (id) => {
      const { error } = await createClient()
        .from("comments")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) =>
      applyOptimistic<Comment[]>(queryClient, queryKey, (comments) =>
        comments.filter((comment) => comment.id !== id),
      ),
    onError: (error, _id, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: "코멘트를 삭제하지 못했습니다.",
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
