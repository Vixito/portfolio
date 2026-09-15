-- Reincorpora conectores de tecnologías del portfolio cuya conexión
-- se resolverá más adelante (API/webhook/n8n). Se mantienen habilitadas
-- pero sin configuración hasta que se integre el medio de conexión.

insert into bos_connectors (source, name, config, enabled)
values
  ('beehiiv', 'Beehiiv',          '{}', true),
  ('gumroad', 'Gumroad',          '{}', true),
  ('calcom',  'Cal.com (Agenda)', '{}', true)
on conflict (source) do update
  set enabled = true, config = '{}'::jsonb, last_sync_at = null, last_error = null;