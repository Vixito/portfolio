-- Conexiones del BOS: solo tecnologías reales del portfolio.
-- Elimina placeholders sin integración y añade los conectores reales.

-- 1) Placeholders sin ningún uso en el código ni credenciales:
--    Beehiiv, Gumroad, Google Search Console, Bing Webmasters,
--    Cal.com (solo redirección externa) y Redes Sociales.
delete from bos_connectors
where source in ('beehiiv', 'gumroad', 'googlesearchconsole', 'bingwebmasters', 'calcom', 'socials');

-- 2) dLocal (tarjeta para facturas vía PayInvoice) -> pasarela real.
insert into bos_connectors (source, name, config, enabled)
values ('dlocal', 'dLocal (Facturas)', '{"kind": "payments"}', true)
on conflict (source) do update
  set enabled = true, config = '{"kind": "payments"}'::jsonb;

-- 3) Pasarelas y analítica activas.
update bos_connectors
set enabled = true
where source in ('ga4', 'nowpayments', 'dlocalgo');

-- 4) Tally (leads), Dev.to y Medium configurados vía Doppler (prd).
update bos_connectors
set enabled = true, config = '{"kind": "leads", "configured": true}'::jsonb
where source = 'tally';

update bos_connectors
set enabled = true, config = '{"kind": "blog", "configured": true}'::jsonb
where source in ('devto', 'medium');