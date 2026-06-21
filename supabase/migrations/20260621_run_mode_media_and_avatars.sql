alter table public.events
  add column if not exists run_mode text not null default 'rehearsal',
  add column if not exists design_theme text not null default 'classic_bridal';

do $$
begin
  alter table public.events
    add constraint events_run_mode_check
    check (run_mode in ('rehearsal', 'production'));
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter table public.events
    add constraint events_design_theme_check
    check (design_theme in ('classic_bridal', 'garden_wedding', 'quiz_show', 'minimal_white', 'night_party'));
exception
  when duplicate_object then null;
end $$;

alter table public.questions
  add column if not exists image_url text null,
  add column if not exists presenter_note text null,
  add column if not exists option_1_image_url text null,
  add column if not exists option_2_image_url text null,
  add column if not exists option_3_image_url text null,
  add column if not exists option_4_image_url text null;

alter table public.participants
  add column if not exists avatar_url text null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('quiz-images', 'quiz-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('participant-avatars', 'participant-avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
