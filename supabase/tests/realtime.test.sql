-- Realtime 설정 검증: 발행 대상 테이블과 replica identity. 읽기만 하고 롤백한다.
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;

select plan(6);

-- 테이블 이름은 name 타입이라 name 배열끼리 비교한다 (text와 비교하면 정렬 규칙이 달라 오류가 난다).
select ok(
  (select array_agg(tablename order by tablename) from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public')
  = array['comments', 'issue_labels', 'issues', 'labels', 'projects']::name[],
  'Realtime으로 보내는 테이블은 이슈·코멘트·이슈 라벨·라벨·프로젝트다'
);

-- 삭제 이벤트를 workspace_id로 거르려면 replica identity가 full이어야 한다 (relreplident = 'f')
select is((select relreplident::text from pg_class where oid = 'public.issues'::regclass), 'f', 'issues는 replica identity full');
select is((select relreplident::text from pg_class where oid = 'public.comments'::regclass), 'f', 'comments는 replica identity full');
select is((select relreplident::text from pg_class where oid = 'public.labels'::regclass), 'f', 'labels는 replica identity full');
select is((select relreplident::text from pg_class where oid = 'public.projects'::regclass), 'f', 'projects는 replica identity full');
select is((select relreplident::text from pg_class where oid = 'public.activities'::regclass), 'd', '활동 로그는 보내지 않는다 (기본값 유지)');

select * from finish();
rollback;
