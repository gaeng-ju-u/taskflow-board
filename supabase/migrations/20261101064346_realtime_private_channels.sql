-- Realtime 비공개 채널 권한: 접속자 표시(Presence)와 실시간 동기화 채널을 워크스페이스 멤버만 쓰게 한다.
-- 채널 이름 규칙: workspace:<워크스페이스 id>[:...] (예: workspace:<id>:issue:<이슈 id>, workspace:<id>:sync)
-- 클라이언트는 { config: { private: true } }로 채널을 열고, 서버는 접속할 때 아래 정책으로 권한을 검사한다.
-- 비공개 채널만 쓰도록 강제하려면 Supabase 대시보드 Realtime 설정에서 "Allow public access"를 꺼야 한다.

-- 채널 이름이 workspace:<uuid>로 시작하고 그 워크스페이스의 멤버인지. 형식이 틀리면 false.
-- case로 순서를 고정해, 형식이 틀린 이름에서 uuid 변환 오류가 나지 않게 한다.
create function private.can_access_channel(topic text)
returns boolean
language sql stable set search_path = ''
as $$
  select case
    when topic ~ '^workspace:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(:|$)'
      then private.is_workspace_member(substring(topic from 11 for 36)::uuid)
    else false
  end;
$$;

revoke execute on function private.can_access_channel(text) from public, anon;
grant execute on function private.can_access_channel(text) to authenticated;

-- 수신: 멤버만 채널에 들어와 Presence 상태와 DB 변경을 받는다.
create policy "워크스페이스 멤버는 채널을 받는다" on realtime.messages
  for select to authenticated
  using (private.can_access_channel((select realtime.topic())));

-- 전송: 멤버만, Presence(내 접속 상태)만 보낸다. 브로드캐스트 메시지는 쓰지 않으므로 허용하지 않는다.
create policy "워크스페이스 멤버는 접속 상태를 보낸다" on realtime.messages
  for insert to authenticated
  with check (
    realtime.messages.extension = 'presence'
    and private.can_access_channel((select realtime.topic()))
  );
