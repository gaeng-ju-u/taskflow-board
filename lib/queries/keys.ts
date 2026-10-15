// 쿼리 키는 여기서만 만든다. 같은 데이터는 어느 컴포넌트에서 쓰든 같은 키로 캐시를 공유한다.
// 워크스페이스 단위로 묶어 두면 워크스페이스를 떠날 때 한 번에 무효화할 수 있다.
export const queryKeys = {
  workspace: (workspaceId: string) => ["workspaces", workspaceId] as const,
  projects: (workspaceId: string) =>
    [...queryKeys.workspace(workspaceId), "projects"] as const,
};
