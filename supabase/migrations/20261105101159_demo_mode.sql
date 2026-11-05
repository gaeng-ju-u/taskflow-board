-- 데모 모드: 가상 팀원, 데모 워크스페이스 초기화 함수, 데모 계정 제한, 매시 정각 초기화(pg_cron).
--
-- 데모 계정(demo@taskflow.example)은 대시보드에서 비밀번호로 만든다(Auto Confirm). 모든 방문자가 같은 계정을 쓴다.
-- .example은 예약 도메인이라 실제로 메일을 받는 사람이 없다. 앱의 DEMO_EMAIL(lib/demo.ts)과 같은 값이다.

-- 1. 데모 계정 판별과 제한
-- 데모를 망가뜨리거나 밖으로 영향을 주는 동작만 막는다. 이슈·라벨·사이클·코멘트는 자유롭게 바꾸고 초기화로 되돌린다.
-- RLS로 막으면 오류 없이 0행만 처리되어 앱이 성공으로 오해하므로, 트리거에서 전용 오류 코드(TF001)를 던진다.
create function private.is_demo_user()
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'email') = 'demo@taskflow.example', false);
$$;

create function private.block_demo_user()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if private.is_demo_user() then
    raise exception '데모 계정에서는 할 수 없는 작업입니다' using errcode = 'TF001';
  end if;
  return coalesce(new, old);
end;
$$;

-- 프로젝트 삭제
create trigger projects_block_demo
  before delete on public.projects
  for each row execute function private.block_demo_user();
-- 워크스페이스 생성·수정·삭제
create trigger workspaces_block_demo
  before insert or update or delete on public.workspaces
  for each row execute function private.block_demo_user();
-- 역할 변경, 내보내기, 나가기
create trigger workspace_members_block_demo
  before update or delete on public.workspace_members
  for each row execute function private.block_demo_user();
-- 초대 (방문자가 자기 계정을 데모 워크스페이스에 넣거나 실제 주소로 초대하는 것을 막는다)
create trigger invitations_block_demo
  before insert on public.invitations
  for each row execute function private.block_demo_user();
-- 프로필(이름) 변경: 다른 방문자에게 보이는 이름이다
create trigger profiles_block_demo
  before update on public.profiles
  for each row execute function private.block_demo_user();

revoke execute on function private.block_demo_user() from public, anon, authenticated;

-- 2. 가상 팀원: 데모 데이터의 담당자·작성자. 비밀번호와 로그인 수단이 없어 로그인할 수 없다.
-- profiles는 가입 트리거(handle_new_user)가 full_name으로 만든다.
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
values
  ('de000000-0000-4000-8000-00000000a001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'minjun@taskflow.example', '{"full_name": "김민준"}', '{}', now(), now()),
  ('de000000-0000-4000-8000-00000000a002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'seoyeon@taskflow.example', '{"full_name": "이서연"}', '{}', now(), now()),
  ('de000000-0000-4000-8000-00000000a003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'jihoon@taskflow.example', '{"full_name": "박지훈"}', '{}', now(), now()),
  ('de000000-0000-4000-8000-00000000a004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'yuna@taskflow.example', '{"full_name": "최유나"}', '{}', now(), now())
on conflict (id) do nothing;

-- 3. 데모 워크스페이스 초기화
-- 지우고 고정 id로 다시 만든다. 이슈 번호(WEB-12)와 링크가 초기화 뒤에도 같다.
-- 시각은 실행 시점 기준이라 언제 들어와도 최근 데이터처럼 보이고, 현재 사이클은 항상 진행 중이다.
-- 작성자·행위자가 남도록 request.jwt.claims를 팀원으로 바꿔 가며 넣는다(트리거가 auth.uid()를 쓴다).
create function private.reset_demo_workspace()
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  demo uuid;
  ws constant uuid := 'de000000-0000-4000-8000-000000000001';
  web constant uuid := 'de000000-0000-4000-8000-000000000101';
  app constant uuid := 'de000000-0000-4000-8000-000000000102';
  past_cycle constant uuid := 'de000000-0000-4000-8000-000000000201';
  cur_cycle constant uuid := 'de000000-0000-4000-8000-000000000202';
  next_cycle constant uuid := 'de000000-0000-4000-8000-000000000203';
  yuna constant uuid := 'de000000-0000-4000-8000-00000000a004';
  users jsonb;
  labels constant jsonb := '{"버그": "de000000-0000-4000-8000-000000000301", "기능": "de000000-0000-4000-8000-000000000302", "디자인": "de000000-0000-4000-8000-000000000303", "문서": "de000000-0000-4000-8000-000000000304", "성능": "de000000-0000-4000-8000-000000000305"}';
  today date := (now() at time zone 'Asia/Seoul')::date;
  claims text := current_setting('request.jwt.claims', true);
  r record;
  new_issue_id uuid;
  assignee uuid;
  creator uuid;
  cycle uuid;
  created timestamptz;
  label text;
begin
  select id into demo from auth.users where email = 'demo@taskflow.example';
  if demo is null then
    raise notice '데모 계정(demo@taskflow.example)이 없어 데모 워크스페이스를 만들지 않습니다';
    return;
  end if;
  users := jsonb_build_object(
    'minjun', 'de000000-0000-4000-8000-00000000a001',
    'seoyeon', 'de000000-0000-4000-8000-00000000a002',
    'jihoon', 'de000000-0000-4000-8000-00000000a003',
    'yuna', yuna,
    'demo', demo
  );

  -- 아무도 아닌 상태로 시작한다 (데모 계정 차단 트리거가 걸리지 않게). '{}'는 auth.uid()가 null이 된다.
  perform set_config('request.jwt.claims', '{}', true);

  -- 데모 계정이 만든 것과 데모 워크스페이스를 모두 지운다 (프로젝트·이슈·사이클 등은 cascade)
  delete from public.workspaces where id = ws or created_by = demo;
  update public.profiles set name = '데모 사용자', avatar_url = null where id = demo;

  -- 워크스페이스: 생성 트리거가 created_by(데모 계정)를 owner로 넣는다
  insert into public.workspaces (id, name, slug, created_by, created_at)
  values (ws, 'TaskFlow 데모', 'taskflow-demo', demo, now() - interval '30 days');
  insert into public.workspace_members (workspace_id, user_id, role, created_at)
  select ws, (users ->> code)::uuid, role::public.workspace_role, now() - interval '29 days'
  from (values ('yuna', 'owner'), ('minjun', 'member'), ('seoyeon', 'member'), ('jihoon', 'member')) as m (code, role);

  insert into public.projects (id, workspace_id, name, key, created_at) values
    (web, ws, '웹 앱', 'WEB', now() - interval '28 days'),
    (app, ws, '모바일 앱', 'APP', now() - interval '20 days');

  insert into public.labels (id, workspace_id, name, color)
  select (labels ->> name)::uuid, ws, name, color
  from (values ('버그', '#ef4444'), ('기능', '#3b82f6'), ('디자인', '#a855f7'), ('문서', '#22c55e'), ('성능', '#f97316')) as l (name, color);

  insert into public.cycles (id, project_id, name, starts_at, ends_at) values
    (past_cycle, web, '사이클 1', today - 21, today - 8),
    (cur_cycle, web, '사이클 2', today - 7, today + 6),
    (next_cycle, web, '사이클 3', today + 7, today + 20);

  -- 이슈: 만든 순서대로 넣는다 (번호는 생성 트리거가 1부터 매긴다). parent는 같은 프로젝트의 번호.
  for r in
    select * from (values
      (1, 1, '온보딩 흐름 개선', 'in_progress', 'high', 'yuna', 'yuna', '{기능}'::text[], 'cur', null::int, '20 days',
        E'신규 가입자가 첫 이슈를 만들기까지의 단계를 줄입니다.\n\n## 목표\n- 가입 후 **3분 안에** 첫 이슈 생성\n- 안내는 툴팁 3단계 이내\n\n하위 이슈로 나눠 진행합니다.'),
      (1, 2, '회원가입 폼 유효성 검사', 'done', 'medium', 'minjun', 'yuna', '{기능}', 'past', 1, '19 days', ''),
      (1, 3, '첫 로그인 안내 툴팁', 'in_progress', 'medium', 'seoyeon', 'yuna', '{디자인}', 'cur', 1, '19 days', ''),
      (1, 4, '온보딩 안내 메일 문구 작성', 'todo', 'low', 'yuna', 'yuna', '{문서}', 'cur', 1, '18 days', ''),
      (1, 5, 'Safari에서 로그인 후 무한 리다이렉트', 'done', 'urgent', 'jihoon', 'minjun', '{버그}', 'past', null, '17 days',
        E'Safari 17에서 GitHub 로그인 후 `/auth/callback`과 `/login` 사이를 계속 오갑니다.\n\n### 재현 방법\n1. Safari에서 로그아웃 상태로 접속\n2. GitHub로 계속하기\n3. 승인 후 화면이 계속 새로고침됨'),
      (1, 6, '대시보드 첫 화면 로딩 속도 개선', 'in_progress', 'high', 'jihoon', 'yuna', '{성능}', 'cur', null, '16 days',
        E'첫 화면 데이터 요청 4개가 순서대로 실행되어 3초 넘게 걸립니다.\n\n- 요청을 병렬로 바꾸기\n- 목록 쿼리는 필요한 컬럼만 조회\n\n목표: **1.5초 이내**'),
      (1, 7, '다크모드 색 대비 점검', 'done', 'medium', 'seoyeon', 'seoyeon', '{디자인}', 'past', null, '15 days', ''),
      (1, 8, '이슈 목록 CSV 내보내기', 'backlog', 'low', null, 'yuna', '{기능}', null, null, '14 days', ''),
      (1, 9, '알림 설정 화면', 'todo', 'medium', 'minjun', 'yuna', '{기능}', 'cur', null, '13 days', ''),
      (1, 10, '모바일 화면에서 사이드바가 닫히지 않음', 'todo', 'high', 'demo', 'minjun', '{버그}', 'cur', null, '12 days', ''),
      (1, 11, 'API 응답 캐시 정책 정리', 'todo', 'medium', 'jihoon', 'jihoon', '{성능,문서}', 'cur', null, '11 days', ''),
      (1, 12, '검색 결과 하이라이트', 'backlog', 'none', null, 'minjun', '{기능}', 'past', null, '10 days', ''),
      (1, 13, '결제 페이지 리디자인', 'todo', 'high', 'seoyeon', 'yuna', '{디자인}', 'next', null, '9 days',
        E'결제 단계를 3단계에서 2단계로 줄입니다. 시안은 다음 사이클에 확정합니다.'),
      (1, 14, '결제 수단 선택 화면', 'backlog', 'medium', 'seoyeon', 'seoyeon', '{디자인}', 'next', 13, '9 days', ''),
      (1, 15, '결제 실패 안내 문구', 'backlog', 'low', 'yuna', 'yuna', '{문서}', 'next', 13, '8 days', ''),
      (1, 16, 'Esc 키로 모달 닫기', 'done', 'medium', 'minjun', 'minjun', '{버그}', 'cur', null, '8 days', ''),
      (1, 17, '이미지 업로드 크기 제한', 'canceled', 'low', null, 'jihoon', '{기능}', 'past', null, '7 days', ''),
      (1, 18, '팀 초대 메일 문구 수정', 'done', 'low', 'yuna', 'yuna', '{문서}', 'cur', null, '6 days', ''),
      (1, 19, '차트 라이브러리 교체 검토', 'backlog', 'low', 'jihoon', 'jihoon', '{}', null, null, '5 days', ''),
      (1, 20, '404 페이지 디자인', 'todo', 'low', 'demo', 'seoyeon', '{디자인}', 'cur', null, '3 days', ''),
      (1, 21, '로그아웃 후 뒤로 가기 하면 이전 화면이 보임', 'todo', 'urgent', null, 'minjun', '{버그}', 'cur', null, '1 day', ''),
      (1, 22, '릴리스 노트 0.9 작성', 'backlog', 'medium', 'yuna', 'yuna', '{문서}', 'next', null, '5 hours', ''),
      (2, 1, '푸시 알림 권한 요청 시점 조정', 'in_progress', 'high', 'minjun', 'yuna', '{기능}', null, null, '12 days', ''),
      (2, 2, '앱 아이콘 시안', 'done', 'medium', 'seoyeon', 'seoyeon', '{디자인}', null, null, '10 days', ''),
      (2, 3, '오프라인 모드 지원 검토', 'backlog', 'low', null, 'jihoon', '{}', null, null, '9 days', ''),
      (2, 4, 'iOS에서 키보드가 입력창을 가림', 'todo', 'urgent', 'jihoon', 'minjun', '{버그}', null, null, '6 days', ''),
      (2, 5, '로그인 유지 기간 설정', 'todo', 'medium', 'demo', 'yuna', '{기능}', null, null, '2 days', '')
    ) as t (p, n, title, status, priority, assignee, creator, labels, cycle, parent, ago, description)
    order by p, n
  loop
    new_issue_id := ('de000000-0000-4000-8000-' || lpad((r.p * 1000 + r.n)::text, 12, '0'))::uuid;
    assignee := (users ->> r.assignee)::uuid;
    creator := (users ->> r.creator)::uuid;
    cycle := case r.cycle when 'past' then past_cycle when 'cur' then cur_cycle when 'next' then next_cycle end;
    created := now() - r.ago::interval + make_interval(mins => r.n * 7);

    perform set_config('request.jwt.claims', json_build_object('sub', creator)::text, true);
    insert into public.issues (
      id, project_id, title, description, status, priority, assignee_id, cycle_id, parent_id,
      sort_order, created_at, updated_at
    ) values (
      new_issue_id, case r.p when 1 then web else app end, r.title, r.description,
      r.status::public.issue_status, r.priority::public.issue_priority, assignee, cycle,
      case when r.parent is null then null
        else ('de000000-0000-4000-8000-' || lpad((r.p * 1000 + r.parent)::text, 12, '0'))::uuid end,
      r.n, created,
      least(now(), created + case r.status
        when 'done' then interval '2 days'
        when 'in_progress' then interval '1 day'
        when 'canceled' then interval '1 day'
        else interval '30 minutes' end)
    );
    foreach label in array r.labels loop
      insert into public.issue_labels (issue_id, label_id) values (new_issue_id, (labels ->> label)::uuid);
    end loop;

    -- 트리거가 남긴 생성·라벨 기록은 지금 시각이라 이슈를 만든 시각으로 옮긴다
    update public.activities set created_at = created where issue_id = new_issue_id;

    -- 그 뒤의 진행 기록 (담당 지정 → 사이클 배정 → 시작 → 완료/취소)
    insert into public.activities (issue_id, workspace_id, actor_id, type, payload, created_at)
    select new_issue_id, ws, a.actor, 'updated', a.payload, least(now() - interval '1 minute', created + a.after)
    from (values
      (assignee is not null, creator,
        jsonb_build_object('field', 'assignee_id', 'from', null, 'to', assignee), interval '10 minutes'),
      (cycle is not null, yuna,
        jsonb_build_object('field', 'cycle_id', 'from', null, 'to', cycle), interval '30 minutes'),
      (r.status in ('in_progress', 'done'), coalesce(assignee, creator),
        '{"field": "status", "from": "todo", "to": "in_progress"}'::jsonb, interval '1 day'),
      (r.status = 'done', coalesce(assignee, creator),
        '{"field": "status", "from": "in_progress", "to": "done"}'::jsonb, interval '2 days'),
      (r.status = 'canceled', creator,
        '{"field": "status", "from": "todo", "to": "canceled"}'::jsonb, interval '1 day')
    ) as a (applies, actor, payload, after)
    where a.applies;
  end loop;

  -- 코멘트 (마크다운)
  insert into public.comments (issue_id, author_id, body, created_at, updated_at)
  select
    ('de000000-0000-4000-8000-' || lpad((c.p * 1000 + c.n)::text, 12, '0'))::uuid,
    (users ->> c.author)::uuid, c.body, now() - c.ago::interval, now() - c.ago::interval
  from (values
    (1, 5, 'jihoon', E'원인 찾았습니다. 콜백에서 세션 쿠키가 저장되기 전에 리다이렉트되고 있었어요.\n\n`SameSite=Lax` 설정과 리다이렉트 순서를 바꿔서 수정하겠습니다.', '16 days'),
    (1, 5, 'minjun', E'수정 배포 후 Safari 17, 18 모두 정상인 것 확인했습니다.', '15 days'),
    (1, 6, 'yuna', E'이번 사이클 안에 1.5초까지 줄이는 걸 목표로 할게요.', '15 days'),
    (1, 6, 'jihoon', E'요청을 병렬로 바꾸니 **3.2초 → 1.8초**까지 줄었습니다. 남은 건 목록 쿼리 컬럼 정리예요.', '2 days'),
    (1, 1, 'seoyeon', E'툴팁 시안 공유드려요. 단계는 5개에서 3개로 줄였습니다.', '4 days'),
    (1, 1, 'demo', E'좋아요! 두 번째 단계 문구만 조금 더 짧으면 좋겠어요.', '3 days'),
    (1, 10, 'minjun', E'iPhone SE 크기(375px)에서만 재현됩니다. 확인 부탁드려요.', '11 days'),
    (1, 21, 'jihoon', E'브라우저의 뒤로 가기 캐시(bfcache) 때문인 것 같아요. 로그아웃할 때 캐시를 비우는 방법을 찾아볼게요.', '20 hours'),
    (2, 4, 'seoyeon', E'입력창이 화면 아래쪽에 있을 때만 발생해요.', '5 days')
  ) as c (p, n, author, body, ago);

  perform set_config('request.jwt.claims', coalesce(claims, '{}'), true);
end;
$$;

revoke execute on function private.reset_demo_workspace() from public, anon, authenticated;

-- 지금 한 번 만든다 (데모 계정이 아직 없으면 알림만 남기고 넘어간다. 이후 cron이 만든다)
select private.reset_demo_workspace();

-- 4. 매시 정각 초기화 (pg_cron은 DB 안에서 돌아서 API 경로나 서비스 키가 필요 없다)
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('reset-demo-workspace', '0 * * * *', 'select private.reset_demo_workspace()');
