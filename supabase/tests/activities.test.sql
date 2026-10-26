-- 활동 로그(설명 변경, 라벨) 검증. 트랜잭션 안에서 실행하고 롤백하므로 DB에 데이터가 남지 않는다.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(8);

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
insert into projects (id, workspace_id, name, key)
values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000e1', 'TaskFlow', 'TF');
insert into issues (id, project_id, title) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', '첫 이슈'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000d1', '지울 이슈');
insert into labels (id, workspace_id, name) values
  ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000e1', '버그'),
  ('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-0000000000e1', '지울 라벨');

update issues set description = '새 설명' where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select payload from activities where type = 'updated'),
  '{"field": "description"}'::jsonb,
  '설명 변경은 내용 없이 바뀐 사실만 기록된다'
);

update issues set sort_order = 5 where id = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select count(*)::int from activities where type = 'updated'),
  1, '순서(sort_order) 변경은 기록하지 않는다'
);

insert into issue_labels (issue_id, label_id)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000001a1');
select is(
  (select payload from activities where type = 'label_added'),
  '{"label_id": "00000000-0000-0000-0000-0000000001a1", "name": "버그"}'::jsonb,
  '라벨을 붙이면 라벨 id와 이름이 기록된다'
);

-- 이미 붙은 라벨을 다시 붙여도(앱의 upsert ignoreDuplicates) 기록이 늘지 않는다
insert into issue_labels (issue_id, label_id)
values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000001a1')
on conflict do nothing;
select is(
  (select count(*)::int from activities where type = 'label_added'),
  1, '이미 붙은 라벨을 다시 붙이면 기록하지 않는다'
);

delete from issue_labels where label_id = '00000000-0000-0000-0000-0000000001a1';
select is(
  (select payload ->> 'name' from activities where type = 'label_removed'),
  '버그', '라벨을 떼면 기록된다'
);

-- 라벨 삭제(cascade)로 빠지는 연결은 기록하지 않는다
insert into issue_labels (issue_id, label_id) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000001a2'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000001a2');
delete from labels where id = '00000000-0000-0000-0000-0000000001a2';
select is(
  (select count(*)::int from activities where type = 'label_removed'),
  1, '라벨을 삭제할 때 함께 빠지는 연결은 기록하지 않는다'
);

-- 라벨이 붙은 이슈를 지워도 오류가 나지 않는다 (지워진 이슈를 참조하는 기록을 만들지 않음)
insert into issue_labels (issue_id, label_id)
values ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000001a1');
select lives_ok(
  $$delete from issues where id = '00000000-0000-0000-0000-0000000000a2'$$,
  '라벨이 붙은 이슈를 삭제할 수 있다'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000000c', 'c@test.com');
select is(
  (select count(*)::int from activities),
  0, '외부인은 활동 로그를 볼 수 없다'
);

select * from finish();
rollback;
