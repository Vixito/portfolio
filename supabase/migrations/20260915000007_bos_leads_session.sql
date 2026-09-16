-- Interesados de /status (form, whatsapp, email) con dedupe por sesión/email.
alter table bos_leads add column if not exists session_id text;
create index if not exists idx_bos_leads_session on bos_leads (session_id);