-- Añade "voluntariado" a las categorías de experiencia.
alter table public.work_experiences
  drop constraint if exists work_experiences_category_check;

alter table public.work_experiences
  add constraint work_experiences_category_check
  check (category in ('laboral', 'profesional', 'relacionada', 'voluntariado'));
