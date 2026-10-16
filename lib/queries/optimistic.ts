import type { QueryClient, QueryKey } from "@tanstack/react-query";
import type { PostgrestError } from "@supabase/supabase-js";
import { toast } from "sonner";

export type OptimisticContext<T> = { previous: T | undefined };

// 오프라인이 확실할 때 낙관적 업데이트 전에 던진다. 요청도 보내지 않는다.
export class OfflineError extends Error {
  constructor() {
    super("offline");
    this.name = "OfflineError";
  }
}

export type MutationError = PostgrestError | OfflineError;

export function hasErrorCode(error: MutationError, code: string) {
  return !(error instanceof OfflineError) && error.code === code;
}

// 브라우저가 연결이 없다고 알려준 경우만 오프라인으로 본다. 와이파이는 붙어 있지만 인터넷이 안 되는
// 경우는 여기서 걸리지 않고, 요청이 실패한 뒤 롤백된다.
function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

// 낙관적 업데이트: 진행 중인 요청을 취소하고, 이전 값을 저장한 뒤 캐시를 먼저 바꾼다.
// 오프라인이면 실패할 게 확실하므로 화면을 바꾸지 않고 OfflineError로 뮤테이션을 끝낸다
// (바뀐 척했다가 되돌리는 깜빡임 없이 원인을 바로 알린다).
export async function applyOptimistic<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  update: (current: T) => T,
): Promise<OptimisticContext<T>> {
  if (isOffline()) throw new OfflineError();
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<T>(queryKey);
  if (previous !== undefined)
    queryClient.setQueryData<T>(queryKey, update(previous));
  return { previous };
}

// 요청이 실패하면 저장해 둔 이전 값으로 되돌리고 알린다.
// 여러 캐시를 함께 바꾼 경우 나머지는 notify 없이 되돌리고, 알림은 한 번만 띄운다.
export function rollbackOptimistic<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  context: OptimisticContext<T> | undefined,
  notify?: { error: MutationError; message: string },
) {
  if (context?.previous !== undefined) {
    queryClient.setQueryData<T>(queryKey, context.previous);
  }
  if (!notify) return;
  toast.error(
    notify.error instanceof OfflineError
      ? "오프라인 상태라 저장할 수 없습니다. 인터넷 연결을 확인해 주세요."
      : notify.message,
  );
}
