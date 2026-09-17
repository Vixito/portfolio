-- Tipos de contrato + enriquecimiento de leads (geo, UTM, dispositivo).

alter table crm_contracts add column if not exists contract_type text not null default 'servicios';

alter table bos_leads add column if not exists page_url text;
alter table bos_leads add column if not exists referrer_domain text;
alter table bos_leads add column if not exists country text;
alter table bos_leads add column if not exists device text;
alter table bos_leads add column if not exists browser text;
alter table bos_leads add column if not exists os text;
alter table bos_leads add column if not exists utm_source text;
alter table bos_leads add column if not exists utm_medium text;
alter table bos_leads add column if not exists utm_campaign text;