-- Contratos: contenido bilingüe + OTP anti-bots + auditoría de accesos.

alter table crm_contracts add column if not exists title_en text;
alter table crm_contracts add column if not exists terms_en text;

alter table crm_email_templates add column if not exists subject_en text;
alter table crm_email_templates add column if not exists body_en text;

-- Códigos OTP de firma (un solo uso, 15 min) + token de firma derivado.
create table if not exists crm_contract_codes (
  id               uuid primary key default gen_random_uuid(),
  contract_id      uuid not null references crm_contracts (id) on delete cascade,
  code_hash        text not null,
  sign_token_hash  text,
  sign_token_expires_at timestamptz,
  expires_at       timestamptz not null,
  attempts         integer not null default 0,
  used_at          timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists crm_contract_codes_contract_idx
  on crm_contract_codes (contract_id);

-- Auditoría de accesos al link público (rate limit + trazabilidad de firmas).
create table if not exists crm_contract_events (
  id         uuid primary key default gen_random_uuid(),
  contract_id uuid references crm_contracts (id) on delete cascade,
  slug       text not null,
  event      text not null,
  ip         text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists crm_contract_events_slug_idx
  on crm_contract_events (slug, created_at);

alter table crm_contract_codes enable row level security;
alter table crm_contract_events enable row level security;