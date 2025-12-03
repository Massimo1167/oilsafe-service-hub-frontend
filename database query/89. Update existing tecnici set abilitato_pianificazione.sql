-- FASE 1: Imposta tutti i tecnici esistenti come abilitati alla pianificazione
-- Questo garantisce retrocompatibilità: i tecnici già presenti continuano
-- ad apparire nelle pianificazioni come prima

UPDATE public.tecnici
SET abilitato_pianificazione = true
WHERE abilitato_pianificazione IS NULL;

-- Verifica: conteggio tecnici aggiornati e stato finale
SELECT
    COUNT(*) AS totale_tecnici,
    SUM(CASE WHEN abilitato_pianificazione = true THEN 1 ELSE 0 END) AS abilitati,
    SUM(CASE WHEN abilitato_pianificazione = false THEN 1 ELSE 0 END) AS disabilitati
FROM public.tecnici;
