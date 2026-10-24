import "server-only";

import { getIssues } from "@/lib/data/issues";
import { getLabels } from "@/lib/data/labels";
import { getMembers } from "@/lib/data/members";
import { getProjectByKey } from "@/lib/data/projects";
import { getWorkspaceBySlug } from "@/lib/data/workspaces";

type ProjectParams = Promise<{ workspace: string; key: string }>;

// 프로젝트 화면(레이아웃, 목록, 보드)이 공통으로 쓰는 조회. 각 함수가 React cache로 감싸져 있어
// 여러 컴포넌트가 불러도 요청마다 한 번만 조회한다.
export async function loadProject(params: ProjectParams) {
  const { workspace: slug, key } = await params;
  const workspace = await getWorkspaceBySlug(slug);
  const project = await getProjectByKey(workspace.id, key);
  return { workspace, project };
}

export async function loadProjectIssues(params: ProjectParams) {
  const { workspace, project } = await loadProject(params);
  const [issues, members, labels] = await Promise.all([
    getIssues(project.id),
    getMembers(workspace.id),
    getLabels(workspace.id),
  ]);
  return { workspace, project, issues, members, labels };
}
