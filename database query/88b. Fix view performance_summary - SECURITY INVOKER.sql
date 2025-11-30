-- FIX per warning Supabase: Security Definer View
-- Questo script corregge la vista performance_summary aggiungendo SECURITY INVOKER
-- per evitare il warning di sicurezza di Supabase
--
-- IMPORTANTE: Eseguire questo script DOPO aver eseguito lo script 88
-- oppure eseguire questo al posto dello script 88 originale
--
-- Data: 30/11/2025
-- Issue: Supabase segnala "View public.performance_summary is defined with the SECURITY DEFINER property"
-- Fix: Aggiunta clausola WITH (security_invoker = true) per usare permessi dell'utente interrogante

-- Drop vista esistente se presente
DROP VIEW IF EXISTS public.performance_summary;

-- Crea vista con SECURITY INVOKER
-- SECURITY INVOKER = la vista usa i permessi dell'utente che la interroga (più sicuro)
-- SECURITY DEFINER = la vista usa i permessi del creatore (default, ma genera warning)
CREATE OR REPLACE VIEW public.performance_summary
WITH (security_invoker = true)
AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  metric_type,
  page_path,
  COUNT(*) as event_count,
  AVG(duration_ms) as avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50_duration_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY duration_ms) as p99_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  MIN(duration_ms) as min_duration_ms,
  COUNT(CASE WHEN vital_rating = 'poor' THEN 1 END) as poor_vitals_count,
  COUNT(CASE WHEN vital_rating = 'needs-improvement' THEN 1 END) as needs_improvement_vitals_count,
  COUNT(CASE WHEN vital_rating = 'good' THEN 1 END) as good_vitals_count,
  COUNT(CASE WHEN metric_type = 'error' THEN 1 END) as error_count
FROM public.performance_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3;

-- Commento vista
COMMENT ON VIEW public.performance_summary IS 'Aggregazione oraria delle metriche performance degli ultimi 7 giorni con statistiche (AVG, P50, P95, P99) - SECURITY INVOKER';

-- Grant accesso
REVOKE ALL ON public.performance_summary FROM PUBLIC;
GRANT SELECT ON public.performance_summary TO authenticated;

-- Query di verifica: controlla che la vista sia stata creata correttamente
SELECT
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE viewname = 'performance_summary';

-- Risultato atteso:
-- schemaname | viewname             | viewowner
-- -----------|----------------------|----------
-- public     | performance_summary  | postgres
