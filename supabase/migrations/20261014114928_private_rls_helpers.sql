-- RLS 헬퍼 함수를 API(PostgREST)에 노출되지 않는 private 스키마로 옮긴다.
-- public 스키마의 함수는 /rest/v1/rpc/<이름>으로 호출할 수 있기 때문이다 (Supabase advisor 0029).
-- 정책은 함수를 OID로 참조하므로 스키마를 옮겨도 그대로 동작한다.
-- 정책은 조회하는 사용자 권한으로 평가되므로 authenticated의 실행 권한은 유지한다.

create schema if not exists private;
grant usage on schema private to authenticated;

alter function public.is_workspace_member(uuid) set schema private;
alter function public.is_workspace_owner(uuid) set schema private;
alter function public.shares_workspace_with(uuid) set schema private;
