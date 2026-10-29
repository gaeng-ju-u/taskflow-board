-- 실시간 동기화: 이슈·코멘트·이슈 라벨·라벨·프로젝트 변경을 Supabase Realtime(Postgres Changes)으로 보낸다.
-- 추가·수정 이벤트는 구독자마다 RLS로 검사되어 다른 워크스페이스의 변경은 전달되지 않는다.

-- 삭제 이벤트에는 RLS가 적용되지 않고, replica identity가 full이어야 필터(workspace_id=eq.…)로 거를 수 있다.
-- full로 두어 삭제 이벤트도 자기 워크스페이스 것만 받게 한다. 수정·삭제 때 이전 행 전체가 WAL에 기록된다.
alter table public.issues replica identity full;
alter table public.comments replica identity full;
alter table public.labels replica identity full;
alter table public.projects replica identity full;

-- issue_labels에는 workspace_id가 없어 필터를 걸 수 없다. 추가는 RLS로 걸러지고,
-- 삭제는 기본키(issue_id, label_id)만 전달되어 내용이 노출되지 않는다.
alter publication supabase_realtime add table
  public.issues,
  public.comments,
  public.issue_labels,
  public.labels,
  public.projects;
