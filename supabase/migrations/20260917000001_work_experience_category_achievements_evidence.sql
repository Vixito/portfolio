-- Experiencia: clasificación (laboral/profesional/relacionada), logros y evidencias.

alter table public.work_experiences
  add column if not exists category text not null default 'laboral';

alter table public.work_experiences
  add column if not exists achievements jsonb not null default '[]'::jsonb;

alter table public.work_experiences
  add column if not exists evidence jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'work_experiences_category_check'
  ) then
    alter table public.work_experiences
      add constraint work_experiences_category_check
      check (category in ('laboral', 'profesional', 'relacionada'));
  end if;
end $$;

create index if not exists work_experiences_category_idx
  on public.work_experiences (category);
