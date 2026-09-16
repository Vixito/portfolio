-- Fase 2 CRM: visitantes del portfolio + conversión de leads.

create table if not exists portfolio_visitors (
  id         uuid primary key default gen_random_uuid(),
  session_id text not null,
  page       text,
  referrer   text,
  user_agent text,
  ip         text,
  contact_id uuid references crm_contacts (id) on delete set null,
  created_at timestamptz not null default now()
);

-- Red anti-duplicados: una fila por sesión + página (el beacon aplica además
-- una ventana por día en la propia función). Solo expresiones IMMUTABLE.
create unique index if not exists portfolio_visitors_dedup_idx
  on portfolio_visitors (session_id, lower(page)) where page is not null;

create index if not exists portfolio_visitors_contact_idx
  on portfolio_visitors (contact_id);

create index if not exists portfolio_visitors_created_idx
  on portfolio_visitors (created_at);

-- Marca de leads convertidos a contacto (Fase 1 definió crm_contacts.lead_id).
alter table bos_leads add column if not exists converted_at timestamptz;

-- Solo accesible vía edge functions (service role).
alter table portfolio_visitors enable row level security;