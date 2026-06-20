-- Fix pgcrypto function references for Supabase and lower admin password minimum length to 6.
-- Safe for existing data: this migration only creates/replaces functions and grants permissions.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.validate_admin_password(p_password text)
returns void
language plpgsql
immutable
as $$
begin
  if char_length(btrim(coalesce(p_password, ''))) = 0 then
    raise exception '管理者用パスワードを入力してください' using errcode = 'P0001';
  end if;

  if char_length(coalesce(p_password, '')) < 6 then
    raise exception '管理者用パスワードは6文字以上で入力してください。' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.admin_set_password(
  p_room_code text,
  p_admin_key text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_event public.events%rowtype;
begin
  perform public.validate_admin_password(p_password);
  v_event_id = public.require_admin_event(p_room_code, p_admin_key);

  update public.events
  set admin_password_hash = extensions.crypt(p_password, extensions.gen_salt('bf')),
      admin_password_updated_at = now()
  where id = v_event_id
  returning * into v_event;

  return jsonb_build_object(
    'ok', true,
    'eventId', v_event.id,
    'roomCode', v_event.room_code,
    'passwordUpdatedAt', v_event.admin_password_updated_at
  );
end;
$$;

create or replace function public.admin_verify_password(
  p_room_code text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  perform public.validate_admin_password(p_password);

  select * into v_event
  from public.events
  where room_code = upper(btrim(p_room_code));

  if not found then
    raise exception 'イベントが見つかりません' using errcode = 'P0001';
  end if;

  if v_event.admin_password_hash is not null then
    if extensions.crypt(p_password, v_event.admin_password_hash) <> v_event.admin_password_hash then
      raise exception '管理者用パスワードが正しくありません' using errcode = 'P0001';
    end if;
  elsif p_password <> v_event.admin_key then
    raise exception '管理者用パスワードが正しくありません' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'eventId', v_event.id,
    'roomCode', v_event.room_code,
    'passwordUpdatedAt', v_event.admin_password_updated_at
  );
end;
$$;

create or replace function public.admin_change_password(
  p_room_code text,
  p_current_password text,
  p_new_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
begin
  perform public.validate_admin_password(p_current_password);
  perform public.validate_admin_password(p_new_password);

  select * into v_event
  from public.events
  where room_code = upper(btrim(p_room_code))
  for update;

  if not found then
    raise exception 'イベントが見つかりません' using errcode = 'P0001';
  end if;

  if v_event.admin_password_hash is not null then
    if extensions.crypt(p_current_password, v_event.admin_password_hash) <> v_event.admin_password_hash then
      raise exception '現在の管理者用パスワードが正しくありません' using errcode = 'P0001';
    end if;
  elsif p_current_password <> v_event.admin_key then
    raise exception '現在の管理者用パスワードが正しくありません' using errcode = 'P0001';
  end if;

  update public.events
  set admin_password_hash = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      admin_password_updated_at = now()
  where id = v_event.id
  returning * into v_event;

  return jsonb_build_object(
    'ok', true,
    'eventId', v_event.id,
    'roomCode', v_event.room_code,
    'passwordUpdatedAt', v_event.admin_password_updated_at
  );
end;
$$;

grant execute on function public.admin_set_password(text, text, text) to anon, authenticated;
grant execute on function public.admin_verify_password(text, text) to anon, authenticated;
grant execute on function public.admin_change_password(text, text, text) to anon, authenticated;
revoke all on function public.validate_admin_password(text) from public, anon, authenticated;
