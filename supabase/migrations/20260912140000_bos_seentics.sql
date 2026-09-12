insert into bos_connectors (source, name, enabled, config)
values
  ('seentics', 'Seentics', true, jsonb_build_object('kind', 'analytics'))
on conflict (source) do update
  set name = excluded.name,
      enabled = excluded.enabled,
      config = excluded.config;

update bos_connectors
set enabled = false
where source = 'plausible';