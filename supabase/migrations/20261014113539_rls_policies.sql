-- 원칙: 워크스페이스 멤버만 그 워크스페이스의 데이터를 읽고 쓴다.
-- 헬퍼 함수는 security definer로 실행해 workspace_members 정책이 자기 자신을 재귀 참조하지 않게 한다.
-- auth.uid()는 (select auth.uid())로 감싸 행마다 다시 계산하지 않게 한다.

create function public.is_workspace_member(ws uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = (select auth.uid())
  );
$$;

create function public.is_workspace_owner(ws uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = (select auth.uid()) and role = 'owner'
  );
$$;

-- 같은 워크스페이스에 속한 사용자인지 (담당자 선택, 아바타 표시용)
create function public.shares_workspace_with(other uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members me
    join public.workspace_members them on them.workspace_id = me.workspace_id
    where me.user_id = (select auth.uid()) and them.user_id = other
  );
$$;

revoke execute on function public.is_workspace_member(uuid) from public, anon;
revoke execute on function public.is_workspace_owner(uuid) from public, anon;
revoke execute on function public.shares_workspace_with(uuid) from public, anon;

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.invitations enable row level security;
alter table public.projects enable row level security;
alter table public.cycles enable row level security;
alter table public.issues enable row level security;
alter table public.labels enable row level security;
alter table public.issue_labels enable row level security;
alter table public.comments enable row level security;
alter table public.activities enable row level security;

-- profiles
create policy "본인과 같은 워크스페이스 멤버의 프로필 조회" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_workspace_with(id));
create policy "본인 프로필 수정" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- workspaces
-- created_by 조건은 생성 직후 insert ... returning으로 행을 돌려받기 위해 필요하다.
create policy "멤버는 워크스페이스 조회" on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id) or created_by = (select auth.uid()));
create policy "로그인 사용자는 워크스페이스 생성" on public.workspaces
  for insert to authenticated
  with check (created_by = (select auth.uid()));
create policy "owner는 워크스페이스 수정" on public.workspaces
  for update to authenticated
  using (public.is_workspace_owner(id))
  with check (public.is_workspace_owner(id));
create policy "owner는 워크스페이스 삭제" on public.workspaces
  for delete to authenticated
  using (public.is_workspace_owner(id));

-- workspace_members: 추가는 트리거(생성자)와 accept_invitation 함수로만 한다.
create policy "멤버는 멤버 목록 조회" on public.workspace_members
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "owner는 역할 변경" on public.workspace_members
  for update to authenticated
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));
create policy "owner는 멤버 제거, 본인은 탈퇴" on public.workspace_members
  for delete to authenticated
  using (public.is_workspace_owner(workspace_id) or user_id = (select auth.uid()));

-- invitations: owner만 관리. 초대받은 사람은 accept_invitation 함수로 수락한다.
create policy "owner는 초대 조회" on public.invitations
  for select to authenticated
  using (public.is_workspace_owner(workspace_id));
create policy "owner는 초대 생성" on public.invitations
  for insert to authenticated
  with check (public.is_workspace_owner(workspace_id) and invited_by = (select auth.uid()));
create policy "owner는 초대 취소" on public.invitations
  for delete to authenticated
  using (public.is_workspace_owner(workspace_id));

-- projects, labels: 멤버 전체 권한
create policy "멤버는 프로젝트 관리" on public.projects
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "멤버는 라벨 관리" on public.labels
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- cycles: project를 거쳐 워크스페이스를 확인한다.
create policy "멤버는 사이클 관리" on public.cycles
  for all to authenticated
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and public.is_workspace_member(p.workspace_id)
  ))
  with check (exists (
    select 1 from public.projects p
    where p.id = project_id and public.is_workspace_member(p.workspace_id)
  ));

-- issues: workspace_id는 트리거가 project에서 채우므로 with check 시점에는 이미 정확하다.
create policy "멤버는 이슈 관리" on public.issues
  for all to authenticated
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- issue_labels: 이슈와 라벨이 같은 워크스페이스이고 그 멤버여야 한다.
create policy "멤버는 이슈 라벨 관리" on public.issue_labels
  for all to authenticated
  using (exists (
    select 1 from public.issues i
    where i.id = issue_id and public.is_workspace_member(i.workspace_id)
  ))
  with check (exists (
    select 1 from public.issues i
    join public.labels l on l.workspace_id = i.workspace_id
    where i.id = issue_id and l.id = label_id and public.is_workspace_member(i.workspace_id)
  ));

-- comments: 멤버는 읽고 쓰고, 수정과 삭제는 작성자만
create policy "멤버는 코멘트 조회" on public.comments
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
create policy "멤버는 코멘트 작성" on public.comments
  for insert to authenticated
  with check (public.is_workspace_member(workspace_id) and author_id = (select auth.uid()));
create policy "작성자는 코멘트 수정" on public.comments
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()) and public.is_workspace_member(workspace_id));
create policy "작성자는 코멘트 삭제" on public.comments
  for delete to authenticated
  using (author_id = (select auth.uid()));

-- activities: 읽기만. 쓰기 정책이 없으므로 트리거(security definer)만 기록할 수 있다.
create policy "멤버는 활동 로그 조회" on public.activities
  for select to authenticated
  using (public.is_workspace_member(workspace_id));
