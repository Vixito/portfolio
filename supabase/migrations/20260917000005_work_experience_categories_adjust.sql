-- Ajuste del catálogo de categorías de experiencia:
--   * Se elimina 'proyectos' (existe una sección propia de proyectos).
--   * 'internacional' se reemplaza por 'profesional'.
-- Una experiencia conserva el modelo multi-categoría (categories text[]).

update public.work_experiences
  set categories = coalesce(
    (
      select array_agg(distinct mapped)
      from (
        select case when c = 'internacional' then 'profesional' else c end as mapped
        from unnest(categories) as c
        where c <> 'proyectos'
      ) s
    ),
    '{}'
  )
  where categories && array['proyectos', 'internacional'];

update public.work_experiences
  set category = 'profesional'
  where category = 'internacional';

update public.work_experiences
  set category = 'laboral'
  where category = 'proyectos';

alter table public.work_experiences
  drop constraint if exists work_experiences_category_check;

alter table public.work_experiences
  add constraint work_experiences_category_check
  check (
    category in (
      'laboral',
      'profesional',
      'relacionada',
      'freelance',
      'practicas',
      'docencia',
      'investigacion',
      'voluntariado'
    )
  );
