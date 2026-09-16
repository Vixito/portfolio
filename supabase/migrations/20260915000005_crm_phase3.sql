-- Fase 3 CRM: plantillas de email + log de envíos.

create table if not exists crm_email_templates (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  subject    text not null,
  body       text not null,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists crm_email_log (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid references crm_contacts (id) on delete set null,
  deal_id    uuid references crm_deals (id) on delete set null,
  template_id uuid references crm_email_templates (id) on delete set null,
  from_email text,
  to_email   text not null,
  subject    text,
  body       text,
  placeholders jsonb not null default '{}',
  provider   text not null default 'resend',
  status     text not null default 'pending',
  error      text,
  sent_at    timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists crm_email_log_contact_idx on crm_email_log (contact_id);
create index if not exists crm_email_log_created_idx on crm_email_log (created_at);

-- Solo accesible vía edge functions (service role).
alter table crm_email_templates enable row level security;
alter table crm_email_log enable row level security;