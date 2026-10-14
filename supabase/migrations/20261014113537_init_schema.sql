-- 테이블, enum, 인덱스. 권한은 rls_policies, 자동화는 triggers 마이그레이션에서 다룬다.

create type public.workspace_role as enum ('owner', 'member');
create type public.issue_status as enum ('backlog', 'todo', 'in_progress', 'done', 'canceled');
create type public.issue_priority as enum ('none', 'low', 'medium', 'high', 'urgent');

-- auth.users와 1:1. 가입 시 트리거로 생성된다.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 50),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_id_idx on public.workspace_members (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null check (email = lower(email)),
  token uuid not null unique default gen_random_uuid(),
  role public.workspace_role not null default 'member',
  invited_by uuid not null default auth.uid() references public.profiles (id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index invitations_workspace_id_idx on public.invitations (workspace_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  -- 이슈 번호 접두사 (예: TF-123의 TF)
  key text not null check (key ~ '^[A-Z][A-Z0-9]{1,4}$'),
  -- 마지막으로 발급한 이슈 번호. 이슈 insert 트리거가 증가시킨다.
  issue_seq integer not null default 0,
  created_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create table public.cycles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 50),
  starts_at date not null,
  ends_at date not null,
  created_at timestamptz not null default now(),
  check (ends_at >= starts_at)
);
create index cycles_project_id_idx on public.cycles (project_id);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  -- RLS와 Realtime 필터를 조인 없이 처리하려고 비정규화했다. 트리거가 project에서 채운다.
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  number integer not null,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  status public.issue_status not null default 'backlog',
  priority public.issue_priority not null default 'none',
  assignee_id uuid references public.profiles (id) on delete set null,
  parent_id uuid references public.issues (id) on delete set null,
  cycle_id uuid references public.cycles (id) on delete set null,
  -- 같은 status 컬럼 안에서의 순서. 두 카드 사이 값을 넣어 한 행만 수정한다.
  sort_order double precision not null default 0,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, number),
  check (parent_id is distinct from id)
);
create index issues_board_idx on public.issues (project_id, status, sort_order);
create index issues_workspace_id_idx on public.issues (workspace_id);
create index issues_assignee_id_idx on public.issues (assignee_id);
create index issues_parent_id_idx on public.issues (parent_id);
create index issues_cycle_id_idx on public.issues (cycle_id);

create table public.labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 30),
  color text not null default '#6b7280' check (color ~ '^#[0-9a-f]{6}$'),
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.issue_labels (
  issue_id uuid not null references public.issues (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  primary key (issue_id, label_id)
);
create index issue_labels_label_id_idx on public.issue_labels (label_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_issue_id_idx on public.comments (issue_id, created_at);

-- 트리거만 기록한다. 사용자는 읽기만 가능.
create table public.activities (
  id bigint generated always as identity primary key,
  issue_id uuid not null references public.issues (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activities_issue_id_idx on public.activities (issue_id, created_at);
