-- 사이클 검증. 트랜잭션 안에서 실행하고 롤백하므로 DB에 데이터가 남지 않는다.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(12);

-- A(Team A owner), C(외부인)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.com', '{}');

create function pg_temp.login_as(user_id uuid, email text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims',
           json_build_object('sub', user_id, 'email', email, 'role', 'authenticated')::text, true);
$$;

select pg_temp.login_as('00000000-0000-0000-0000-00000000000a', 'a@test.com');
insert into workspaces (id, name, slug) values ('00000000-0000-0000-0000-0000000000e1', 'Team A', 'team-a');
insert into projects (id, workspace_id, name, key) values
  ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', 'TaskFlow', 'TF'),
  ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000e1', 'Other', 'OT');
insert into cycles (id, project_id, name, starts_at, ends_at) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000d1', '사이클 1', '2026-11-02', '2026-11-15');
insert into issues (id, project_id, title, cycle_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '이슈', '00000000-0000-0000-0000-0000000000c1');

select is(
  (select workspace_id from cycles where id = '00000000-0000-0000-0000-0000000000c1'),
  '00000000-0000-0000-0000-0000000000e1'::uuid,
  '사이클의 workspace_id는 프로젝트에서 채워진다'
);

select throws_ok(
  $$ insert into cycles (project_id, name, starts_at, ends_at)
     values ('00000000-0000-0000-0000-0000000000d1', '겹침', '2026-11-10', '2026-11-20') $$,
  '23P01', null, '같은 프로젝트에서 기간이 겹치는 사이클은 만들 수 없다'
);

select throws_ok(
  $$ insert into cycles (project_id, name, starts_at, ends_at)
     values ('00000000-0000-0000-0000-0000000000d1', '종료일에 시작', '2026-11-15', '2026-11-29') $$,
  '23P01', null, '앞 사이클의 종료일에 시작하는 사이클도 겹친다 (종료일 포함)'
);

select lives_ok(
  $$ insert into cycles (project_id, name, starts_at, ends_at)
     values ('00000000-0000-0000-0000-0000000000d1', '사이클 2', '2026-11-16', '2026-11-29') $$,
  '앞 사이클 종료 다음 날부터는 만들 수 있다'
);

select lives_ok(
  $$ insert into cycles (project_id, name, starts_at, ends_at)
     values ('00000000-0000-0000-0000-0000000000d2', '다른 프로젝트', '2026-11-02', '2026-11-15') $$,
  '다른 프로젝트는 같은 기간이어도 만들 수 있다'
);

select throws_ok(
  $$ update cycles set project_id = '00000000-0000-0000-0000-0000000000d2'
     where id = '00000000-0000-0000-0000-0000000000c1' $$,
  '23514', null, '사이클을 다른 프로젝트로 옮길 수 없다'
);

select throws_ok(
  $$ update issues set cycle_id = (select id from cycles where name = '다른 프로젝트')
     where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', '사이클은 같은 프로젝트에 있어야 합니다', '다른 프로젝트의 사이클에는 배정할 수 없다'
);

update cycles set name = '사이클 1 (수정)', ends_at = '2026-11-14'
where id = '00000000-0000-0000-0000-0000000000c1';
select is(
  (select name || ' ' || ends_at from cycles where id = '00000000-0000-0000-0000-0000000000c1'),
  '사이클 1 (수정) 2026-11-14',
  '이름과 기간을 바꿀 수 있다'
);

-- 외부인
select pg_temp.login_as('00000000-0000-0000-0000-00000000000c', 'c@test.com');
select is((select count(*)::int from cycles), 0, '외부인은 사이클을 볼 수 없다');

select throws_ok(
  $$ insert into cycles (project_id, name, starts_at, ends_at)
     values ('00000000-0000-0000-0000-0000000000d1', '침입', '2027-01-01', '2027-01-14') $$,
  '23503', null, '외부인은 프로젝트 ID를 알아도 사이클을 만들 수 없다'
);

update cycles set name = '바꿈' where id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.login_as('00000000-0000-0000-0000-00000000000a', 'a@test.com');
select is(
  (select name from cycles where id = '00000000-0000-0000-0000-0000000000c1'),
  '사이클 1 (수정)', '외부인은 사이클을 수정할 수 없다'
);

delete from cycles where id = '00000000-0000-0000-0000-0000000000c1';
select is(
  (select cycle_id from issues where id = '00000000-0000-0000-0000-0000000000a1'),
  null, '사이클을 지우면 이슈의 사이클 배정이 해제된다'
);

select * from finish();
rollback;
