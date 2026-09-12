-- BOS (Business Operating System): dashboard de métricas del Admin Panel.
-- Centraliza ingresos (ya provienen de invoices), analytics externos
-- (Plausible, GSC, Bing Webmasters...) y leads (Tally, Cal.com...) ingeridos
-- por n8n / edge functions.

-- Métricas diarias por fuente (tráfico / SEO / marketing).
CREATE TABLE IF NOT EXISTS bos_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  date date NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, date)
);

CREATE INDEX IF NOT EXISTS idx_bos_analytics_daily_date
  ON bos_analytics_daily (date DESC);

-- Leads capturados (Tally, Cal.com, formularios propios...).
CREATE TABLE IF NOT EXISTS bos_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  name text,
  email text,
  phone text,
  topic text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bos_leads_created_at
  ON bos_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bos_leads_source
  ON bos_leads (source);

-- Configuración de cada conector del BOS (estado, última sincronización).
CREATE TABLE IF NOT EXISTS bos_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text UNIQUE NOT NULL,
  name text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Historial de sincronizaciones por fuente.
CREATE TABLE IF NOT EXISTS bos_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  status text NOT NULL,
  detail text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_bos_sync_logs_source
  ON bos_sync_logs (source, started_at DESC);

-- Conectores por defecto. Cada uno se marca según las credenciales
-- disponibles en los secrets de Supabase.
INSERT INTO bos_connectors (source, name, config, enabled) VALUES
  ('nowpayments',  'NowPayments (Crypto)', '{}', true),
  ('dlocalgo',     'dLocal Go (Tarjeta)', '{}', true),
  ('gumroad',      'Gumroad',             '{}', true),
  ('plausible',    'Plausible.io',        '{}', true),
  ('googlesearchconsole', 'Google Search Console', '{}', true),
  ('bingwebmasters', 'Bing Webmasters',    '{}', true),
  ('hotjar',       'Hotjar',              '{}', true),
  ('tally',        'Tally.so (Leads)',    '{}', true),
  ('calcom',       'Cal.com (Agenda)',    '{}', true),
  ('beehiiv',      'Beehiiv',             '{}', true),
  ('devto',        'Dev.to',              '{}', true),
  ('medium',       'Medium',              '{}', true),
  ('socials',      'Redes Sociales',      '{}', true)
ON CONFLICT (source) DO NOTHING;