"use client";

import { PostgrestError } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  INVITATION_COLUMNS,
  listInvitations,
  listMembers,
  type Invitation,
  type Member,
  type WorkspaceRole,
} from "@/lib/api/members";
import { createClient } from "@/lib/supabase/client";
import type { CreateInvitationInput } from "@/lib/validations/invitation";

import { queryKeys } from "./keys";
import {
  applyOptimistic,
  hasErrorCode,
  rollbackOptimistic,
  type MutationError,
  type OptimisticContext,
} from "./optimistic";

// 마지막 owner를 내리거나 내보내면 DB 트리거가 check_violation으로 거부한다.
const LAST_OWNER_MESSAGE =
  "워크스페이스에는 관리자가 한 명 이상 있어야 합니다.";

export function useMembers(workspaceId: string, initialData?: Member[]) {
  return useQuery({
    queryKey: queryKeys.members(workspaceId),
    queryFn: () => listMembers(createClient(), workspaceId),
    initialData,
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.members(workspaceId);

  return useMutation<
    void,
    MutationError,
    { userId: string; role: WorkspaceRole },
    OptimisticContext<Member[]>
  >({
    mutationFn: async ({ userId, role }) => {
      const { error } = await createClient()
        .from("workspace_members")
        .update({ role })
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onMutate: ({ userId, role }) =>
      applyOptimistic<Member[]>(queryClient, queryKey, (members) =>
        members.map((member) =>
          member.id === userId ? { ...member, role } : member,
        ),
      ),
    onError: (error, _vars, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: hasErrorCode(error, "23514")
          ? LAST_OWNER_MESSAGE
          : "역할을 바꾸지 못했습니다.",
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

// 내보내기와 스스로 나가기에 함께 쓴다. onRemoved는 성공한 뒤에만 실행된다 (예: 나간 뒤 다른 화면으로 이동).
export function useRemoveMember(
  workspaceId: string,
  options?: { onRemoved?: (userId: string) => void },
) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.members(workspaceId);

  return useMutation<void, MutationError, string, OptimisticContext<Member[]>>({
    mutationFn: async (userId) => {
      // RLS로 걸러지면 에러 없이 0행이 지워지므로, 지운 행을 돌려받아 확인한다.
      const { data, error } = await createClient()
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId)
        .select("user_id");
      if (error) throw error;
      if (data.length === 0) {
        throw new PostgrestError({
          message: "멤버를 내보낼 권한이 없습니다",
          details: "",
          hint: "",
          code: "42501",
        });
      }
    },
    onMutate: (userId) =>
      applyOptimistic<Member[]>(queryClient, queryKey, (members) =>
        members.filter((member) => member.id !== userId),
      ),
    onError: (error, _userId, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: hasErrorCode(error, "23514")
          ? LAST_OWNER_MESSAGE
          : "멤버를 내보내지 못했습니다.",
      }),
    onSuccess: (_data, userId) => options?.onRemoved?.(userId),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        // 나간 멤버가 맡은 이슈는 DB 트리거가 담당을 해제한다.
        queryClient.invalidateQueries({
          queryKey: queryKeys.issues(workspaceId),
        }),
      ]),
  });
}

// 낙관적으로 추가한 초대는 토큰이 아직 없다 (DB가 만든다). 저장이 끝나야 링크를 복사할 수 있다.
export const PENDING_TOKEN = "";

// owner만 조회할 수 있으므로 owner에게 보이는 컴포넌트에서만 쓴다.
export function useInvitations(
  workspaceId: string,
  initialData?: Invitation[],
) {
  return useQuery({
    queryKey: queryKeys.invitations(workspaceId),
    queryFn: () => listInvitations(createClient(), workspaceId),
    initialData,
  });
}

export function useCreateInvitation(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.invitations(workspaceId);

  return useMutation<
    Invitation,
    MutationError,
    CreateInvitationInput & { id: string },
    OptimisticContext<Invitation[]>
  >({
    mutationFn: async (input) => {
      const { data, error } = await createClient()
        .from("invitations")
        .insert({ workspace_id: workspaceId, ...input })
        .select(INVITATION_COLUMNS)
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: (input) =>
      applyOptimistic<Invitation[]>(queryClient, queryKey, (invitations) => [
        ...invitations,
        {
          ...input,
          workspace_id: workspaceId,
          token: PENDING_TOKEN,
          // 표시용 추정값. 실제 만료 시각은 DB 기본값(7일 뒤)이고 저장 후 다시 불러온다.
          expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
          created_at: new Date().toISOString(),
        },
      ]),
    // 결과로 받은 토큰을 바로 캐시에 넣어, 다시 불러오기 전에도 링크를 복사할 수 있게 한다.
    onSuccess: (invitation) => {
      queryClient.setQueryData<Invitation[]>(queryKey, (invitations) =>
        invitations?.map((item) =>
          item.id === invitation.id ? invitation : item,
        ),
      );
      toast.success(`${invitation.email} 초대 링크를 만들었습니다.`);
    },
    onError: (error, _input, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: hasErrorCode(error, "23505")
          ? "이미 초대한 이메일입니다. 기존 초대를 취소한 뒤 다시 초대하세요."
          : "초대를 만들지 못했습니다.",
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteInvitation(workspaceId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.invitations(workspaceId);

  return useMutation<
    void,
    MutationError,
    string,
    OptimisticContext<Invitation[]>
  >({
    mutationFn: async (id) => {
      const { error } = await createClient()
        .from("invitations")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) =>
      applyOptimistic<Invitation[]>(queryClient, queryKey, (invitations) =>
        invitations.filter((invitation) => invitation.id !== id),
      ),
    onError: (error, _id, context) =>
      rollbackOptimistic(queryClient, queryKey, context, {
        error,
        message: "초대를 취소하지 못했습니다.",
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });
}
