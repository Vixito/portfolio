-- Fase 4 CRM: contratos con link protegido por contraseña y firma de ambas partes.

create table if not exists crm_contracts (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  slug          text not null unique,
  contact_id    uuid references crm_contacts (id) on delete set null,
  company_id    uuid references crm_companies (id) on delete set null,
  currency      text not null default 'EUR',
  value         numeric(14, 2),
  terms         text not null,
  password_hash text not null,
  status        text not null default 'draft', -- draft | sent | signed
  client_name   text,
  client_email  text,
  client_signer_name  text,
  client_signed_at    timestamptz,
  provider_signer_name text,
  provider_signed_at   timestamptz,
  signed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists crm_contracts_contact_idx on crm_contracts (contact_id);
create index if not exists crm_contracts_status_idx on crm_contracts (status);

alter table crm_contracts enable row level security;