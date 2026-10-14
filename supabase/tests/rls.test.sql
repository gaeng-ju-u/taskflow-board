-- RLS와 트리거 검증. 실행: npx supabase test db --linked
-- 트랜잭션 안에서 실행하고 롤백하므로 DB에 데이터가 남지 않는다.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(16);

-- 사용자 A(워크스페이스 owner), B(외부인 → 초대받음), C(외부인)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.com', '{"full_name": "Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.com', '{}');

select is(
  (select name from profiles where id = '00000000-0000-0000-0000-00000000000a'),
  'Alice', '가입하면 OAuth 이름으로 profile이 생성된다'
);
select is(
  (select name from profiles where id = '00000000-0000-0000-0000-00000000000b'),
  'b', '이름이 없으면 이메일 앞부분을 쓴다'
);

create function pg_temp.login_as(user_id uuid, email text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims',
           json_build_object('sub', user_id, 'email', email, 'role', 'authenticated')::text, true);
$$;

-- A: 워크스페이스, 프로젝트, 이슈 생성
select pg_temp.login_as('00000000-0000-0000-0000-00000000000a', 'a@test.com');

insert into workspaces (name, slug) values ('Team A', 'team-a');
select is(
  (select role::text from workspace_members where user_id = '00000000-0000-0000-0000-00000000000a'),
  'owner', '워크스페이스를 만든 사람은 owner가 된다'
);

insert into projects (id, workspace_id, name, key)
select '00000000-0000-0000-0000-0000000000d1', id, 'TaskFlow', 'TF' from workspaces where slug = 'team-a';
insert into issues (project_id, title)
select id, t from projects, unnest(array['첫 이슈', '둘째 이슈']) t where key = 'TF';

select results_eq(
  'select number from issues order by number',
  array[1, 2], '이슈 번호가 프로젝트 안에서 1부터 발급된다'
);
select is(
  (select count(*)::int from activities where type = 'created'),
  2, '이슈 생성이 활동 로그에 기록된다'
);
select throws_ok(
  $$update issues set assignee_id = '00000000-0000-0000-0000-00000000000c' where number = 1$$,
  '23514', null, '멤버가 아닌 사용자는 담당자로 지정할 수 없다'
);
insert into invitations (workspace_id, email, token)
select id, 'b@test.com', '00000000-0000-0000-0000-0000000000ff' from workspaces where slug = 'team-a';

-- B: 초대 수락 전에는 아무것도 보이지 않고 쓸 수도 없다
select pg_temp.login_as('00000000-0000-0000-0000-00000000000b', 'b@test.com');

select is((select count(*)::int from workspaces), 0, '외부인은 워크스페이스를 볼 수 없다');
select is((select count(*)::int from issues), 0, '외부인은 이슈를 볼 수 없다');
select is((select count(*)::int from invitations), 0, '외부인은 초대 목록을 볼 수 없다');
select throws_ok(
  $$insert into issues (project_id, title)
    values ('00000000-0000-0000-0000-0000000000d1', '침입')$$,
  '42501', null, '외부인은 프로젝트 ID를 알아도 이슈를 만들 수 없다'
);

-- C가 B의 초대 토큰을 가로채도 수락할 수 없다
select pg_temp.login_as('00000000-0000-0000-0000-00000000000c', 'c@test.com');
select throws_ok(
  $$select accept_invitation('00000000-0000-0000-0000-0000000000ff')$$,
  '22023', null, '초대받은 이메일이 아니면 수락할 수 없다'
);

-- B: 초대 수락 후에는 함께 작업한다
select pg_temp.login_as('00000000-0000-0000-0000-00000000000b', 'b@test.com');
select is(
  accept_invitation('00000000-0000-0000-0000-0000000000ff'),
  'team-a', '초대를 수락하면 워크스페이스 slug를 돌려준다'
);
select is((select count(*)::int from issues), 2, '멤버가 되면 이슈가 보인다');

update issues set status = 'in_progress' where number = 1;
select is(
  (select payload from activities where type = 'updated'),
  '{"field": "status", "from": "backlog", "to": "in_progress"}'::jsonb,
  '상태 변경이 활동 로그에 기록된다'
);

insert into comments (issue_id, body) select id, 'B의 코멘트' from issues where number = 1;

-- A는 B의 코멘트를 지울 수 없다 (RLS로 걸러져 0행 삭제)
select pg_temp.login_as('00000000-0000-0000-0000-00000000000a', 'a@test.com');
delete from comments;
select is((select count(*)::int from comments), 1, '다른 사람의 코멘트는 삭제되지 않는다');

select throws_ok(
  $$insert into activities (issue_id, workspace_id, type)
    select id, workspace_id, 'fake' from issues limit 1$$,
  '42501', null, '사용자는 활동 로그를 직접 쓸 수 없다'
);

select * from finish();
rollback;
