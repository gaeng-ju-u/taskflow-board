// Realtime 채널 이름. 비공개 채널 권한 정책(private.can_access_channel)이 workspace:<id>로 시작하는지 보고
// 그 워크스페이스의 멤버만 들여보내므로, 채널 이름은 반드시 여기서 만든다.
export const realtimeTopics = {
  sync: (workspaceId: string) => `workspace:${workspaceId}:sync`,
  issue: (workspaceId: string, issueId: string) =>
    `workspace:${workspaceId}:issue:${issueId}`,
  project: (workspaceId: string, projectId: string) =>
    `workspace:${workspaceId}:project:${projectId}`,
};
