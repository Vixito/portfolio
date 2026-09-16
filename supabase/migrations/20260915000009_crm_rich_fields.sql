-- Campos ricos estilo Twenty para personas y organizaciones.

alter table crm_contacts add column if not exists job_title text;
alter table crm_contacts add column if not exists birthdate date;
alter table crm_contacts add column if not exists gender text;
alter table crm_contacts add column if not exists phone2 text;
alter table crm_contacts add column if not exists linkedin text;
alter table crm_contacts add column if not exists github text;
alter table crm_contacts add column if not exists x_handle text;
alter table crm_contacts add column if not exists website text;
alter table crm_contacts add column if not exists address text;
alter table crm_contacts add column if not exists experience_years integer;
alter table crm_contacts add column if not exists owner text;

alter table crm_companies add column if not exists tags text[] not null default '{}';
alter table crm_companies add column if not exists founded_year integer;
alter table crm_companies add column if not exists employee_range text;
alter table crm_companies add column if not exists nit text;
alter table crm_companies add column if not exists address text;
alter table crm_companies add column if not exists phone text;
alter table crm_companies add column if not exists linkedin text;
alter table crm_companies add column if not exists github text;
alter table crm_companies add column if not exists x_handle text;
alter table crm_companies add column if not exists website text;
alter table crm_companies add column if not exists owner text;