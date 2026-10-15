import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

export type OptimisticContext<T> = { previous: T | undefined };

// 낙관적 업데이트: 진행 중인 요청을 취소하고, 이전 값을 저장한 뒤 캐시를 먼저 바꾼다.
export async function applyOptimistic<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  update: (current: T) => T,
): Promise<OptimisticContext<T>> {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<T>(queryKey);
  if (previous !== undefined)
    queryClient.setQueryData<T>(queryKey, update(previous));
  return { previous };
}

// 요청이 실패하면 저장해 둔 이전 값으로 되돌리고 알린다.
export function rollbackOptimistic<T>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  context: OptimisticContext<T> | undefined,
  message: string,
) {
  if (context?.previous !== undefined) {
    queryClient.setQueryData<T>(queryKey, context.previous);
  }
  toast.error(message);
}
