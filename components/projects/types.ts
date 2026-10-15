export type WorkspaceRef = { id: string; name: string; slug: string };

export function projectPath(workspaceSlug: string, projectKey: string) {
  return `/${workspaceSlug}/projects/${projectKey.toLowerCase()}`;
}
