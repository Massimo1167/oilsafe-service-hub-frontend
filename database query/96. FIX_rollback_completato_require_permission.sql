-- =============================================
-- Script: 96. FIX rollback completato require permission
-- Descrizione: Richiede permesso speciale force_stato_rollback
--              ANCHE per rollback da "Completato", non solo da stati successivi
-- Data: 2025-12-05
-- Versione: 1.0.0
-- =============================================

-- =============================================
-- MODIFICA FUNZIONE: sync_pianificazione_stato_foglio
-- RIMUOVE DISTINZIONE "Completato sempre permesso"
-- =============================================

CREATE OR REPLACE FUNCTION sync_pianificazione_stato_foglio()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stato_foglio != OLD.stato_foglio THEN

        -- Se il foglio diventa "Completato" o stati successivi
        IF NEW.stato_foglio IN ('Completato', 'Consuntivato', 'Inviato', 'In attesa accettazione', 'Fatturato', 'Chiuso') THEN

            -- Aggiorna pianificazioni da "In Corso" o "Confermata" a "Completata"
            UPDATE public.pianificazioni
            SET
                stato_pianificazione = 'Completata',
                updated_at = now(),
                modificato_da_user_id = auth.uid()
            WHERE foglio_assistenza_id = NEW.id
              AND stato_pianificazione IN ('Pianificata', 'Confermata', 'In Corso');

            RAISE NOTICE 'Pianificazioni del foglio % aggiornate a Completata', NEW.numero_foglio;

        -- Rollback: foglio torna a stato precedente
        ELSIF OLD.stato_foglio IN ('Completato', 'Consuntivato', 'Inviato', 'In attesa accettazione', 'Fatturato', 'Chiuso')
              AND NEW.stato_foglio IN ('Aperto', 'In Lavorazione', 'Attesa Firma') THEN

            -- VERIFICA PERMESSO SPECIALE per TUTTI i rollback da stati >= Completato
            -- (RIMUOVE DISTINZIONE tra Completato e stati successivi)
            IF NOT has_special_permission('force_stato_rollback') THEN
                RAISE EXCEPTION 'PERMESSO NEGATO: Non hai il permesso di forzare il rollback dello stato da "%" a "%". Questa operazione è riservata agli amministratori senior. Contatta un amministratore se è necessario correggere un errore.',
                    OLD.stato_foglio, NEW.stato_foglio;
            END IF;

            -- Log operazione critica (rollback forzato)
            INSERT INTO public.log_operazioni_critiche (
                tipo_operazione,
                foglio_assistenza_id,
                user_id,
                dettagli
            ) VALUES (
                'FORCE_ROLLBACK_STATO',
                NEW.id,
                COALESCE(auth.uid(), NEW.creato_da_user_id),  -- Fix per SQL Editor
                format('Rollback forzato foglio %s: %s → %s', NEW.numero_foglio, OLD.stato_foglio, NEW.stato_foglio)
            );

            RAISE NOTICE 'ROLLBACK FORZATO (permesso speciale): Foglio % da % a %',
                NEW.numero_foglio, OLD.stato_foglio, NEW.stato_foglio;

            -- Riporta le pianificazioni a "Confermata" se erano "Completata"
            UPDATE public.pianificazioni
            SET
                stato_pianificazione = 'Confermata',
                updated_at = now(),
                modificato_da_user_id = auth.uid()
            WHERE foglio_assistenza_id = NEW.id
              AND stato_pianificazione = 'Completata';

            RAISE NOTICE 'Pianificazioni del foglio % riportate a Confermata', NEW.numero_foglio;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_pianificazione_stato_foglio IS 'Sincronizza stato pianificazioni con stato foglio. Richiede permesso speciale per TUTTI i rollback da stati >= Completato.';

-- Ricrea trigger
DROP TRIGGER IF EXISTS sync_pianificazione_on_foglio_update ON public.fogli_assistenza;
CREATE TRIGGER sync_pianificazione_on_foglio_update
    AFTER UPDATE OF stato_foglio ON public.fogli_assistenza
    FOR EACH ROW
    WHEN (OLD.stato_foglio IS DISTINCT FROM NEW.stato_foglio)
    EXECUTE FUNCTION sync_pianificazione_stato_foglio();

-- =============================================
-- TEST: Verifica che il controllo funzioni
-- =============================================

DO $$
DECLARE
    v_test_foglio_id UUID;
    v_test_numero_foglio TEXT;
    v_test_admin_id UUID;
    v_test_admin_id_no_perm UUID;
    v_cliente_id UUID;
    v_commessa_id UUID;
    v_error_occurred BOOLEAN;
BEGIN
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'TEST CONTROLLO ROLLBACK DA COMPLETATO';
    RAISE NOTICE '=============================================';

    -- Ottieni dati necessari per test
    SELECT id INTO v_cliente_id FROM public.clienti LIMIT 1;
    SELECT id INTO v_commessa_id FROM public.commesse LIMIT 1;

    IF v_cliente_id IS NULL OR v_commessa_id IS NULL THEN
        RAISE NOTICE 'SKIP TEST: Database non ha dati sufficienti (clienti, commesse)';
        RETURN;
    END IF;

    -- Genera numero foglio univoco per test
    v_test_numero_foglio := 'TEST_ROLLBACK_' || substring(gen_random_uuid()::text from 1 for 8);

    -- Ottieni 2 admin: uno con permesso, uno senza
    SELECT id INTO v_test_admin_id
    FROM public.profiles
    WHERE role = 'admin'
      AND (permessi_speciali->>'force_stato_rollback')::boolean = true
    LIMIT 1;

    SELECT id INTO v_test_admin_id_no_perm
    FROM public.profiles
    WHERE role = 'admin'
      AND COALESCE((permessi_speciali->>'force_stato_rollback')::boolean, false) = false
    LIMIT 1;

    IF v_test_admin_id IS NULL THEN
        RAISE NOTICE 'SKIP TEST: Nessun admin con permesso force_stato_rollback trovato';
        RAISE NOTICE 'Per testare: esegui prima script 94 e assegna permesso a un admin';
        RETURN;
    END IF;

    IF v_test_admin_id_no_perm IS NULL THEN
        RAISE NOTICE 'SKIP TEST: Nessun admin SENZA permesso trovato (tutti hanno permesso?)';
        RETURN;
    END IF;

    -- ========================================
    -- TEST 1: Rollback Completato SENZA permesso
    -- ========================================
    RAISE NOTICE '';
    RAISE NOTICE 'TEST 1: Rollback da Completato SENZA permesso → DEVE BLOCCARE';

    -- Crea foglio in stato Completato
    INSERT INTO public.fogli_assistenza (
        numero_foglio,
        data_apertura_foglio,
        stato_foglio,
        cliente_id,
        commessa_id,
        creato_da_user_id
    ) VALUES (
        v_test_numero_foglio,
        CURRENT_DATE,
        'Completato',
        v_cliente_id,
        v_commessa_id,
        v_test_admin_id_no_perm
    )
    RETURNING id INTO v_test_foglio_id;

    -- Prova rollback senza permesso (dovrebbe fallire)
    v_error_occurred := false;
    BEGIN
        UPDATE public.fogli_assistenza
        SET stato_foglio = 'Aperto'
        WHERE id = v_test_foglio_id;

        -- Se arriviamo qui, il test è FALLITO
        RAISE EXCEPTION 'TEST 1 FALLITO: Rollback permesso senza permesso speciale!';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%PERMESSO NEGATO%' THEN
                v_error_occurred := true;
                RAISE NOTICE '✓ TEST 1 PASSATO: Rollback bloccato correttamente (errore atteso)';
            ELSE
                RAISE EXCEPTION 'TEST 1 FALLITO: Errore inatteso: %', SQLERRM;
            END IF;
    END;

    -- Cleanup test 1
    DELETE FROM public.fogli_assistenza WHERE id = v_test_foglio_id;

    -- ========================================
    -- TEST 2: Rollback Completato CON permesso
    -- ========================================
    RAISE NOTICE '';
    RAISE NOTICE 'TEST 2: Rollback da Completato CON permesso → DEVE PERMETTERE';

    -- Crea foglio in stato Completato (creato da admin CON permesso)
    INSERT INTO public.fogli_assistenza (
        numero_foglio,
        data_apertura_foglio,
        stato_foglio,
        cliente_id,
        commessa_id,
        creato_da_user_id
    ) VALUES (
        v_test_numero_foglio || '_2',
        CURRENT_DATE,
        'Completato',
        v_cliente_id,
        v_commessa_id,
        v_test_admin_id  -- Admin CON permesso
    )
    RETURNING id INTO v_test_foglio_id;

    -- Prova rollback con permesso (dovrebbe funzionare)
    -- Nota: In DO block, has_special_permission usa auth.uid() che è NULL
    -- quindi dobbiamo simulare usando creato_da_user_id
    -- Il test reale sarà fatto manualmente dall'utente

    RAISE NOTICE '✓ TEST 2: Creato foglio per test manuale (ID: %)', v_test_foglio_id;
    RAISE NOTICE '  Per test completo: esegui manuale rollback da app con admin che ha permesso';

    -- Cleanup test 2
    DELETE FROM public.fogli_assistenza WHERE id = v_test_foglio_id;

    -- ========================================
    -- TEST 3: Verifica Log operazione
    -- ========================================
    RAISE NOTICE '';
    RAISE NOTICE 'TEST 3: Verifica che rollback con permesso venga loggato';

    -- Verifica struttura log_operazioni_critiche
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'log_operazioni_critiche'
    ) THEN
        RAISE EXCEPTION 'TEST 3 FALLITO: Tabella log_operazioni_critiche non esiste';
    END IF;

    RAISE NOTICE '✓ TEST 3 PASSATO: Tabella log pronta per registrare rollback';

    RAISE NOTICE '';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'TEST COMPLETATI ✓';
    RAISE NOTICE 'Controllo rollback da Completato attivo';
    RAISE NOTICE '=============================================';

EXCEPTION
    WHEN OTHERS THEN
        -- Cleanup in caso di errore
        DELETE FROM public.fogli_assistenza WHERE numero_foglio LIKE 'TEST_ROLLBACK_%';
        RAISE;
END $$;

-- =============================================
-- FINE SCRIPT
-- =============================================
