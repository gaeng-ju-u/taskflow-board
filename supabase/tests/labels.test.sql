-- 라벨과 이슈 라벨 검증. 트랜잭션 안에서 실행하고 롤백하므로 DB에 데이터가 남지 않는다.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

-- A(Team A owner), C(Team C owner, A와 무관)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.com', '{}');

create function pg_temp.login_as(user_id uuid, email text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims',
           json_build_object('sub', user_id, 'email', email, 'role', 'authenticated')::text, true);
$$;

-- C: 자기 워크스페이스와 라벨
select pg_temp.login_as('00000000-0000-0000-0000-00000000000c', 'c@test.com');
insert into workspaces (id, name, slug) values ('00000000-0000-0000-0000-0000000000e3', 'Team C', 'team-c');
insert into labels (id, workspace_id, name) values
  ('00000000-0000-0000-0000-0000000001c1', '00000000-0000-0000-0000-0000000000e3', 'C의 라벨');

-- A: 워크스페이스, 프로젝트, 이슈, 라벨
select pg_temp.login_as('00000000-0000-0000-0000-00000000000a', 'a@test.com');
insert into workspaces (id, name, slug) values ('00000000-0000-0000-0000-0000000000e1', 'Team A', 'team-a');
insert into projects (id, workspace_id, name, key)
values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', 'TaskFlow', 'TF');
insert into issues (id, project_id, title)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '첫 이슈');
insert into labels (id, workspace_id, name, color) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000e1', '버그', '#ef4444');

select is(
  (select count(*)::int from labels),
  1, '다른 워크스페이스의 라벨은 보이지 않는다'
);
select throws_ok(
  $$insert into labels (workspace_id, name)
    values ('00000000-0000-0000-0000-0000000000e3', '침입')$$,
  '42501', null, '다른 워크스페이스에는 라벨을 만들 수 없다'
);
select throws_ok(
  $$insert into labels (workspace_id, name)
    values ('00000000-0000-0000-0000-0000000000e1', '버그')$$,
  '23505', null, '같은 워크스페이스에 같은 이름의 라벨을 만들 수 없다'
);
select throws_ok(
  $$insert into labels (workspace_id, name, color)
    values ('00000000-0000-0000-0000-0000000000e1', '대문자 색', '#EF4444')$$,
  '23514', null, '라벨 색은 소문자 #rrggbb 형식이어야 한다'
);

insert into issue_labels (issue_id, label_id)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000001a1');
select is(
  (select count(*)::int from issue_labels),
  1, '자기 워크스페이스의 라벨을 이슈에 붙일 수 있다'
);
select throws_ok(
  $$insert into issue_labels (issue_id, label_id)
    values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000001c1')$$,
  '42501', null, '다른 워크스페이스의 라벨은 id를 알아도 붙일 수 없다'
);

-- C는 A의 이슈 라벨을 볼 수 없다
select pg_temp.login_as('00000000-0000-0000-0000-00000000000c', 'c@test.com');
select is(
  (select count(*)::int from issue_labels),
  0, '외부인은 다른 워크스페이스의 이슈 라벨을 볼 수 없다'
);

-- A가 라벨을 지우면 이슈에서도 빠진다
select pg_temp.login_as('00000000-0000-0000-0000-00000000000a', 'a@test.com');
delete from labels where id = '00000000-0000-0000-0000-0000000001a1';
select is(
  (select count(*)::int from issue_labels),
  0, '라벨을 지우면 이슈에 붙은 라벨도 함께 지워진다'
);

select * from finish();
rollback;
