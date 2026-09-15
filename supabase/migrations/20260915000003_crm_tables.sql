-- CRM del Business Operating System (Fase 1).
-- Entidades: empresas, contactos, etapas del pipeline, deals y actividades.
-- El acceso operativo se hace via la edge function `crm` (service role),
-- por eso estas tablas tienen RLS habilitada sin policies: solo se acceden
-- desde el servidor con el token de admin verificado.

create table if not exists crm_companies (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  domain     text,
  logo_url   text,
  industry   text,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_contacts (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid references crm_companies (id) on delete set null,
  first_name text not null,
  last_name  text,
  email      text,
  phone      text,
  photo_url  text,
  source     text not null default 'manual',
  lead_id    uuid,
  tags       text[] not null default '{}',
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_contacts_email_idx on crm_contacts (lower(email));
create index if not exists crm_contacts_company_idx on crm_contacts (company_id);

create table if not exists crm_deal_stages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  position   int  not null default 0,
  color      text not null default '#8c52ff',
  created_at timestamptz not null default now()
);

-- Pipeline por defecto de Vixis Studio.
insert into crm_deal_stages (name, position, color)
values
  ('Nuevo',             1, '#94a3b8'),
  ('Contactado',        2, '#2093c4'),
  ('Propuesta enviada', 3, '#8c52ff'),
  ('Negociación',       4, '#f59e0b'),
  ('Cerrado ganado',    5, '#10b981'),
  ('Cerrado perdido',   6, '#ef4444')
on conflict (name) do nothing;

create table if not exists crm_deals (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  contact_id         uuid references crm_contacts (id) on delete set null,
  company_id         uuid references crm_companies (id) on delete set null,
  stage_id           uuid references crm_deal_stages (id) on delete set null,
  value              numeric(14, 2) not null default 0,
  currency           text not null default 'COP',
  probability        int  not null default 10,
  expected_close_date date,
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists crm_deals_stage_idx on crm_deals (stage_id);
create index if not exists crm_deals_contact_idx on crm_deals (contact_id);

create table if not exists crm_activities (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid references crm_contacts (id) on delete cascade,
  deal_id    uuid references crm_deals (id) on delete cascade,
  type       text not null default 'note',
  subject    text not null,
  body       text,
  due_date   date,
  done       boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists crm_activities_contact_idx on crm_activities (contact_id);
create index if not exists crm_activities_deal_idx on crm_activities (deal_id);

-- Acceso restringido: solo via edge functions (service role).
alter table crm_companies  enable row level security;
alter table crm_contacts   enable row level security;
alter table crm_deal_stages enable row level security;
alter table crm_deals      enable row level security;
alter table crm_activities enable row level security;