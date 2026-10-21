-- 멤버 관리: 역할 변경 범위 제한, 마지막 owner 보호, 제거된 멤버의 담당 해제, 중복 초대 방지, 초대 정보 조회.

-- owner의 update 정책은 행 단위라 user_id, workspace_id까지 바꿀 수 있었다. 역할 컬럼만 수정하게 한다.
revoke update on public.workspace_members from anon, authenticated;
grant update (role) on public.workspace_members to authenticated;

-- 마지막 owner는 역할을 낮추거나 나갈 수 없다. 관리자가 없는 워크스페이스가 남지 않게 한다.
-- 워크스페이스 행을 잠가 두 owner가 동시에 서로를 내리는 경우도 막는다.
create function private.ensure_workspace_owner()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if old.role <> 'owner' or (tg_op = 'UPDATE' and new.role = 'owner') then
    return coalesce(new, old);
  end if;

  perform 1 from public.workspaces where id = old.workspace_id for update;
  -- 워크스페이스 삭제로 멤버가 함께 지워지는 경우 (cascade 시점에는 워크스페이스 행이 이미 없다)
  if not found then
    return coalesce(new, old);
  end if;

  if not exists (
    select 1 from public.workspace_members
    where workspace_id = old.workspace_id and role = 'owner' and user_id <> old.user_id
  ) then
    raise exception '워크스페이스에는 owner가 한 명 이상 있어야 합니다' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger workspace_members_ensure_owner
  before update of role or delete on public.workspace_members
  for each row execute function private.ensure_workspace_owner();

-- 멤버가 나가거나 제거되면 그 워크스페이스에서 맡은 이슈의 담당을 해제한다.
-- 그대로 두면 프로필이 보이지 않는(RLS) 담당자가 남는다.
create function private.unassign_removed_member()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  -- 워크스페이스 삭제로 지워지는 경우에는 이슈도 함께 지워지므로 건너뛴다.
  if not exists (select 1 from public.workspaces where id = old.workspace_id) then
    return null;
  end if;

  update public.issues set assignee_id = null
  where workspace_id = old.workspace_id and assignee_id = old.user_id;
  return null;
end;
$$;

create trigger workspace_members_unassign
  after delete on public.workspace_members
  for each row execute function private.unassign_removed_member();

revoke execute on function private.ensure_workspace_owner() from public, anon, authenticated;
revoke execute on function private.unassign_removed_member() from public, anon, authenticated;

-- 같은 이메일로 대기 중인 초대는 하나만 둔다. 다시 초대하려면 기존 초대를 취소한다.
create unique index invitations_pending_email_idx
  on public.invitations (workspace_id, email)
  where accepted_at is null;

-- 초대 수락 화면용. 초대받은 사람은 아직 멤버가 아니라 RLS로는 초대를 읽을 수 없다.
-- 토큰을 아는 사람에게만 워크스페이스 이름, 초대한 사람, 초대 이메일을 보여준다.
create function public.get_invitation(invite_token uuid)
returns table (
  workspace_name text,
  workspace_slug text,
  inviter_name text,
  email text,
  role public.workspace_role,
  expires_at timestamptz,
  accepted_at timestamptz,
  is_expired boolean,
  is_member boolean
)
language sql stable security definer set search_path = ''
as $$
  select
    w.name,
    w.slug,
    coalesce(p.name, ''),
    i.email,
    i.role,
    i.expires_at,
    i.accepted_at,
    -- accept_invitation과 같은 기준(DB 시각)으로 판단한다.
    i.expires_at < now(),
    exists (
      select 1 from public.workspace_members m
      where m.workspace_id = i.workspace_id and m.user_id = (select auth.uid())
    )
  from public.invitations i
  join public.workspaces w on w.id = i.workspace_id
  left join public.profiles p on p.id = i.invited_by
  where i.token = invite_token;
$$;

revoke execute on function public.get_invitation(uuid) from public, anon;
grant execute on function public.get_invitation(uuid) to authenticated;
