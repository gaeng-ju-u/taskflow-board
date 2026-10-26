-- 활동 로그 보강: 설명 변경과 라벨 붙이기·떼기를 기록한다.

-- 설명은 길 수 있어 내용은 남기지 않고 "바뀌었다"는 사실만 기록한다 ({field: 'description'}).
-- 나머지는 기존 함수(20261014113542_triggers.sql)와 같다.
create or replace function public.log_issue_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actor uuid := (select auth.uid());
  field text;
  old_value jsonb;
  new_value jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.activities (issue_id, workspace_id, actor_id, type)
    values (new.id, new.workspace_id, actor, 'created');
    return null;
  end if;

  foreach field in array array['title', 'status', 'priority', 'assignee_id', 'parent_id', 'cycle_id'] loop
    old_value := to_jsonb(old) -> field;
    new_value := to_jsonb(new) -> field;
    if old_value is distinct from new_value then
      insert into public.activities (issue_id, workspace_id, actor_id, type, payload)
      values (
        new.id, new.workspace_id, actor, 'updated',
        jsonb_build_object('field', field, 'from', old_value, 'to', new_value)
      );
    end if;
  end loop;

  if old.description is distinct from new.description then
    insert into public.activities (issue_id, workspace_id, actor_id, type, payload)
    values (new.id, new.workspace_id, actor, 'updated', jsonb_build_object('field', 'description'));
  end if;
  return null;
end;
$$;

-- 라벨 붙이기·떼기. 라벨 이름을 함께 저장해 나중에 라벨 이름이 바뀌거나 지워져도 기록을 읽을 수 있게 한다.
-- 라벨 삭제나 이슈 삭제로 연결이 함께 지워질 때(cascade)는 기록하지 않는다. 그 시점에는 라벨이나 이슈 행이
-- 이미 없어서, 기록하면 라벨 하나를 지울 때 기록이 쏟아지거나 지워진 이슈를 참조해 외래 키 오류가 난다.
create function private.log_issue_label_activity()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  link record;
  target_workspace uuid;
  label_name text;
begin
  link := coalesce(new, old);

  select workspace_id into target_workspace from public.issues where id = link.issue_id;
  if not found then
    return null;
  end if;
  select name into label_name from public.labels where id = link.label_id;
  if not found then
    return null;
  end if;

  insert into public.activities (issue_id, workspace_id, actor_id, type, payload)
  values (
    link.issue_id, target_workspace, (select auth.uid()),
    case tg_op when 'INSERT' then 'label_added' else 'label_removed' end,
    jsonb_build_object('label_id', link.label_id, 'name', label_name)
  );
  return null;
end;
$$;

create trigger issue_labels_activity
  after insert or delete on public.issue_labels
  for each row execute function private.log_issue_label_activity();

revoke execute on function private.log_issue_label_activity() from public, anon, authenticated;
