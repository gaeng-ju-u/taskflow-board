-- 멤버 관리와 초대 검증. 트랜잭션 안에서 실행하고 롤백하므로 DB에 데이터가 남지 않는다.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(15);

-- A(owner), B(초대받아 member가 됨), C(외부인)
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.com', '{"full_name": "Alice"}'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.com', '{}'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.com', '{}');

create function pg_temp.login_as(user_id uuid, email text) returns void language sql as $$
  select set_config('role', 'authenticated', true),
         set_config('request.jwt.claims',
           json_build_object('sub', user_id, 'email', email, 'role', 'authenticated')::text, true);
$$;

select pg_temp.login_as('00000000-0000-0000-0000-00000000000a', 'a@test.com');
insert into workspaces (id, name, slug)
values ('00000000-0000-0000-0000-0000000000e1', 'Team A', 'team-a');
insert into invitations (workspace_id, email, token) values
  ('00000000-0000-0000-0000-0000000000e1', 'b@test.com', '00000000-0000-0000-0000-0000000000f1');

select throws_ok(
  $$insert into invitations (workspace_id, email)
    values ('00000000-0000-0000-0000-0000000000e1', 'b@test.com')$$,
  '23505', null, '같은 이메일로 대기 중인 초대를 또 만들 수 없다'
);
select throws_ok(
  $$update workspace_members set role = 'member'
    where user_id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514', null, '마지막 owner는 역할을 낮출 수 없다'
);
select throws_ok(
  $$delete from workspace_members where user_id = '00000000-0000-0000-0000-00000000000a'$$,
  '23514', null, '마지막 owner는 나갈 수 없다'
);

-- B: 수락 전에는 토큰으로 초대 정보만 볼 수 있다
select pg_temp.login_as('00000000-0000-0000-0000-00000000000b', 'b@test.com');
select results_eq(
  $$select workspace_name, inviter_name, email, is_expired, is_member
    from get_invitation('00000000-0000-0000-0000-0000000000f1')$$,
  $$values ('Team A', 'Alice', 'b@test.com', false, false)$$,
  '토큰을 알면 워크스페이스 이름과 초대한 사람을 볼 수 있다'
);
select is(
  (select count(*)::int from get_invitation('00000000-0000-0000-0000-0000000000f9')),
  0, '없는 토큰이면 아무것도 돌려주지 않는다'
);
select * from accept_invitation('00000000-0000-0000-0000-0000000000f1');
select is(
  (select is_member from get_invitation('00000000-0000-0000-0000-0000000000f1')),
  true, '수락하면 멤버로 표시된다'
);

-- member는 초대와 역할을 관리할 수 없다
select throws_ok(
  $$insert into invitations (workspace_id, email)
    values ('00000000-0000-0000-0000-0000000000e1', 'c@test.com')$$,
  '42501', null, 'member는 초대를 만들 수 없다'
);
update workspace_members set role = 'owner' where user_id = '00000000-0000-0000-0000-00000000000b';
select is(
  (select role::text from workspace_members where user_id = '00000000-0000-0000-0000-00000000000b'),
  'member', 'member는 자기 역할을 올릴 수 없다 (RLS로 0행 수정)'
);
delete from workspace_members where user_id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select count(*)::int from workspace_members),
  2, 'member는 다른 멤버를 제거할 수 없다'
);

-- A: 역할은 바꿀 수 있지만 다른 컬럼은 바꿀 수 없다
select pg_temp.login_as('00000000-0000-0000-0000-00000000000a', 'a@test.com');
select throws_ok(
  $$update workspace_members set user_id = '00000000-0000-0000-0000-00000000000c'
    where user_id = '00000000-0000-0000-0000-00000000000b'$$,
  '42501', null, 'owner도 역할 외의 컬럼은 바꿀 수 없다'
);
update workspace_members set role = 'owner' where user_id = '00000000-0000-0000-0000-00000000000b';
update workspace_members set role = 'member' where user_id = '00000000-0000-0000-0000-00000000000a';
select is(
  (select role::text from workspace_members where user_id = '00000000-0000-0000-0000-00000000000a'),
  'member', '다른 owner가 있으면 역할을 낮출 수 있다'
);

-- 이제 B가 owner, A가 member. A가 맡은 이슈는 A가 나가면 담당이 해제된다.
insert into projects (id, workspace_id, name, key)
values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', 'TaskFlow', 'TF');
insert into issues (project_id, title, assignee_id)
values ('00000000-0000-0000-0000-0000000000d1', 'A의 이슈', '00000000-0000-0000-0000-00000000000a');
delete from workspace_members where user_id = '00000000-0000-0000-0000-00000000000a';

select pg_temp.login_as('00000000-0000-0000-0000-00000000000b', 'b@test.com');
select is(
  (select count(*)::int from workspace_members),
  1, 'member는 스스로 나갈 수 있다'
);
select is(
  (select assignee_id from issues where title = 'A의 이슈'),
  null, '나간 멤버가 맡은 이슈는 담당이 해제된다'
);
select is(
  (select payload from activities where type = 'updated'),
  '{"field": "assignee_id", "from": "00000000-0000-0000-0000-00000000000a", "to": null}'::jsonb,
  '담당 해제가 활동 로그에 기록된다'
);

-- 마지막 owner 보호가 워크스페이스 삭제(cascade)를 막지 않는다
delete from workspaces where id = '00000000-0000-0000-0000-0000000000e1';
select is(
  (select count(*)::int from workspaces),
  0, 'owner는 워크스페이스를 삭제할 수 있다'
);

select * from finish();
rollback;
