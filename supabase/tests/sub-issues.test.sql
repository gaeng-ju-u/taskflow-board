-- 서브이슈(상위 이슈) 검증. 트랜잭션 안에서 실행하고 롤백하므로 DB에 데이터가 남지 않는다.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.com', '{}');

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
-- a1 ← a2 ← a3 (a3의 상위가 a2, a2의 상위가 a1)
insert into issues (id, project_id, title) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '상위'),
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000d2', '다른 프로젝트');
insert into issues (id, project_id, title, parent_id) values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000d1', '하위', '00000000-0000-0000-0000-0000000000a1');
insert into issues (id, project_id, title, parent_id) values
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000d1', '손자', '00000000-0000-0000-0000-0000000000a2');

select is(
  (select parent_id from issues where id = '00000000-0000-0000-0000-0000000000a3'),
  '00000000-0000-0000-0000-0000000000a2'::uuid,
  '같은 프로젝트의 이슈를 상위로 지정할 수 있다 (여러 단계)'
);

select throws_ok(
  $$ update issues set parent_id = '00000000-0000-0000-0000-0000000000a1'
     where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', null, '자기 자신을 상위로 지정할 수 없다'
);

select throws_ok(
  $$ update issues set parent_id = '00000000-0000-0000-0000-0000000000a2'
     where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', '하위 이슈를 상위 이슈로 지정할 수 없습니다', '바로 아래 하위 이슈를 상위로 지정할 수 없다'
);

select throws_ok(
  $$ update issues set parent_id = '00000000-0000-0000-0000-0000000000a3'
     where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '23514', '하위 이슈를 상위 이슈로 지정할 수 없습니다', '여러 단계 아래 하위 이슈를 상위로 지정할 수 없다'
);

select throws_ok(
  $$ update issues set parent_id = '00000000-0000-0000-0000-0000000000b1'
     where id = '00000000-0000-0000-0000-0000000000a2' $$,
  '23514', '상위 이슈는 같은 프로젝트에 있어야 합니다', '다른 프로젝트의 이슈를 상위로 지정할 수 없다'
);

-- 형제·사촌 관계로 옮기는 건 순환이 아니다
update issues set parent_id = '00000000-0000-0000-0000-0000000000a1'
where id = '00000000-0000-0000-0000-0000000000a3';
select is(
  (select parent_id from issues where id = '00000000-0000-0000-0000-0000000000a3'),
  '00000000-0000-0000-0000-0000000000a1'::uuid,
  '순환이 아니면 상위 이슈를 바꿀 수 있다'
);

delete from issues where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select count(*)::int from issues where parent_id is null and project_id = '00000000-0000-0000-0000-0000000000d1'),
  2, '상위 이슈를 지우면 하위 이슈는 최상위 이슈로 남는다'
);

select * from finish();
rollback;
