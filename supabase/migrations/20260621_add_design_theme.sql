alter table public.events
  add column if not exists design_theme text not null default 'classic_bridal';

do $$
begin
  alter table public.events
    add constraint events_design_theme_check
    check (design_theme in ('classic_bridal', 'garden_wedding', 'quiz_show', 'minimal_white', 'night_party'));
exception
  when duplicate_object then null;
end $$;
