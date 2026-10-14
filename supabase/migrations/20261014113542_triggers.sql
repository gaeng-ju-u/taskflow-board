-- 가입, 워크스페이스 생성, 이슈 번호, 무결성 검사, 활동 로그를 자동화한다.
-- security definer 함수는 search_path를 비워 스키마 하이재킹을 막고, 모든 이름을 스키마로 한정한다.

-- 가입하면 profile을 만든다. OAuth 메타데이터에서 이름과 아바타를 가져온다.
create function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'user_name',
      split_part(new.email, '@', 1),
      ''
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 워크스페이스를 만든 사람을 owner로 등록한다.
create function public.handle_new_workspace()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.workspace_members (workspace_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

create trigger on_workspace_created
  after insert on public.workspaces
  for each row execute function public.handle_new_workspace();

-- 담당자, 상위 이슈, 사이클이 같은 워크스페이스/프로젝트에 속하는지 확인한다.
create function public.validate_issue_refs(issue public.issues)
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

  if issue.cycle_id is not null and not exists (
    select 1 from public.cycles
    where id = issue.cycle_id and project_id = issue.project_id
  ) then
    raise exception '사이클은 같은 프로젝트에 있어야 합니다' using errcode = 'check_violation';
  end if;
end;
$$;

-- 이슈 생성: project에서 workspace_id를 채우고 번호를 발급한다.
-- projects 행을 update하므로 동시에 생성해도 행 잠금으로 번호가 겹치지 않는다.
-- 멤버가 아니면 이어지는 RLS with check에서 거부되고 트랜잭션 전체가 롤백된다.
create function public.issues_before_insert()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.projects
  set issue_seq = issue_seq + 1
  where id = new.project_id
  returning issue_seq, workspace_id into new.number, new.workspace_id;

  if new.number is null then
    raise exception '프로젝트를 찾을 수 없습니다' using errcode = 'foreign_key_violation';
  end if;

  new.created_by := (select auth.uid());
  perform public.validate_issue_refs(new);
  return new;
end;
$$;

create trigger issues_before_insert
  before insert on public.issues
  for each row execute function public.issues_before_insert();

-- 이슈 수정: 소속과 번호는 고정하고 updated_at을 갱신한다.
create function public.issues_before_update()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.project_id <> old.project_id then
    raise exception '이슈를 다른 프로젝트로 옮길 수 없습니다' using errcode = 'check_violation';
  end if;
  new.workspace_id := old.workspace_id;
  new.number := old.number;
  new.created_by := old.created_by;
  new.created_at := old.created_at;
  new.updated_at := now();

  if new.assignee_id is distinct from old.assignee_id
    or new.parent_id is distinct from old.parent_id
    or new.cycle_id is distinct from old.cycle_id then
    perform public.validate_issue_refs(new);
  end if;
  return new;
end;
$$;

create trigger issues_before_update
  before update on public.issues
  for each row execute function public.issues_before_update();

-- 코멘트: issue에서 workspace_id를 채우고, 수정 시 소속을 고정한다.
-- invoker 권한으로 조회하므로 볼 수 없는 이슈에는 코멘트를 달 수 없다.
create function public.comments_before_write()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select workspace_id into new.workspace_id from public.issues where id = new.issue_id;
    if new.workspace_id is null then
      raise exception '이슈를 찾을 수 없습니다' using errcode = 'foreign_key_violation';
    end if;
  else
    new.issue_id := old.issue_id;
    new.workspace_id := old.workspace_id;
    new.author_id := old.author_id;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger comments_before_write
  before insert or update on public.comments
  for each row execute function public.comments_before_write();

-- 활동 로그: 생성과 주요 필드 변경을 기록한다. payload는 {field, from, to}.
create function public.log_issue_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  field text;
  old_value jsonb;
  new_value jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.activities (issue_id, workspace_id, actor_id, type)
    values (new.id, new.workspace_id, actor, 'created');
    return null;
  end if;

  foreach field in array array['title', 'status', 'priority', 'assignee_id', 'parent_id', 'cycle_id'] loop
    old_value := to_jsonb(old) -> field;
    new_value := to_jsonb(new) -> field;
    if old_value is distinct from new_value then
      insert into public.activities (issue_id, workspace_id, actor_id, type, payload)
      values (
        new.id, new.workspace_id, actor, 'updated',
        jsonb_build_object('field', field, 'from', old_value, 'to', new_value)
      );
    end if;
  end loop;
  return null;
end;
$$;

create trigger issues_activity
  after insert or update on public.issues
  for each row execute function public.log_issue_activity();

-- 초대 수락. 초대받은 사람은 아직 멤버가 아니라서 RLS를 우회하는 함수로 처리한다.
-- 로그인한 이메일과 초대 이메일이 같아야 한다. 수락한 워크스페이스의 slug를 돌려준다.
create function public.accept_invitation(invite_token uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  invite public.invitations;
  ws_slug text;
begin
  select * into invite from public.invitations
  where token = invite_token
  for update;

  if not found
    or invite.accepted_at is not null
    or invite.expires_at < now()
    or invite.email <> lower(coalesce((select auth.jwt() ->> 'email'), '')) then
    raise exception '유효하지 않은 초대입니다' using errcode = 'invalid_parameter_value';
  end if;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (invite.workspace_id, (select auth.uid()), invite.role)
  on conflict (workspace_id, user_id) do nothing;

  update public.invitations set accepted_at = now() where id = invite.id;

  select slug into ws_slug from public.workspaces where id = invite.workspace_id;
  return ws_slug;
end;
$$;

revoke execute on function public.accept_invitation(uuid) from public, anon;
grant execute on function public.accept_invitation(uuid) to authenticated;

-- 트리거 전용 함수는 API(RPC)로 직접 호출할 수 없게 한다.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_new_workspace() from public, anon, authenticated;
revoke execute on function public.validate_issue_refs(public.issues) from public, anon, authenticated;
revoke execute on function public.issues_before_insert() from public, anon, authenticated;
revoke execute on function public.issues_before_update() from public, anon, authenticated;
revoke execute on function public.log_issue_activity() from public, anon, authenticated;
