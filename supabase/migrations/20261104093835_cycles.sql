-- 사이클: 워크스페이스 비정규화, RLS 단순화, 기간 겹침 금지, Realtime 발행.

-- 1. workspace_id 비정규화 (issues, comments와 같은 이유: RLS와 Realtime 필터를 조인 없이 처리)
alter table public.cycles
  add column workspace_id uuid references public.workspaces (id) on delete cascade;
update public.cycles c
set workspace_id = p.workspace_id
from public.projects p
where p.id = c.project_id;
alter table public.cycles alter column workspace_id set not null;
create index cycles_workspace_id_idx on public.cycles (workspace_id);

-- 생성: project에서 workspace_id를 채운다. invoker 권한으로 조회하므로 볼 수 없는 프로젝트에는 만들 수 없다.
-- 수정: 소속(프로젝트, 워크스페이스)과 생성 시각을 고정한다.
create function public.cycles_before_write()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    select workspace_id into new.workspace_id from public.projects where id = new.project_id;
    if new.workspace_id is null then
      raise exception '프로젝트를 찾을 수 없습니다' using errcode = 'foreign_key_violation';
    end if;
  else
    if new.project_id <> old.project_id then
      raise exception '사이클을 다른 프로젝트로 옮길 수 없습니다' using errcode = 'check_violation';
    end if;
    new.workspace_id := old.workspace_id;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger cycles_before_write
  before insert or update on public.cycles
  for each row execute function public.cycles_before_write();

-- 2. RLS: 프로젝트를 거치지 않고 workspace_id로 바로 확인한다.
drop policy "멤버는 사이클 관리" on public.cycles;
create policy "멤버는 사이클 관리" on public.cycles
  for all to authenticated
  using (private.is_workspace_member(workspace_id))
  with check (private.is_workspace_member(workspace_id));

-- 3. 같은 프로젝트의 사이클 기간은 겹칠 수 없다. "현재 사이클"이 하나로 정해지게 한다.
-- 종료일을 포함하는 범위('[]')라 앞 사이클의 종료일에 다음 사이클을 시작할 수 없다.
-- uuid의 같음(=)을 GiST 인덱스에서 쓰려면 btree_gist가 필요하다. 위반 시 오류 코드 23P01.
create extension if not exists btree_gist with schema extensions;
alter table public.cycles
  add constraint cycles_no_overlap
  exclude using gist (
    project_id with =,
    daterange(starts_at, ends_at, '[]') with &&
  );

-- 4. Realtime: 다른 사람이 만들거나 바꾼 사이클을 반영한다. 삭제 이벤트도 workspace_id로 거르도록 full.
alter table public.cycles replica identity full;
alter publication supabase_realtime add table public.cycles;
