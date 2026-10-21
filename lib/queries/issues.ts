"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  formatIssueRef,
  ISSUE_COLUMNS,
  listIssues,
  type Issue,
} from "@/lib/api/issues";
import { createClient } from "@/lib/supabase/client";
import type { CreateIssueInput } from "@/lib/validations/issue";

import { queryKeys } from "./keys";
import {
  applyOptimistic,
  hasErrorCode,
  rollbackOptimistic,
  type MutationError,
  type OptimisticContext,
} from "./optimistic";

export type IssuePatch = Partial<
  Pick<
    Issue,
    | "title"
    | "description"
    | "status"
    | "priority"
    | "assignee_id"
    | "sort_order"
  >
>;

// 낙관적으로 추가한 이슈는 번호가 아직 없다 (DB 트리거가 발급한다).
export const PENDING_NUMBER = 0;

export function useIssues(
  workspaceId: string,
  projectId: string,
  initialData?: Issue[],
) {
  return useQuery({
    queryKey: queryKeys.issueList(workspaceId, projectId),
    queryFn: () => listIssues(createClient(), projectId),
    initialData,
  });
}

export function useIssue(
  workspaceId: string,
  issueId: string,
  initialData?: Issue,
) {
  return useQuery({
    queryKey: queryKeys.issue(workspaceId, issueId),
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("issues")
        .select(ISSUE_COLUMNS)
        .eq("id", issueId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    initialData,
  });
}

export function useCreateIssue(workspaceId: string, projectKey: string) {
  const queryClient = useQueryClient();

  return useMutation<
    Issue,
    MutationError,
    CreateIssueInput & { id: string; project_id: string },
    OptimisticContext<Issue[]>
  >({
    // id는 호출하는 쪽에서 만든다. 낙관적 항목과 서버 결과가 같은 id를 갖는다.
    mutationFn: async (input) => {
      const { data, error } = await createClient()
        .from("issues")
        .insert({
          ...input,
          // 타입상 필수라 넘기지만 DB 트리거가 덮어쓴다 (워크스페이스는 프로젝트에서, 번호는 새로 발급).
          workspace_id: workspaceId,
          number: PENDING_NUMBER,
          sort_order: nextSortOrder(queryClient, workspaceId, input),
        })
        .select(ISSUE_COLUMNS)
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: (input) =>
      applyOptimistic<Issue[]>(
        queryClient,
        queryKeys.issueList(workspaceId, input.project_id),
        (issues) => [
          ...issues,
          {
            ...input,
            workspace_id: workspaceId,
            number: PENDING_NUMBER,
            sort_order: nextSortOrder(queryClient, workspaceId, input),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
      ),
    // 훅 옵션의 콜백은 생성 대화상자가 닫혀(언마운트되어)도 실행된다.
    onSuccess: (issue) =>
      toast.success(
        `${formatIssueRef(projectKey, issue.number)} 이슈를 만들었습니다.`,
      ),
    onError: (error, input, context) =>
      rollbackOptimistic(
        queryClient,
        queryKeys.issueList(workspaceId, input.project_id),
        context,
        { error, message: "이슈를 만들지 못했습니다." },
      ),
    onSettled: (_data, _error, input) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.issueList(workspaceId, input.project_id),
      }),
  });
}

// 새 이슈는 같은 상태 그룹의 맨 위에 둔다.
function nextSortOrder(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string,
  input: { id: string; project_id: string; status: Issue["status"] },
) {
  const issues =
    queryClient.getQueryData<Issue[]>(
      queryKeys.issueList(workspaceId, input.project_id),
    ) ?? [];
  const orders = issues
    .filter((issue) => issue.status === input.status && issue.id !== input.id)
    .map((issue) => issue.sort_order);
  return orders.length ? Math.min(...orders) - 1 : 0;
}

type UpdateContext = {
  list: OptimisticContext<Issue[]>;
  detail: OptimisticContext<Issue | null>;
};

// 목록과 상세 캐시를 함께 바꾼다. 어느 화면에서 바꾸든 다른 화면에도 바로 반영된다.
export function useUpdateIssue(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    MutationError,
    { issue: Issue; patch: IssuePatch },
    UpdateContext
  >({
    mutationFn: async ({ issue, patch }) => {
      const { error } = await createClient()
        .from("issues")
        .update(patch)
        .eq("id", issue.id);
      if (error) throw error;
    },
    onMutate: async ({ issue, patch }) => ({
      list: await applyOptimistic<Issue[]>(
        queryClient,
        queryKeys.issueList(workspaceId, issue.project_id),
        (issues) =>
          issues.map((item) =>
            item.id === issue.id ? { ...item, ...patch } : item,
          ),
      ),
      detail: await applyOptimistic<Issue | null>(
        queryClient,
        queryKeys.issue(workspaceId, issue.id),
        (current) => (current ? { ...current, ...patch } : current),
      ),
    }),
    onError: (error, { issue }, context) => {
      rollbackOptimistic(
        queryClient,
        queryKeys.issue(workspaceId, issue.id),
        context?.detail,
      );
      rollbackOptimistic(
        queryClient,
        queryKeys.issueList(workspaceId, issue.project_id),
        context?.list,
        {
          error,
          message: hasErrorCode(error, "23514")
            ? "담당자는 워크스페이스 멤버여야 합니다."
            : "이슈를 수정하지 못했습니다.",
        },
      );
    },
    onSettled: (_data, _error, { issue }) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.issueList(workspaceId, issue.project_id),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.issue(workspaceId, issue.id),
        }),
      ]),
  });
}

// onDeleted는 삭제가 성공한 뒤 실행된다 (예: 다른 화면으로 이동). 실패하면 실행되지 않으므로, 오프라인에서
// 이동하다 브라우저 오류 화면으로 가는 일이 없다. 훅 옵션이라 호출한 컴포넌트가 낙관적 업데이트로
// 먼저 사라져도 실행된다 (mutate()에 넘긴 콜백은 실행되지 않음).
export function useDeleteIssue(
  workspaceId: string,
  options?: { onDeleted?: (issue: Issue) => void },
) {
  const queryClient = useQueryClient();

  return useMutation<void, MutationError, Issue, OptimisticContext<Issue[]>>({
    mutationFn: async (issue) => {
      const { error } = await createClient()
        .from("issues")
        .delete()
        .eq("id", issue.id);
      if (error) throw error;
    },
    onMutate: (issue) =>
      applyOptimistic<Issue[]>(
        queryClient,
        queryKeys.issueList(workspaceId, issue.project_id),
        (issues) => issues.filter((item) => item.id !== issue.id),
      ),
    onError: (error, issue, context) =>
      rollbackOptimistic(
        queryClient,
        queryKeys.issueList(workspaceId, issue.project_id),
        context,
        { error, message: "이슈를 삭제하지 못했습니다." },
      ),
    // 상세 캐시를 먼저 지우면 이동하기 전에 "이슈를 찾을 수 없습니다"가 잠깐 보이므로 이동부터 한다.
    onSuccess: (_data, issue) => {
      options?.onDeleted?.(issue);
      queryClient.removeQueries({
        queryKey: queryKeys.issue(workspaceId, issue.id),
      });
    },
    onSettled: (_data, _error, issue) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.issueList(workspaceId, issue.project_id),
      }),
  });
}
