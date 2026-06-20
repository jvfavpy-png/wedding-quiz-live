create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  room_code text unique not null,
  admin_key text not null,
  status text not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_status_check check (status in ('waiting', 'playing', 'finished')),
  constraint events_title_not_blank check (char_length(btrim(title)) > 0),
  constraint events_room_code_format check (room_code = upper(room_code) and char_length(room_code) between 4 and 12)
);

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  participant_token text not null,
  score integer not null default 0,
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint participants_event_token_unique unique (event_id, participant_token),
  constraint participants_score_non_negative check (score >= 0),
  constraint participants_name_not_blank check (char_length(btrim(name)) > 0),
  constraint participants_name_length check (char_length(name) <= 20)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  order_no integer not null,
  text text not null,
  option_1 text not null,
  option_2 text not null,
  option_3 text not null,
  option_4 text not null,
  correct_index integer not null,
  time_limit_sec integer not null default 10,
  created_at timestamptz not null default now(),
  constraint questions_event_order_unique unique (event_id, order_no) deferrable initially immediate,
  constraint questions_order_positive check (order_no > 0),
  constraint questions_correct_index_check check (correct_index in (0, 1, 2, 3)),
  constraint questions_time_limit_check check (time_limit_sec between 5 and 60),
  constraint questions_text_not_blank check (char_length(btrim(text)) > 0),
  constraint questions_options_not_blank check (
    char_length(btrim(option_1)) > 0 and
    char_length(btrim(option_2)) > 0 and
    char_length(btrim(option_3)) > 0 and
    char_length(btrim(option_4)) > 0
  )
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  selected_index integer not null,
  response_ms integer not null,
  is_correct boolean not null,
  point integer not null,
  answered_at timestamptz not null default now(),
  constraint answers_question_participant_unique unique (question_id, participant_id),
  constraint answers_selected_index_check check (selected_index in (0, 1, 2, 3)),
  constraint answers_response_ms_non_negative check (response_ms >= 0),
  constraint answers_point_non_negative check (point >= 0)
);

create table if not exists public.live_state (
  event_id uuid primary key references public.events(id) on delete cascade,
  current_question_id uuid references public.questions(id) on delete set null,
  phase text not null default 'lobby',
  question_started_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint live_state_phase_check check (phase in ('lobby', 'question', 'closed', 'answer', 'ranking', 'finished'))
);

create table if not exists public.event_stats (
  event_id uuid primary key references public.events(id) on delete cascade,
  participant_count integer not null default 0,
  total_answer_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint event_stats_counts_non_negative check (participant_count >= 0 and total_answer_count >= 0)
);

create table if not exists public.question_stats (
  question_id uuid primary key references public.questions(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  option_0_count integer not null default 0,
  option_1_count integer not null default 0,
  option_2_count integer not null default 0,
  option_3_count integer not null default 0,
  total_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint question_stats_counts_non_negative check (
    option_0_count >= 0 and option_1_count >= 0 and option_2_count >= 0 and option_3_count >= 0 and total_count >= 0
  )
);

create index if not exists participants_event_score_idx on public.participants(event_id, score desc, joined_at asc);
create index if not exists questions_event_order_idx on public.questions(event_id, order_no asc);
create index if not exists answers_event_question_idx on public.answers(event_id, question_id);
create index if not exists answers_participant_idx on public.answers(participant_id);
create index if not exists question_stats_event_idx on public.question_stats(event_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

drop trigger if exists live_state_set_updated_at on public.live_state;
create trigger live_state_set_updated_at
before update on public.live_state
for each row execute function public.set_updated_at();

create or replace function public.create_event_children()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.live_state(event_id) values (new.id) on conflict (event_id) do nothing;
  insert into public.event_stats(event_id) values (new.id) on conflict (event_id) do nothing;
  return new;
end;
$$;

drop trigger if exists events_create_children on public.events;
create trigger events_create_children
after insert on public.events
for each row execute function public.create_event_children();

create or replace function public.refresh_participant_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  v_event_id = coalesce(new.event_id, old.event_id);
  update public.event_stats
  set participant_count = (
        select count(*)::integer from public.participants where event_id = v_event_id
      ),
      updated_at = now()
  where event_id = v_event_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists participants_refresh_count_insert on public.participants;
create trigger participants_refresh_count_insert
after insert on public.participants
for each row execute function public.refresh_participant_count();

drop trigger if exists participants_refresh_count_delete on public.participants;
create trigger participants_refresh_count_delete
after delete on public.participants
for each row execute function public.refresh_participant_count();

create or replace function public.create_question_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.question_stats(question_id, event_id)
  values (new.id, new.event_id)
  on conflict (question_id) do nothing;
  return new;
end;
$$;

drop trigger if exists questions_create_stats on public.questions;
create trigger questions_create_stats
after insert on public.questions
for each row execute function public.create_question_stats();

create or replace function public.apply_answer_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.question_stats(
    question_id,
    event_id,
    option_0_count,
    option_1_count,
    option_2_count,
    option_3_count,
    total_count,
    updated_at
  )
  values (
    new.question_id,
    new.event_id,
    case when new.selected_index = 0 then 1 else 0 end,
    case when new.selected_index = 1 then 1 else 0 end,
    case when new.selected_index = 2 then 1 else 0 end,
    case when new.selected_index = 3 then 1 else 0 end,
    1,
    now()
  )
  on conflict (question_id) do update
  set option_0_count = public.question_stats.option_0_count + excluded.option_0_count,
      option_1_count = public.question_stats.option_1_count + excluded.option_1_count,
      option_2_count = public.question_stats.option_2_count + excluded.option_2_count,
      option_3_count = public.question_stats.option_3_count + excluded.option_3_count,
      total_count = public.question_stats.total_count + 1,
      updated_at = now();

  update public.event_stats
  set total_answer_count = total_answer_count + 1,
      updated_at = now()
  where event_id = new.event_id;

  return new;
end;
$$;

drop trigger if exists answers_apply_stats on public.answers;
create trigger answers_apply_stats
after insert on public.answers
for each row execute function public.apply_answer_stats();

create or replace function public.require_admin_event(p_room_code text, p_admin_key text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  select id into v_event_id
  from public.events
  where room_code = upper(btrim(p_room_code))
    and admin_key = p_admin_key;

  if v_event_id is null then
    raise exception '管理キーが正しくありません' using errcode = 'P0001';
  end if;

  return v_event_id;
end;
$$;

create or replace function public.speed_bonus(p_response_ms integer)
returns integer
language sql
immutable
as $$
  select case
    when p_response_ms <= 2000 then 50
    when p_response_ms <= 4000 then 40
    when p_response_ms <= 6000 then 30
    when p_response_ms <= 8000 then 20
    else 10
  end;
$$;

create or replace function public.join_event(
  p_room_code text,
  p_name text,
  p_participant_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_participant public.participants%rowtype;
  v_name text;
  v_token text;
begin
  v_name = left(btrim(coalesce(p_name, '')), 20);
  v_token = btrim(coalesce(p_participant_token, ''));

  if char_length(v_name) = 0 then
    raise exception '名前を入力してください' using errcode = 'P0001';
  end if;

  if char_length(v_token) < 20 then
    raise exception '参加者トークンが不正です' using errcode = 'P0001';
  end if;

  select * into v_event
  from public.events
  where room_code = upper(btrim(p_room_code));

  if not found then
    raise exception 'イベントが見つかりません' using errcode = 'P0001';
  end if;

  if v_event.status = 'finished' then
    raise exception 'このイベントは終了しています' using errcode = 'P0001';
  end if;

  select * into v_participant
  from public.participants
  where event_id = v_event.id and participant_token = v_token;

  if found then
    update public.participants
    set name = v_name,
        last_seen_at = now()
    where id = v_participant.id
    returning * into v_participant;
  else
    insert into public.participants(event_id, name, participant_token)
    values (v_event.id, v_name, v_token)
    returning * into v_participant;
  end if;

  return jsonb_build_object(
    'participantId', v_participant.id,
    'name', v_participant.name,
    'score', v_participant.score,
    'joinedAt', v_participant.joined_at
  );
end;
$$;

create or replace function public.submit_answer(
  p_room_code text,
  p_participant_id uuid,
  p_participant_token text,
  p_question_id uuid,
  p_selected_index integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_participant public.participants%rowtype;
  v_state public.live_state%rowtype;
  v_question public.questions%rowtype;
  v_now timestamptz = now();
  v_response_ms integer;
  v_is_correct boolean;
  v_point integer;
  v_answer_id uuid;
begin
  if p_selected_index not in (0, 1, 2, 3) then
    raise exception '回答の選択肢が不正です' using errcode = 'P0001';
  end if;

  select * into v_event
  from public.events
  where room_code = upper(btrim(p_room_code));

  if not found then
    raise exception 'イベントが見つかりません' using errcode = 'P0001';
  end if;

  if v_event.status = 'finished' then
    raise exception 'このイベントは終了しています' using errcode = 'P0001';
  end if;

  select * into v_participant
  from public.participants
  where id = p_participant_id
    and event_id = v_event.id
    and participant_token = p_participant_token
  for update;

  if not found then
    raise exception '参加情報を確認できません。再参加してください' using errcode = 'P0001';
  end if;

  select * into v_state
  from public.live_state
  where event_id = v_event.id
  for update;

  if v_state.phase <> 'question' then
    raise exception '現在は回答受付中ではありません' using errcode = 'P0001';
  end if;

  if v_state.current_question_id is distinct from p_question_id then
    raise exception '現在の問題と回答対象が一致しません' using errcode = 'P0001';
  end if;

  if v_state.question_started_at is null then
    raise exception '問題開始時刻が未設定です' using errcode = 'P0001';
  end if;

  select * into v_question
  from public.questions
  where id = p_question_id and event_id = v_event.id;

  if not found then
    raise exception '問題が見つかりません' using errcode = 'P0001';
  end if;

  if v_now > v_state.question_started_at + make_interval(secs => v_question.time_limit_sec) then
    raise exception '回答時間を過ぎています' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.answers
    where question_id = p_question_id and participant_id = p_participant_id
  ) then
    raise exception 'すでに回答済みです' using errcode = 'P0001';
  end if;

  v_response_ms = greatest(0, floor(extract(epoch from (v_now - v_state.question_started_at)) * 1000)::integer);
  v_is_correct = v_question.correct_index = p_selected_index;
  v_point = case when v_is_correct then 100 + public.speed_bonus(v_response_ms) else 0 end;

  begin
    insert into public.answers(
      event_id,
      question_id,
      participant_id,
      selected_index,
      response_ms,
      is_correct,
      point
    )
    values (
      v_event.id,
      p_question_id,
      p_participant_id,
      p_selected_index,
      v_response_ms,
      v_is_correct,
      v_point
    )
    returning id into v_answer_id;
  exception
    when unique_violation then
      raise exception 'すでに回答済みです' using errcode = 'P0001';
  end;

  if v_is_correct then
    update public.participants
    set score = score + v_point,
        last_seen_at = now()
    where id = p_participant_id;
  else
    update public.participants
    set last_seen_at = now()
    where id = p_participant_id;
  end if;

  return jsonb_build_object(
    'accepted', true,
    'answerId', v_answer_id,
    'selectedIndex', p_selected_index,
    'responseMs', v_response_ms
  );
end;
$$;

create or replace function public.admin_start_question(
  p_room_code text,
  p_admin_key text,
  p_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_state public.live_state%rowtype;
  v_question public.questions%rowtype;
begin
  v_event_id = public.require_admin_event(p_room_code, p_admin_key);

  select * into v_question
  from public.questions
  where id = p_question_id and event_id = v_event_id;

  if not found then
    raise exception '問題が見つかりません' using errcode = 'P0001';
  end if;

  select * into v_state
  from public.live_state
  where event_id = v_event_id
  for update;

  if v_state.phase = 'question' then
    raise exception 'すでに回答受付中です。先に締め切ってください' using errcode = 'P0001';
  end if;

  if v_state.phase = 'finished' then
    raise exception '終了済みイベントは再開できません' using errcode = 'P0001';
  end if;

  if v_state.current_question_id = p_question_id and v_state.phase in ('closed', 'answer', 'ranking') then
    raise exception '同じ問題は再開始できません。次の問題を選んでください' using errcode = 'P0001';
  end if;

  update public.live_state
  set phase = 'question',
      current_question_id = p_question_id,
      question_started_at = now()
  where event_id = v_event_id;

  update public.events
  set status = 'playing'
  where id = v_event_id;

  return jsonb_build_object('ok', true, 'phase', 'question', 'questionId', p_question_id);
end;
$$;

create or replace function public.admin_close_question(p_room_code text, p_admin_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_phase text;
begin
  v_event_id = public.require_admin_event(p_room_code, p_admin_key);

  select phase into v_phase from public.live_state where event_id = v_event_id for update;
  if v_phase <> 'question' then
    raise exception '回答受付中の問題がありません' using errcode = 'P0001';
  end if;

  update public.live_state set phase = 'closed' where event_id = v_event_id;
  return jsonb_build_object('ok', true, 'phase', 'closed');
end;
$$;

create or replace function public.admin_reveal_answer(p_room_code text, p_admin_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_phase text;
begin
  v_event_id = public.require_admin_event(p_room_code, p_admin_key);

  select phase into v_phase from public.live_state where event_id = v_event_id for update;
  if v_phase <> 'closed' then
    raise exception '先に回答を締め切ってください' using errcode = 'P0001';
  end if;

  update public.live_state set phase = 'answer' where event_id = v_event_id;
  return jsonb_build_object('ok', true, 'phase', 'answer');
end;
$$;

create or replace function public.admin_show_ranking(p_room_code text, p_admin_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_phase text;
begin
  v_event_id = public.require_admin_event(p_room_code, p_admin_key);

  select phase into v_phase from public.live_state where event_id = v_event_id for update;
  if v_phase <> 'answer' then
    raise exception '先に正解を発表してください' using errcode = 'P0001';
  end if;

  update public.live_state set phase = 'ranking' where event_id = v_event_id;
  return jsonb_build_object('ok', true, 'phase', 'ranking');
end;
$$;

create or replace function public.admin_finish_event(p_room_code text, p_admin_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  v_event_id = public.require_admin_event(p_room_code, p_admin_key);

  update public.live_state
  set phase = 'finished'
  where event_id = v_event_id;

  update public.events
  set status = 'finished'
  where id = v_event_id;

  return jsonb_build_object('ok', true, 'phase', 'finished');
end;
$$;

create or replace function public.admin_upsert_question(
  p_room_code text,
  p_admin_key text,
  p_question_id uuid,
  p_order_no integer,
  p_text text,
  p_option_1 text,
  p_option_2 text,
  p_option_3 text,
  p_option_4 text,
  p_correct_index integer,
  p_time_limit_sec integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_question public.questions%rowtype;
  v_order_no integer;
  v_trimmed_text text;
begin
  v_event_id = public.require_admin_event(p_room_code, p_admin_key);

  if p_correct_index not in (0, 1, 2, 3) then
    raise exception '正解番号が不正です' using errcode = 'P0001';
  end if;

  if p_time_limit_sec < 5 or p_time_limit_sec > 60 then
    raise exception '制限時間は5〜60秒で設定してください' using errcode = 'P0001';
  end if;

  v_trimmed_text = btrim(coalesce(p_text, ''));
  if char_length(v_trimmed_text) = 0 then
    raise exception '問題文を入力してください' using errcode = 'P0001';
  end if;

  if char_length(btrim(coalesce(p_option_1, ''))) = 0
    or char_length(btrim(coalesce(p_option_2, ''))) = 0
    or char_length(btrim(coalesce(p_option_3, ''))) = 0
    or char_length(btrim(coalesce(p_option_4, ''))) = 0 then
    raise exception '4つの選択肢をすべて入力してください' using errcode = 'P0001';
  end if;

  if p_question_id is null then
    select coalesce(max(order_no), 0) + 1 into v_order_no
    from public.questions
    where event_id = v_event_id;

    insert into public.questions(
      event_id,
      order_no,
      text,
      option_1,
      option_2,
      option_3,
      option_4,
      correct_index,
      time_limit_sec
    )
    values (
      v_event_id,
      coalesce(nullif(p_order_no, 0), v_order_no),
      v_trimmed_text,
      btrim(coalesce(p_option_1, '')),
      btrim(coalesce(p_option_2, '')),
      btrim(coalesce(p_option_3, '')),
      btrim(coalesce(p_option_4, '')),
      p_correct_index,
      p_time_limit_sec
    )
    returning * into v_question;
  else
    if exists (select 1 from public.answers where question_id = p_question_id) then
      raise exception '回答済みのある問題は編集できません' using errcode = 'P0001';
    end if;

    if exists (
      select 1
      from public.live_state
      where event_id = v_event_id
        and current_question_id = p_question_id
        and phase = 'question'
    ) then
      raise exception '回答受付中の問題は編集できません' using errcode = 'P0001';
    end if;

    update public.questions
    set text = v_trimmed_text,
        option_1 = btrim(coalesce(p_option_1, '')),
        option_2 = btrim(coalesce(p_option_2, '')),
        option_3 = btrim(coalesce(p_option_3, '')),
        option_4 = btrim(coalesce(p_option_4, '')),
        correct_index = p_correct_index,
        time_limit_sec = p_time_limit_sec
    where id = p_question_id and event_id = v_event_id
    returning * into v_question;

    if not found then
      raise exception '問題が見つかりません' using errcode = 'P0001';
    end if;
  end if;

  return jsonb_build_object(
    'id', v_question.id,
    'orderNo', v_question.order_no,
    'text', v_question.text,
    'options', jsonb_build_array(v_question.option_1, v_question.option_2, v_question.option_3, v_question.option_4),
    'correctIndex', v_question.correct_index,
    'timeLimitSec', v_question.time_limit_sec
  );
end;
$$;

create or replace function public.admin_delete_question(
  p_room_code text,
  p_admin_key text,
  p_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  v_event_id = public.require_admin_event(p_room_code, p_admin_key);

  if exists (select 1 from public.answers where question_id = p_question_id) then
    raise exception '回答済みのある問題は削除できません' using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.live_state
    where event_id = v_event_id
      and current_question_id = p_question_id
      and phase in ('question', 'closed', 'answer', 'ranking')
  ) then
    raise exception '進行中または表示中の問題は削除できません' using errcode = 'P0001';
  end if;

  delete from public.questions
  where id = p_question_id and event_id = v_event_id;

  if not found then
    raise exception '問題が見つかりません' using errcode = 'P0001';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.admin_reorder_questions(
  p_room_code text,
  p_admin_key text,
  p_question_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_expected_count integer;
  v_owned_count integer;
  v_index integer;
begin
  v_event_id = public.require_admin_event(p_room_code, p_admin_key);

  select count(*)::integer into v_expected_count
  from public.questions
  where event_id = v_event_id;

  if p_question_ids is null then
    raise exception '問題の並び順データが不正です' using errcode = 'P0001';
  end if;

  select count(distinct u.question_id)::integer into v_owned_count
  from unnest(p_question_ids) as u(question_id)
  join public.questions q on q.id = u.question_id and q.event_id = v_event_id;

  if cardinality(p_question_ids) <> v_expected_count or v_owned_count <> v_expected_count then
    raise exception '問題の並び順データが不正です' using errcode = 'P0001';
  end if;

  set constraints questions_event_order_unique deferred;

  for v_index in 1..cardinality(p_question_ids) loop
    update public.questions
    set order_no = v_index
    where id = p_question_ids[v_index] and event_id = v_event_id;
  end loop;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.get_room_snapshot(p_room_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_state public.live_state%rowtype;
  v_question public.questions%rowtype;
  v_stats public.event_stats%rowtype;
  v_reveal boolean;
  v_question_json jsonb;
begin
  select * into v_event
  from public.events
  where room_code = upper(btrim(p_room_code));

  if not found then
    raise exception 'イベントが見つかりません' using errcode = 'P0001';
  end if;

  select * into v_state from public.live_state where event_id = v_event.id;
  select * into v_stats from public.event_stats where event_id = v_event.id;
  v_reveal = v_state.phase in ('answer', 'ranking', 'finished');

  if v_state.current_question_id is not null then
    select * into v_question
    from public.questions
    where id = v_state.current_question_id and event_id = v_event.id;

    if found then
      v_question_json = jsonb_build_object(
        'id', v_question.id,
        'orderNo', v_question.order_no,
        'text', v_question.text,
        'options', jsonb_build_array(v_question.option_1, v_question.option_2, v_question.option_3, v_question.option_4),
        'correctIndex', case when v_reveal then to_jsonb(v_question.correct_index) else 'null'::jsonb end,
        'timeLimitSec', v_question.time_limit_sec
      );
    end if;
  end if;

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
    'currentQuestion', coalesce(v_question_json, 'null'::jsonb),
    'participantCount', coalesce(v_stats.participant_count, 0),
    'totalAnswerCount', coalesce(v_stats.total_answer_count, 0),
    'serverNow', now()
  );
end;
$$;

create or replace function public.get_answer_distribution(
  p_room_code text,
  p_question_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_state public.live_state%rowtype;
  v_question public.questions%rowtype;
  v_stats public.question_stats%rowtype;
  v_target_question_id uuid;
  v_reveal boolean;
begin
  select * into v_event
  from public.events
  where room_code = upper(btrim(p_room_code));

  if not found then
    raise exception 'イベントが見つかりません' using errcode = 'P0001';
  end if;

  select * into v_state from public.live_state where event_id = v_event.id;
  v_target_question_id = coalesce(p_question_id, v_state.current_question_id);

  if v_target_question_id is null then
    return jsonb_build_object('questionId', null, 'options', '[]'::jsonb, 'counts', jsonb_build_array(0, 0, 0, 0), 'total', 0, 'correctIndex', null);
  end if;

  select * into v_question
  from public.questions
  where id = v_target_question_id and event_id = v_event.id;

  if not found then
    raise exception '問題が見つかりません' using errcode = 'P0001';
  end if;

  select * into v_stats
  from public.question_stats
  where question_id = v_question.id;

  v_reveal = v_state.phase in ('answer', 'ranking', 'finished');

  return jsonb_build_object(
    'questionId', v_question.id,
    'options', jsonb_build_array(v_question.option_1, v_question.option_2, v_question.option_3, v_question.option_4),
    'counts', jsonb_build_array(
      coalesce(v_stats.option_0_count, 0),
      coalesce(v_stats.option_1_count, 0),
      coalesce(v_stats.option_2_count, 0),
      coalesce(v_stats.option_3_count, 0)
    ),
    'total', coalesce(v_stats.total_count, 0),
    'correctIndex', case when v_reveal then to_jsonb(v_question.correct_index) else 'null'::jsonb end
  );
end;
$$;

create or replace function public.get_ranking(p_room_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_phase text;
  v_rows jsonb;
begin
  select * into v_event
  from public.events
  where room_code = upper(btrim(p_room_code));

  if not found then
    raise exception 'イベントが見つかりません' using errcode = 'P0001';
  end if;

  select phase into v_phase from public.live_state where event_id = v_event.id;
  if v_phase not in ('ranking', 'finished') then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(row_json order by (row_json->>'rank')::integer), '[]'::jsonb) into v_rows
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

  return v_rows;
end;
$$;

create or replace function public.get_my_answer(
  p_room_code text,
  p_participant_id uuid,
  p_participant_token text,
  p_question_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_participant public.participants%rowtype;
  v_state public.live_state%rowtype;
  v_answer public.answers%rowtype;
  v_reveal boolean;
begin
  select * into v_event
  from public.events
  where room_code = upper(btrim(p_room_code));

  if not found then
    raise exception 'イベントが見つかりません' using errcode = 'P0001';
  end if;

  select * into v_participant
  from public.participants
  where id = p_participant_id
    and event_id = v_event.id
    and participant_token = p_participant_token;

  if not found then
    raise exception '参加情報を確認できません' using errcode = 'P0001';
  end if;

  select * into v_state from public.live_state where event_id = v_event.id;
  select * into v_answer
  from public.answers
  where event_id = v_event.id
    and question_id = p_question_id
    and participant_id = p_participant_id;

  if not found then
    return 'null'::jsonb;
  end if;

  v_reveal = v_state.phase in ('answer', 'ranking', 'finished');

  return jsonb_build_object(
    'questionId', v_answer.question_id,
    'selectedIndex', v_answer.selected_index,
    'responseMs', v_answer.response_ms,
    'isCorrect', case when v_reveal then to_jsonb(v_answer.is_correct) else 'null'::jsonb end,
    'point', case when v_reveal then to_jsonb(v_answer.point) else 'null'::jsonb end
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
begin
  perform public.require_admin_event(p_room_code, p_admin_key);

  select * into v_event
  from public.events
  where room_code = upper(btrim(p_room_code));

  select * into v_state from public.live_state where event_id = v_event.id;
  select * into v_stats from public.event_stats where event_id = v_event.id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'orderNo', q.order_no,
      'text', q.text,
      'options', jsonb_build_array(q.option_1, q.option_2, q.option_3, q.option_4),
      'correctIndex', q.correct_index,
      'timeLimitSec', q.time_limit_sec
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
    'distribution', public.get_answer_distribution(v_event.room_code, v_state.current_question_id),
    'ranking', v_ranking,
    'serverNow', now()
  );
end;
$$;

alter table public.events enable row level security;
alter table public.participants enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.live_state enable row level security;
alter table public.event_stats enable row level security;
alter table public.question_stats enable row level security;

drop policy if exists "Public can read live state" on public.live_state;
create policy "Public can read live state"
on public.live_state for select
to anon, authenticated
using (true);

drop policy if exists "Public can read event stats" on public.event_stats;
create policy "Public can read event stats"
on public.event_stats for select
to anon, authenticated
using (true);

drop policy if exists "Public can read question stats" on public.question_stats;
create policy "Public can read question stats"
on public.question_stats for select
to anon, authenticated
using (true);

revoke all on table public.events from anon, authenticated;
revoke all on table public.participants from anon, authenticated;
revoke all on table public.questions from anon, authenticated;
revoke all on table public.answers from anon, authenticated;
revoke all on table public.live_state from anon, authenticated;
revoke all on table public.event_stats from anon, authenticated;
revoke all on table public.question_stats from anon, authenticated;

grant select on table public.live_state to anon, authenticated;
grant select on table public.event_stats to anon, authenticated;
grant select on table public.question_stats to anon, authenticated;

grant execute on function public.join_event(text, text, text) to anon, authenticated;
grant execute on function public.submit_answer(text, uuid, text, uuid, integer) to anon, authenticated;
grant execute on function public.get_room_snapshot(text) to anon, authenticated;
grant execute on function public.get_answer_distribution(text, uuid) to anon, authenticated;
grant execute on function public.get_ranking(text) to anon, authenticated;
grant execute on function public.get_my_answer(text, uuid, text, uuid) to anon, authenticated;

grant execute on function public.admin_start_question(text, text, uuid) to anon, authenticated;
grant execute on function public.admin_close_question(text, text) to anon, authenticated;
grant execute on function public.admin_reveal_answer(text, text) to anon, authenticated;
grant execute on function public.admin_show_ranking(text, text) to anon, authenticated;
grant execute on function public.admin_finish_event(text, text) to anon, authenticated;
grant execute on function public.admin_upsert_question(text, text, uuid, integer, text, text, text, text, text, integer, integer) to anon, authenticated;
grant execute on function public.admin_delete_question(text, text, uuid) to anon, authenticated;
grant execute on function public.admin_reorder_questions(text, text, uuid[]) to anon, authenticated;
grant execute on function public.get_admin_room_snapshot(text, text) to anon, authenticated;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.create_event_children() from public, anon, authenticated;
revoke all on function public.refresh_participant_count() from public, anon, authenticated;
revoke all on function public.create_question_stats() from public, anon, authenticated;
revoke all on function public.apply_answer_stats() from public, anon, authenticated;
revoke all on function public.require_admin_event(text, text) from public, anon, authenticated;

do $$
begin
  alter publication supabase_realtime add table public.live_state;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.event_stats;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.question_stats;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
