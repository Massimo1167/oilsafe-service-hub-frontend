-- =============================================
-- HOTFIX: Recupero Foglio FLE_00000044
-- Descrizione: Bypassare temporaneamente i trigger per riportare
--              il foglio FLE_00000044 da Completato a Aperto
-- Data: 2025-12-05
-- Versione: 1.0.0
-- ATTENZIONE: Questo script disabilita temporaneamente i trigger
--             Eseguire SOLO se necessario per recovery emergenza
-- =============================================

BEGIN;

-- STEP 1: Disabilita trigger di sincronizzazione
-- =============================================
ALTER TABLE public.fogli_assistenza DISABLE TRIGGER sync_pianificazione_on_foglio_update;

-- STEP 2: Disabilita trigger di validazione pianificazioni
-- =============================================
ALTER TABLE public.pianificazioni DISABLE TRIGGER validate_pianificazione_trigger;

-- STEP 3: Verifica stato corrente foglio
-- =============================================
DO $$
DECLARE
    v_stato_corrente TEXT;
    v_foglio_id UUID;
BEGIN
    SELECT id, stato_foglio INTO v_foglio_id, v_stato_corrente
    FROM public.fogli_assistenza
    WHERE numero_foglio = 'FLE_00000044';

    IF v_foglio_id IS NULL THEN
        RAISE EXCEPTION 'ERRORE: Foglio FLE_00000044 non trovato nel database';
    END IF;

    RAISE NOTICE 'Foglio trovato - ID: %, Stato corrente: %', v_foglio_id, v_stato_corrente;
END $$;

-- STEP 4: Aggiorna manualmente il foglio
-- =============================================
UPDATE public.fogli_assistenza
SET stato_foglio = 'Aperto'
WHERE numero_foglio = 'FLE_00000044';

-- STEP 5: Aggiorna manualmente le pianificazioni associate (se presenti)
-- =============================================
UPDATE public.pianificazioni
SET stato_pianificazione = 'Confermata'
WHERE foglio_assistenza_id = (
    SELECT id FROM public.fogli_assistenza WHERE numero_foglio = 'FLE_00000044'
)
AND stato_pianificazione = 'Completata';

-- STEP 6: Conta pianificazioni aggiornate
-- =============================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM public.pianificazioni
    WHERE foglio_assistenza_id = (
        SELECT id FROM public.fogli_assistenza WHERE numero_foglio = 'FLE_00000044'
    )
    AND stato_pianificazione = 'Confermata';

    RAISE NOTICE 'Pianificazioni aggiornate a "Confermata": %', v_count;
END $$;

-- STEP 7: Riabilita trigger di sincronizzazione
-- =============================================
ALTER TABLE public.fogli_assistenza ENABLE TRIGGER sync_pianificazione_on_foglio_update;

-- STEP 8: Riabilita trigger di validazione pianificazioni
-- =============================================
ALTER TABLE public.pianificazioni ENABLE TRIGGER validate_pianificazione_trigger;

-- STEP 9: Verifica risultato finale
-- =============================================
SELECT
    numero_foglio,
    stato_foglio,
    creato_da_user_id
FROM public.fogli_assistenza
WHERE numero_foglio = 'FLE_00000044';

SELECT
    p.id,
    fa.numero_foglio,
    p.stato_pianificazione,
    p.data_inizio_pianificata,
    p.data_fine_pianificata
FROM public.pianificazioni p
LEFT JOIN public.fogli_assistenza fa ON p.foglio_assistenza_id = fa.id
WHERE fa.numero_foglio = 'FLE_00000044';

COMMIT;

-- Messaggio finale
DO $$
BEGIN
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'HOTFIX COMPLETATO CON SUCCESSO';
    RAISE NOTICE 'Foglio FLE_00000044 riportato a stato "Aperto"';
    RAISE NOTICE 'Verificare i risultati nelle tabelle sopra';
    RAISE NOTICE '=============================================';
END $$;

-- =============================================
-- FINE HOTFIX
-- =============================================
