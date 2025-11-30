-- Tabella per il monitoraggio delle performance client-side
-- Traccia: page load, query DB, Web Vitals, errori JS, render React, memoria/CPU

CREATE TABLE IF NOT EXISTS public.performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Contesto sessione
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT, -- Client-generated session ID per correlazione eventi
  user_role TEXT,

  -- Tipo di metrica
  metric_type TEXT NOT NULL, -- 'page_load', 'query', 'navigation', 'error', 'vitals', 'render', 'memory'

  -- Dettagli evento
  page_path TEXT,
  component_name TEXT,
  operation_name TEXT,

  -- Metriche performance
  duration_ms NUMERIC(10,2),
  timestamp_client TIMESTAMPTZ,

  -- Query database (se metric_type = 'query')
  table_name TEXT,
  query_type TEXT, -- 'select', 'insert', 'update', 'delete', 'upsert'
  query_description TEXT,
  row_count INTEGER,

  -- Web Vitals (se metric_type = 'vitals')
  vital_name TEXT, -- 'FCP', 'LCP', 'FID', 'CLS', 'TTFB', 'INP'
  vital_value NUMERIC(10,2),
  vital_rating TEXT, -- 'good', 'needs-improvement', 'poor'

  -- Network (se metric_type = 'page_load')
  network_duration_ms NUMERIC(10,2),
  dom_content_loaded_ms NUMERIC(10,2),
  load_complete_ms NUMERIC(10,2),

  -- Rendering (se metric_type = 'render')
  render_phase TEXT, -- 'mount', 'update', 'nested-update'
  render_count INTEGER,

  -- Errori (se metric_type = 'error')
  error_message TEXT,
  error_stack TEXT,
  error_type TEXT, -- 'javascript', 'network', 'render', 'promise'

  -- Risorse sistema
  memory_used_mb NUMERIC(10,2),
  memory_total_mb NUMERIC(10,2),
  cpu_usage_percent NUMERIC(5,2),

  -- Metadata browser/device
  browser_name TEXT,
  browser_version TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  connection_type TEXT, -- 'slow-2g', '2g', '3g', '4g', 'wifi'
  viewport_width INTEGER,
  viewport_height INTEGER,

  -- Sampling (per ridurre volume dati in produzione)
  is_sampled BOOLEAN DEFAULT TRUE,
  sample_rate NUMERIC(3,2), -- 0.10 = 10%, 1.00 = 100%

  -- Vincolo tipo metrica
  CONSTRAINT check_metric_type CHECK (metric_type IN ('page_load', 'query', 'navigation', 'error', 'vitals', 'render', 'memory'))
);

-- Indexes per ottimizzare query dashboard
CREATE INDEX IF NOT EXISTS idx_perf_logs_created_at ON public.performance_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perf_logs_metric_type ON public.performance_logs(metric_type);
CREATE INDEX IF NOT EXISTS idx_perf_logs_user_id ON public.performance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_perf_logs_page_path ON public.performance_logs(page_path);
CREATE INDEX IF NOT EXISTS idx_perf_logs_table_name ON public.performance_logs(table_name) WHERE table_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_perf_logs_vital_rating ON public.performance_logs(vital_rating) WHERE vital_rating = 'poor';

-- Commento tabella
COMMENT ON TABLE public.performance_logs IS 'Log delle performance client-side: page load, query DB, Web Vitals, errori, render React, memoria';

-- Row Level Security (RLS)
ALTER TABLE public.performance_logs ENABLE ROW LEVEL SECURITY;

-- Policy: tutti gli utenti autenticati possono inserire log
CREATE POLICY "Utenti autenticati possono inserire log performance"
  ON public.performance_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: solo admin possono leggere i log
CREATE POLICY "Solo admin possono leggere log performance"
  ON public.performance_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: nessuno può aggiornare o cancellare (log immutabili)
-- (implicito: no policy = no access)
