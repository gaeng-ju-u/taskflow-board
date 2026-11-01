-- Realtime 비공개 채널 권한 검증. 트랜잭션 안에서 실행하고 롤백하므로 DB에 데이터가 남지 않는다.
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

-- Realtime 서버는 접속한 채널 이름을 realtime.topic 설정에 넣고 정책을 검사한다. 테스트에서도 같은 방식으로 흉내 낸다.
create function pg_temp.join(topic text) returns void language sql as $$
  select set_config('realtime.topic', topic, true);
$$;

select pg_temp.login_as('00000000-0000-0000-0000-00000000000a', 'a@test.com');
insert into workspaces (id, name, slug) values ('00000000-0000-0000-0000-0000000000e1', 'Team A', 'team-a');

select is(
  private.can_access_channel('workspace:00000000-0000-0000-0000-0000000000e1:issue:00000000-0000-0000-0000-0000000000a1'),
  true, '멤버는 자기 워크스페이스의 이슈 채널에 들어갈 수 있다'
);
select is(
  private.can_access_channel('workspace:00000000-0000-0000-0000-0000000000e1'),
  true, '워크스페이스 이름만 있는 채널도 허용한다'
);
select is(
  private.can_access_channel('workspace:00000000-0000-0000-0000-0000000000e9:sync'),
  false, '멤버가 아닌 워크스페이스의 채널은 거부한다'
);
select is(
  private.can_access_channel('workspace:not-a-uuid:sync'),
  false, '형식이 틀린 채널 이름은 오류 없이 거부한다'
);
select is(
  private.can_access_channel('room-1'),
  false, '규칙에 맞지 않는 채널 이름은 거부한다'
);

-- 정책 끝까지: Presence 메시지 쓰기(insert)를 멤버는 하고 외부인은 못 한다
select pg_temp.join('workspace:00000000-0000-0000-0000-0000000000e1:issue:00000000-0000-0000-0000-0000000000a1');
select lives_ok(
  $$insert into realtime.messages (topic, extension, event, payload, private)
    values (realtime.topic(), 'presence', 'presence', '{}', true)$$,
  '멤버는 자기 워크스페이스 채널에 접속 상태를 보낼 수 있다'
);
select throws_ok(
  $$insert into realtime.messages (topic, extension, event, payload, private)
    values (realtime.topic(), 'broadcast', 'message', '{}', true)$$,
  '42501', null, '브로드캐스트 메시지는 보낼 수 없다'
);

select pg_temp.login_as('00000000-0000-0000-0000-00000000000c', 'c@test.com');
select throws_ok(
  $$insert into realtime.messages (topic, extension, event, payload, private)
    values (realtime.topic(), 'presence', 'presence', '{}', true)$$,
  '42501', null, '외부인은 채널 이름을 알아도 접속 상태를 보낼 수 없다'
);

select * from finish();
rollback;
