-- Elimina por completo Plausible, Hotjar y Seentics del BOS.
-- Sustituidos por GA4 (única fuente de tráfico): se borran sus conectores,
-- sus métricas diarias y su historial de sincronización.

delete from bos_connectors
where source in ('plausible', 'hotjar', 'seentics');

delete from bos_analytics_daily
where source in ('plausible', 'hotjar', 'seentics');

delete from bos_sync_logs
where source in ('plausible', 'hotjar', 'seentics');