-- CRM: campos personalizables estilo Notion/Twenty.
-- Metadatos de campos en `crm_fields` + valores de campos propios en JSONB `data`.
-- Los campos semilla cubren el catálogo de Personas y Organizaciones en orden alfabético.

create table if not exists crm_fields (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null check (entity_type in ('person', 'company')),
  name         text not null,
  label        text not null,
  label_en     text,
  type         text not null,
  icon         text,
  options      jsonb not null default '[]',
  storage      text not null default 'data' check (storage in ('column', 'data')),
  column_name  text,
  position     integer not null default 0,
  is_system    boolean not null default false,
  is_visible   boolean not null default true,
  is_readonly  boolean not null default false,
  description  text,
  settings     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (entity_type, name)
);

alter table crm_contacts add column if not exists status text not null default 'nuevo';
alter table crm_contacts add column if not exists data jsonb not null default '{}';
alter table crm_companies add column if not exists status text not null default 'nuevo';
alter table crm_companies add column if not exists data jsonb not null default '{}';

alter table crm_fields enable row level security;

-- ===========================================================================
-- Catálogo de campos: PERSONAS (orden alfabético) + Estado
-- ===========================================================================
insert into crm_fields
  (entity_type, name, label, label_en, type, icon, options, storage, column_name, position, is_system, is_visible, is_readonly)
values
  ('person', 'alias',              'Alias',                    'Alias',                  'text',        '🙋',  '[]', 'data',   null,                      10,  false, true,  false),
  ('person', 'apellidos',          'Apellidos',                'Last name',              'text',        '👤',  '[]', 'column', 'last_name',               20,  true,  true,  false),
  ('person', 'anios_experiencia',  'Años de experiencia',      'Years of experience',    'number',      '🕐',  '[]', 'column', 'experience_years',         30,  true,  true,  false),
  ('person', 'carrera',            'Carrera',                  'Career',                 'text',        '🎓',  '[]', 'data',   null,                      40,  false, true,  false),
  ('person', 'certificaciones',    'Certificaciones',          'Certifications',         'textarea',    '📜',  '[]', 'data',   null,                      50,  false, true,  false),
  ('person', 'correos_electronicos','Correos electrónicos',   'Emails',                 'emails',      '📧',  '[]', 'data',   null,                      60,  true,  true,  false),
  ('person', 'estado',             'Estado',                   'Status',                 'select',      '🔄',  '["nuevo","interesado","lead","cliente","ex-cliente","inactivo"]', 'column', 'status', 70, true, true,  false),
  ('person', 'estrato',            'Estrato',                  'Stratum',                'select',      '🏠',  '["1","2","3","4","5","6"]', 'data', null,        80,  false, true,  false),
  ('person', 'estudios',           'Estudios',                 'Education',              'textarea',    '🏫',  '[]', 'data',   null,                      90,  false, true,  false),
  ('person', 'experiencia',        'Experiencia',              'Experience',             'textarea',    '💼',  '[]', 'data',   null,                     100,  false, true,  false),
  ('person', 'facebook',           'Facebook',                 'Facebook',               'url',         '📘',  '[]', 'data',   null,                     110,  false, true,  false),
  ('person', 'fecha_creacion',     'Fecha de creación',        'Created at',             'date',        '🕓',  '[]', 'column', 'created_at',             120,  true,  true,  true),
  ('person', 'fecha_cumpleanos',   'Fecha de cumpleaños',      'Birthday',               'date',        '🎂',  '[]', 'column', 'birthdate',              130,  true,  true,  false),
  ('person', 'fecha_inicio_puesto','Fecha de inicio del puesto','Job start date',        'date',        '🗓️',  '[]', 'data',   null,                     140,  false, true,  false),
  ('person', 'foto_perfil',        'Foto de perfil o de avatar','Profile photo',         'image',       '🖼️',  '[]', 'column', 'photo_url',              150,  true,  true,  false),
  ('person', 'genero',             'Género',                   'Gender',                 'select',      '⚧',  '["Femenino","Masculino","No binario","Otro","Prefiero no decir"]', 'column', 'gender', 160, true, true, false),
  ('person', 'github',             'GitHub',                   'GitHub',                 'url',         '🐙',  '[]', 'column', 'github',                 170,  true,  true,  false),
  ('person', 'habilidades',        'Habilidades',              'Skills',                 'multi_select','🧰',  '[]', 'data',   null,                     180,  false, true,  false),
  ('person', 'identificacion',     'Identificación',           'ID number',              'text',        '🪪',  '[]', 'data',   null,                     190,  false, true,  false),
  ('person', 'idiomas',            'Idiomas',                  'Languages',              'multi_select','🌐',  '[]', 'data',   null,                     200,  false, true,  false),
  ('person', 'instagram',          'Instagram',                'Instagram',              'url',         '📸',  '[]', 'data',   null,                     210,  false, true,  false),
  ('person', 'intereses',          'Intereses',                'Interests',              'multi_select','💡',  '[]', 'data',   null,                     220,  false, true,  false),
  ('person', 'linkedin',           'LinkedIn',                 'LinkedIn',               'url',         '🔗',  '[]', 'column', 'linkedin',               230,  true,  true,  false),
  ('person', 'nombres',            'Nombres',                  'First name',             'text',        '👤',  '[]', 'column', 'first_name',             240,  true,  true,  false),
  ('person', 'notas',              'Notas',                    'Notes',                  'textarea',    '📝',  '[]', 'column', 'notes',                  250,  true,  true,  false),
  ('person', 'rango_salario',      'Rango de salario',         'Salary range',           'select',      '💰',  '["Menos de 2M","2-4M","4-6M","6-10M","10-20M","Más de 20M"]', 'data', null, 260, false, true, false),
  ('person', 'rol_trabajo',        'Rol de trabajo',           'Job title',              'text',        '🧑‍💼', '[]', 'column', 'job_title',         270,  true,  true,  false),
  ('person', 'tags',               'Tags',                     'Tags',                   'tags',        '🏷️',  '[]', 'column', 'tags',                  280,  true,  true,  false),
  ('person', 'telefonos',          'Teléfonos',                'Phone numbers',          'phones',      '📞',  '[]', 'data',   null,                     290,  true,  true,  false),
  ('person', 'tiktok',             'TikTok',                   'TikTok',                 'url',         '🎵',  '[]', 'data',   null,                     300,  false, true,  false),
  ('person', 'ubicacion',          'Ubicación',                'Location',               'text',        '📍',  '[]', 'data',   null,                     310,  false, true,  false),
  ('person', 'x',                  'X',                        'X',                      'url',         '✖️',  '[]', 'column', 'x_handle',               320,  false, true,  false)
on conflict (entity_type, name) do nothing;

-- ===========================================================================
-- Catálogo de campos: ORGANIZACIONES (orden alfabético) + Estado
-- ===========================================================================
insert into crm_fields
  (entity_type, name, label, label_en, type, icon, options, storage, column_name, position, is_system, is_visible, is_readonly)
values
  ('company', 'correos_electronicos', 'Correos electrónicos', 'Emails',           'emails',      '📧',  '[]', 'data',   null,           10,  false, true,  false),
  ('company', 'direccion',            'Dirección',             'Street address',   'text',        '🏢',  '[]', 'column', 'address',      20,  true,  true,  false),
  ('company', 'dominios',             'Dominios',              'Domains',          'multi_select','🌐',  '[]', 'data',   null,           30,  false, true,  false),
  ('company', 'estado',               'Estado',                'Status',           'select',      '🔄',  '["nuevo","prospecto","cliente","ex-cliente"]', 'column', 'status', 40, true, true, false),
  ('company', 'estrato',              'Estrato',               'Stratum',          'select',      '🏠',  '["1","2","3","4","5","6"]', 'data', null, 50, false, true,  false),
  ('company', 'facebook',             'Facebook',              'Facebook',         'url',         '📘',  '[]', 'data',   null,           60,  false, true,  false),
  ('company', 'fecha_fundacion',      'Fecha de fundación',    'Founded year',     'number',      '🏛️',  '[]', 'column', 'founded_year', 70,  true,  true,  false),
  ('company', 'github',               'GitHub',                'GitHub',           'url',         '🐙',  '[]', 'column', 'github',       80,  true,  true,  false),
  ('company', 'idiomas',              'Idiomas',               'Languages',        'multi_select','🌍',  '[]', 'data',   null,           90,  false, true,  false),
  ('company', 'ingresos_anuales',     'Ingresos anuales',      'Annual revenue',   'number',      '💰',  '[]', 'data',   null,          100,  false, true,  false),
  ('company', 'instagram',            'Instagram',             'Instagram',        'url',         '📸',  '[]', 'data',   null,          110,  false, true,  false),
  ('company', 'intereses',            'Intereses',             'Interests',        'multi_select','💡',  '[]', 'data',   null,          120,  false, true,  false),
  ('company', 'linkedin',             'LinkedIn',              'LinkedIn',         'url',         '🔗',  '[]', 'column', 'linkedin',     130,  true,  true,  false),
  ('company', 'logotipo',             'Logotipo',              'Logo',             'image',       '🖼️',  '[]', 'column', 'logo_url',     140,  true,  true,  false),
  ('company', 'nit',                  'NIT',                   'Tax ID',           'text',        '🪪',  '[]', 'column', 'nit',          150,  true,  true,  false),
  ('company', 'nombre',               'Nombre',                'Name',             'text',        '🏢',  '[]', 'column', 'name',         160,  true,  true,  false),
  ('company', 'notas',                'Notas',                 'Notes',            'textarea',    '📝',  '[]', 'column', 'notes',        170,  true,  true,  false),
  ('company', 'rango_empleados',      'Rango de empleados',    'Employee range',   'select',      '👥',  '["1-10","11-50","51-200","201-500","501-1000","1000+"]', 'column', 'employee_range', 180, true, true, false),
  ('company', 'slogan',               'Slogan',                'Slogan',           'text',        '✨',  '[]', 'data',   null,          190,  false, true,  false),
  ('company', 'tags',                 'Tags',                  'Tags',             'tags',        '🏷️',  '[]', 'column', 'tags',        200,  true,  true,  false),
  ('company', 'telefonos',            'Teléfonos',             'Phone numbers',    'phones',      '📞',  '[]', 'data',   null,          210,  true,  true,  false),
  ('company', 'tiktok',               'TikTok',                'TikTok',           'url',         '🎵',  '[]', 'data',   null,          220,  false, true,  false),
  ('company', 'tipo',                 'Tipo',                  'Type',             'select',      '🗂️',  '["S.A.S.","S.A.","ONG","Startup","Freelance","Otro"]', 'data', null, 230, false, true, false),
  ('company', 'ubicacion',            'Ubicación',             'Location',         'text',        '🌎',  '[]', 'data',   null,          240,  false, true,  false),
  ('company', 'x',                    'X',                     'X',                'url',         '✖️',  '[]', 'column', 'x_handle',     250,  false, true,  false)
on conflict (entity_type, name) do nothing;

-- ===========================================================================
-- Retro-relleno de datos desde columnas existentes hacia `data`
-- ===========================================================================
-- Filtra valores null de un array jsonb (los arrays pueden llevar huecos).
-- Se usa una subconsulta con array_replace: null -> minúsculas 'null' para poder borrarlo.
update crm_contacts set data = data
  || case when coalesce(email, '') <> '' and not (data ? 'correos_electronicos')
       then jsonb_build_object('correos_electronicos', jsonb_build_array(email)) else '{}'::jsonb end
  || case when coalesce(phone, '') <> '' or coalesce(phone2, '') <> ''
       then jsonb_build_object('telefonos', (
         select coalesce(jsonb_agg(e), '[]'::jsonb)
         from jsonb_array_elements(
           jsonb_build_array(
             case when coalesce(phone, '') <> '' then phone end,
             case when coalesce(phone2, '') <> '' then phone2 end
           )
         ) e
         where e <> 'null'::jsonb
       )) else '{}'::jsonb end;

update crm_companies set data = data
  || case when coalesce(domain, '') <> '' and not (data ? 'dominios')
       then jsonb_build_object('dominios', jsonb_build_array(domain)) else '{}'::jsonb end
  || case when coalesce(phone, '') <> ''
       then jsonb_build_object('telefonos', jsonb_build_array(phone)) else '{}'::jsonb end;