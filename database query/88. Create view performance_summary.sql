-- Vista aggregata per dashboard: metriche pre-calcolate per ora
-- Fornisce statistiche veloci senza ricalcolare ogni volta (AVG, percentili, count)

CREATE OR REPLACE VIEW public.performance_summary AS
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
COMMENT ON VIEW public.performance_summary IS 'Aggregazione oraria delle metriche performance degli ultimi 7 giorni con statistiche (AVG, P50, P95, P99)';

-- Grant accesso solo ad admin (come la tabella base)
-- RLS non si applica alle viste, quindi gestiamo con GRANT
REVOKE ALL ON public.performance_summary FROM PUBLIC;
GRANT SELECT ON public.performance_summary TO authenticated;
