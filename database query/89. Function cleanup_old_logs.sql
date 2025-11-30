-- Funzione per cleanup automatico dei log più vecchi di 30 giorni
-- Previene crescita illimitata della tabella performance_logs

CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS TABLE(deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_deleted BIGINT;
BEGIN
  -- Elimina log più vecchi di 30 giorni
  DELETE FROM public.performance_logs
  WHERE created_at < NOW() - INTERVAL '30 days';

  GET DIAGNOSTICS rows_deleted = ROW_COUNT;

  -- Log operazione
  RAISE NOTICE 'Cleanup performance_logs: % righe eliminate', rows_deleted;

  RETURN QUERY SELECT rows_deleted;
END;
$$;

-- Commento funzione
COMMENT ON FUNCTION cleanup_old_performance_logs() IS 'Elimina log performance più vecchi di 30 giorni. Ritorna il numero di righe cancellate.';

-- Grant esecuzione solo ad admin
REVOKE ALL ON FUNCTION cleanup_old_performance_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_old_performance_logs() TO authenticated;

-- OPZIONALE: Scheduled job con pg_cron (richiede piano Supabase Pro)
-- Per abilitare dopo upgrade a Pro, decommentare:
--
-- SELECT cron.schedule(
--   'cleanup-performance-logs',  -- job name
--   '0 2 * * *',                 -- cron: ogni giorno alle 2:00 AM
--   'SELECT cleanup_old_performance_logs()'
-- );
--
-- Per verificare scheduled jobs:
-- SELECT * FROM cron.job;
--
-- Per disabilitare:
-- SELECT cron.unschedule('cleanup-performance-logs');
