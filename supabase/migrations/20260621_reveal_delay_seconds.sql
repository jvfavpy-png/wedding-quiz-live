alter table public.events
  add column if not exists reveal_delay_seconds numeric not null default 1.2;

do $$
begin
  alter table public.events
    add constraint events_reveal_delay_seconds_check
    check (reveal_delay_seconds >= 0 and reveal_delay_seconds <= 5);
exception
  when duplicate_object then null;
end $$;
