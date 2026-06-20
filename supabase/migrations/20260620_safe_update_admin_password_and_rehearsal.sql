-- Safe update for existing Wedding Quiz Live projects.
-- This migration adds columns, constraints, and RPC definitions without removing existing data.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.events
  add column if not exists admin_password_hash text null,
  add column if not exists admin_password_updated_at timestamptz null;

alter table public.questions
  add column if not exists difficulty text not null default 'normal',
  add column if not exists base_points integer not null default 100,
  add column if not exists speed_bonus_enabled boolean not null default true;

alter table public.answers
  add column if not exists base_points integer not null default 0,
  add column if not exists speed_bonus integer not null default 0;

do $$
begin
  alter table public.questions
    add constraint questions_difficulty_check check (difficulty in ('easy', 'normal', 'hard', 'special', 'final'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.questions
    add constraint questions_base_points_check check (base_points between 10 and 1000);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.answers
    add constraint answers_base_points_non_negative check (base_points >= 0);
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.answers
    add constraint answers_speed_bonus_non_negative check (speed_bonus >= 0);
exception when duplicate_object then null;
end $$;

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

create or replace function public.get_admin_room_snapshot(
  p_room_code text,
  p_admin_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_state public.live_state%rowtype;
  v_stats public.event_stats%rowtype;
  v_questions jsonb;
  v_ranking jsonb;
  v_scored_participant_count integer;
begin
  perform public.require_admin_event(p_room_code, p_admin_key);

  select * into v_event
  from public.events
  where room_code = upper(btrim(p_room_code));

  select * into v_state from public.live_state where event_id = v_event.id;
  select * into v_stats from public.event_stats where event_id = v_event.id;
  select count(*)::integer into v_scored_participant_count
  from public.participants
  where event_id = v_event.id and score > 0;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'orderNo', q.order_no,
      'text', q.text,
      'options', jsonb_build_array(q.option_1, q.option_2, q.option_3, q.option_4),
      'correctIndex', q.correct_index,
      'timeLimitSec', q.time_limit_sec,
      'difficulty', q.difficulty,
      'basePoints', q.base_points,
      'speedBonusEnabled', q.speed_bonus_enabled
    )
    order by q.order_no
  ), '[]'::jsonb)
  into v_questions
  from public.questions q
  where q.event_id = v_event.id;

  select coalesce(jsonb_agg(row_json order by (row_json->>'rank')::integer), '[]'::jsonb) into v_ranking
  from (
    select jsonb_build_object(
      'rank', rank() over (order by p.score desc, p.joined_at asc),
      'participantId', p.id,
      'name', p.name,
      'score', p.score
    ) as row_json
    from public.participants p
    where p.event_id = v_event.id
    order by p.score desc, p.joined_at asc
    limit 100
  ) ranked;

  return jsonb_build_object(
    'event', jsonb_build_object(
      'id', v_event.id,
      'title', v_event.title,
      'roomCode', v_event.room_code,
      'status', v_event.status
    ),
    'liveState', jsonb_build_object(
      'eventId', v_state.event_id,
      'currentQuestionId', v_state.current_question_id,
      'phase', v_state.phase,
      'questionStartedAt', v_state.question_started_at,
      'updatedAt', v_state.updated_at
    ),
    'questions', v_questions,
    'participantCount', coalesce(v_stats.participant_count, 0),
    'totalAnswerCount', coalesce(v_stats.total_answer_count, 0),
    'scoredParticipantCount', coalesce(v_scored_participant_count, 0),
    'hasRehearsalResults', coalesce(v_stats.total_answer_count, 0) > 0 or coalesce(v_scored_participant_count, 0) > 0,
    'distribution', public.get_answer_distribution(v_event.room_code, v_state.current_question_id),
    'ranking', v_ranking,
    'serverNow', now()
  );
end;
$$;

grant execute on function public.admin_set_password(text, text, text) to anon, authenticated;
grant execute on function public.admin_verify_password(text, text) to anon, authenticated;
grant execute on function public.admin_change_password(text, text, text) to anon, authenticated;
grant execute on function public.get_admin_room_snapshot(text, text) to anon, authenticated;
revoke all on function public.validate_admin_password(text) from public, anon, authenticated;
