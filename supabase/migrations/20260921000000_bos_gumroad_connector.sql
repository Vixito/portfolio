-- Gumroad (ventas off-site) como conector real de pagos del BOS.
-- Completa el placeholder reincorporado en 20260915000002 (ahora sí hay
-- integración: gumroad-webhook + gumroad-sync). No toca `enabled`.
insert into bos_connectors (source, name, config, enabled)
values ('gumroad', 'Gumroad (Ventas)', '{"kind": "payments"}', false)
on conflict (source) do update
  set name = excluded.name,
      config = '{"kind": "payments"}'::jsonb;
