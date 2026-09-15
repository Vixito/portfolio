-- GA4 (Google Analytics 4) es ahora la única fuente de tráfico del BOS.
-- Plausible, Seentics y Hotjar quedan descartados: se desactivan sus conectores
-- y se eliminan sus métricas diarias para no mezclar definiciones en el dashboard.

insert into bos_connectors (source, name, enabled, config)
values ('ga4', 'Google Analytics 4', true, jsonb_build_object('kind', 'analytics'))
on conflict (source) do update
  set name = excluded.name,
      enabled = true,
      config = excluded.config;

update bos_connectors
set enabled = false
where source in ('plausible', 'seentics', 'hotjar');

delete from bos_analytics_daily
where source in ('plausible', 'seentics', 'hotjar');