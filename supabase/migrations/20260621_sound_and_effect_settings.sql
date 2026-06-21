alter table public.events
  add column if not exists sound_enabled boolean not null default true,
  add column if not exists visual_effects_enabled boolean not null default true,
  add column if not exists sound_pack text not null default 'elegant_wedding',
  add column if not exists effect_style text not null default 'standard',
  add column if not exists screen_volume numeric not null default 0.55,
  add column if not exists screen_confetti_enabled boolean not null default true,
  add column if not exists guest_sound_enabled boolean not null default false,
  add column if not exists guest_effects_enabled boolean not null default true;

do $$
begin
  alter table public.events
    add constraint events_sound_pack_check
    check (sound_pack in ('elegant_wedding', 'quiz_show_classic', 'party_pop', 'minimal_clean', 'night_party', 'custom'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_effect_style_check
    check (effect_style in ('minimal', 'standard', 'tv_show', 'party'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_screen_volume_check
    check (screen_volume >= 0 and screen_volume <= 1);
exception
  when duplicate_object then null;
end $$;

create table if not exists public.event_sound_assets (
  id uuid primary key default extensions.gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  sound_key text not null,
  file_url text not null,
  file_path text not null,
  file_name text null,
  mime_type text null,
  size_bytes integer null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_sound_assets_sound_key_check
    check (sound_key in ('start', 'countdown', 'close', 'reveal', 'correct', 'wrong', 'ranking', 'winner', 'submit')),
  constraint event_sound_assets_unique unique (event_id, sound_key)
);

create index if not exists event_sound_assets_event_id_idx
  on public.event_sound_assets(event_id);

alter table public.event_sound_assets enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('quiz-sounds', 'quiz-sounds', true, 2097152, array['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
