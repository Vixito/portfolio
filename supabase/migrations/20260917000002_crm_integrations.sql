-- Integraciones del CRM (p. ej. Google People API).
-- Los tokens se guardan aquí y SOLO son accesibles por el service role
-- (las edge functions). RLS habilitado sin policies: ningún cliente anon
-- ni usuario autenticado puede leerlos.

create table if not exists public.crm_integrations (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  account_email text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'disconnected',
  last_sync_at timestamptz,
  last_sync_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_integrations_provider_key'
  ) then
    alter table public.crm_integrations
      add constraint crm_integrations_provider_key unique (provider);
  end if;
end $$;

create index if not exists crm_integrations_provider_idx
  on public.crm_integrations (provider);

alter table public.crm_integrations enable row level security;

-- Deduplicación de contactos importados/sincronizados.
create index if not exists crm_contacts_email_lower_idx
  on public.crm_contacts (lower(email)) where email is not null;

create index if not exists crm_contacts_name_lower_idx
  on public.crm_contacts (lower(first_name), lower(coalesce(last_name, '')));

-- Huella de origen externo para evitar duplicados entre plataformas.
alter table public.crm_contacts
  add column if not exists external_source text;

alter table public.crm_contacts
  add column if not exists external_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'crm_contacts_external_unique'
  ) then
    alter table public.crm_contacts
      add constraint crm_contacts_external_unique
      unique (external_source, external_id);
  end if;
end $$;
