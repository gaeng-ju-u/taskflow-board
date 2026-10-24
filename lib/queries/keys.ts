// 쿼리 키는 여기서만 만든다. 같은 데이터는 어느 컴포넌트에서 쓰든 같은 키로 캐시를 공유한다.
// 워크스페이스 단위로 묶어 두면 워크스페이스를 떠날 때 한 번에 무효화할 수 있다.
// invalidateQueries는 앞부분이 같은 키를 모두 무효화하므로, 이슈를 projects 아래에 두지 않는다
// (프로젝트 이름만 바꿔도 이슈 목록까지 다시 불러오게 된다).
export const queryKeys = {
  workspace: (workspaceId: string) => ["workspaces", workspaceId] as const,
  projects: (workspaceId: string) =>
    [...queryKeys.workspace(workspaceId), "projects"] as const,
  members: (workspaceId: string) =>
    [...queryKeys.workspace(workspaceId), "members"] as const,
  invitations: (workspaceId: string) =>
    [...queryKeys.workspace(workspaceId), "invitations"] as const,
  labels: (workspaceId: string) =>
    [...queryKeys.workspace(workspaceId), "labels"] as const,
  issues: (workspaceId: string) =>
    [...queryKeys.workspace(workspaceId), "issues"] as const,
  issueList: (workspaceId: string, projectId: string) =>
    [...queryKeys.issues(workspaceId), "list", projectId] as const,
  issue: (workspaceId: string, issueId: string) =>
    [...queryKeys.issues(workspaceId), "detail", issueId] as const,
};
