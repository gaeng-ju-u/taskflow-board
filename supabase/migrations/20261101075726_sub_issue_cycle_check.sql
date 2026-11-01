-- 서브이슈: 상위 이슈 지정이 순환(A → B → A)을 만들지 않도록 검사를 추가한다.
-- 나머지는 기존 함수(20261014113542_triggers.sql)와 같다.
-- 동시에 두 이슈가 서로를 상위로 지정하는 경우는 막지 않는다 (순차 요청의 순환만 막는다).
create or replace function public.validate_issue_refs(issue public.issues)
returns void
language plpgsql stable security definer set search_path = ''
as $$
begin
  if issue.assignee_id is not null and not exists (
    select 1 from public.workspace_members
    where workspace_id = issue.workspace_id and user_id = issue.assignee_id
  ) then
    raise exception '담당자는 워크스페이스 멤버여야 합니다' using errcode = 'check_violation';
  end if;

  if issue.parent_id is not null and not exists (
    select 1 from public.issues
    where id = issue.parent_id and project_id = issue.project_id
  ) then
    raise exception '상위 이슈는 같은 프로젝트에 있어야 합니다' using errcode = 'check_violation';
  end if;

  -- 새 상위 이슈에서 위로 올라가다 자기 자신을 만나면 순환이다.
  -- union(중복 제거)이라 기존 데이터에 순환이 있어도 끝난다.
  if issue.parent_id is not null and exists (
    with recursive ancestors (id) as (
      select issue.parent_id
      union
      select parent.parent_id
      from public.issues parent
      join ancestors on parent.id = ancestors.id
      where parent.parent_id is not null
    )
    select 1 from ancestors where id = issue.id
  ) then
    raise exception '하위 이슈를 상위 이슈로 지정할 수 없습니다' using errcode = 'check_violation';
  end if;

  if issue.cycle_id is not null and not exists (
    select 1 from public.cycles
    where id = issue.cycle_id and project_id = issue.project_id
  ) then
    raise exception '사이클은 같은 프로젝트에 있어야 합니다' using errcode = 'check_violation';
  end if;
end;
$$;
