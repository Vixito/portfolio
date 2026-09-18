-- Experiencia multi-categoría (Colombia + estándar internacional tipo Europass).
-- Una experiencia puede pertenecer a varias categorías; se guardan en `categories`.
-- `category` se mantiene como categoría principal (primera del array) por
-- compatibilidad con el código que aún lo lee.

alter table public.work_experiences
  add column if not exists categories text[] not null default '{}';

update public.work_experiences
  set categories = array[category]
  where (categories is null or categories = '{}')
    and category is not null;

-- Amplía los valores permitidos en la categoría principal (incluye legacy).
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
      'voluntariado',
      'proyectos',
      'internacional'
    )
  );

create index if not exists work_experiences_categories_idx
  on public.work_experiences using gin (categories);
