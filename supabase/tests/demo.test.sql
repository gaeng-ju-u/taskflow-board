-- 데모 모드 검증: 초기화 결과, 데모 계정 제한, cron 등록. 트랜잭션 안에서 실행하고 롤백하므로 DB에 데이터가 남지 않는다.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(22);

-- 데모 계정은 대시보드에서 만든다. 아직 없으면 테스트 안에서만 만든다.
insert into auth.users (id, email, raw_user_meta_data)
select '00000000-0000-0000-0000-0000000000dd', 'demo@taskflow.example', '{}'
where not exists (select 1 from auth.users where email = 'demo@taskflow.example');

-- 로그인한 역할(authenticated)은 auth.users를 읽을 수 없어 id를 미리 설정값에 담아 둔다.
select set_config('test.demo_id', (select id::text from auth.users where email = 'demo@taskflow.example'), true);
create function pg_temp.demo_id() returns uuid language sql as $$
  select current_setting('test.demo_id')::uuid;
$$;
create function pg_temp.issue(project_key text, num int) returns uuid language sql as $$
  select i.id from issues i join projects p on p.id = i.project_id
  where p.workspace_id = 'de000000-0000-4000-8000-000000000001' and p.key = project_key and i.number = num;
$$;
create function pg_temp.login_as(user_id uuid, email text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims',
           json_build_object('sub', user_id, 'email', email, 'role', 'authenticated')::text, true);
$$;

select private.reset_demo_workspace();

select is(
  (select array_agg(name order by name) from profiles where id::text like 'de000000-0000-4000-8000-00000000a00_'),
  array['김민준', '박지훈', '이서연', '최유나'],
  '가상 팀원 4명의 프로필이 있다'
);
select is(
  (select role::text from workspace_members m join workspaces w on w.id = m.workspace_id
   where w.slug = 'taskflow-demo' and m.user_id = pg_temp.demo_id()),
  'owner', '데모 계정은 데모 워크스페이스의 owner다'
);
select is(
  (select count(*)::int from workspace_members where workspace_id = 'de000000-0000-4000-8000-000000000001'),
  5, '멤버는 데모 계정과 팀원 4명이다'
);
select is(
  (select array_agg(key || ':' || issue_seq order by key) from projects where workspace_id = 'de000000-0000-4000-8000-000000000001'),
  array['APP:5', 'WEB:22'], '프로젝트 2개, 이슈 번호는 1부터 차례로 발급된다'
);
select is(
  (select count(*)::int from cycles
   where workspace_id = 'de000000-0000-4000-8000-000000000001'
     and (now() at time zone 'Asia/Seoul')::date between starts_at and ends_at),
  1, '오늘 진행 중인 사이클이 하나 있다'
);
select is(
  (select count(*)::int from issues where workspace_id = 'de000000-0000-4000-8000-000000000001' and parent_id is not null),
  5, '하위 이슈가 있다'
);
select is(
  (select count(*)::int from issues where assignee_id = pg_temp.demo_id()),
  3, '데모 계정에게 배정된 이슈가 있다 (나에게 할당 필터)'
);
select is(
  (select actor_id from activities where issue_id = pg_temp.issue('WEB', 5) and type = 'created'),
  'de000000-0000-4000-8000-00000000a001'::uuid, '생성 기록의 행위자는 만든 팀원이다'
);
select is(
  (select count(*)::int from activities a join issues i on i.id = a.issue_id
   where i.workspace_id = 'de000000-0000-4000-8000-000000000001'
     and a.type in ('created', 'label_added') and a.created_at <> i.created_at),
  0, '생성·라벨 기록의 시각은 이슈를 만든 시각이다'
);
select is(
  (select count(*)::int from activities where workspace_id = 'de000000-0000-4000-8000-000000000001' and created_at > now()),
  0, '미래 시각의 활동 기록은 없다'
);
select is(
  (select count(*)::int from comments where workspace_id = 'de000000-0000-4000-8000-000000000001' and author_id = pg_temp.demo_id()),
  1, '데모 계정이 쓴 코멘트가 있다 (수정·삭제 체험)'
);

-- 다시 초기화해도 같은 결과다 (바꾼 내용은 되돌아간다)
update issues set title = '바뀐 제목' where id = pg_temp.issue('WEB', 1);
delete from labels where name = '버그' and workspace_id = 'de000000-0000-4000-8000-000000000001';
select private.reset_demo_workspace();
select is(
  (select title from issues where id = 'de000000-0000-4000-8000-000000001001'),
  '온보딩 흐름 개선', '다시 초기화하면 같은 id로 원래 내용이 돌아온다'
);
select is(
  (select count(*)::int from issues where workspace_id = 'de000000-0000-4000-8000-000000000001')
  + (select count(*)::int from labels where workspace_id = 'de000000-0000-4000-8000-000000000001') * 100,
  527, '다시 초기화해도 이슈 27개, 라벨 5개다'
);

-- 데모 계정 제한
select pg_temp.login_as(pg_temp.demo_id(), 'demo@taskflow.example');
select throws_ok(
  $$ delete from projects where key = 'WEB' and workspace_id = 'de000000-0000-4000-8000-000000000001' $$,
  'TF001', null, '데모 계정은 프로젝트를 삭제할 수 없다'
);
select throws_ok(
  $$ insert into invitations (workspace_id, email) values ('de000000-0000-4000-8000-000000000001', 'someone@test.com') $$,
  'TF001', null, '데모 계정은 초대할 수 없다'
);
select throws_ok(
  $$ update workspace_members set role = 'owner' where user_id = 'de000000-0000-4000-8000-00000000a001' $$,
  'TF001', null, '데모 계정은 역할을 바꿀 수 없다'
);
select throws_ok(
  format($$ delete from workspace_members where user_id = %L $$, pg_temp.demo_id()),
  'TF001', null, '데모 계정은 워크스페이스를 나갈 수 없다'
);
select throws_ok(
  $$ insert into workspaces (name, slug) values ('새 워크스페이스', 'demo-new') $$,
  'TF001', null, '데모 계정은 워크스페이스를 만들 수 없다'
);
select throws_ok(
  format($$ update profiles set name = '바꾼 이름' where id = %L $$, pg_temp.demo_id()),
  'TF001', null, '데모 계정은 프로필 이름을 바꿀 수 없다'
);
select lives_ok(
  $$ update issues set status = 'done' where id = 'de000000-0000-4000-8000-000000001010';
     insert into comments (issue_id, body) values ('de000000-0000-4000-8000-000000001010', '확인했습니다') $$,
  '데모 계정도 이슈를 바꾸고 코멘트를 쓸 수 있다'
);

reset role;
select is(
  (select schedule from cron.job where jobname = 'reset-demo-workspace'),
  '0 * * * *', '매시 정각 초기화가 cron에 등록되어 있다'
);
select ok(
  not has_function_privilege('authenticated', 'private.reset_demo_workspace()', 'execute'),
  '로그인 사용자는 초기화 함수를 직접 실행할 수 없다'
);

select * from finish();
rollback;
