-- =============================================
-- Script: 92. FIX validate pianificazione sync trigger
-- Descrizione: Corregge la funzione validate_pianificazione per permettere
--              la transizione Completata → Confermata quando attivata
--              dal trigger di sincronizzazione stato foglio
-- Data: 2025-12-05
-- Versione: 1.0.0
-- =============================================

-- Ricrea funzione validate_pianificazione con logica corretta
CREATE OR REPLACE FUNCTION validate_pianificazione()
RETURNS TRIGGER AS $$
DECLARE
    v_stato_foglio TEXT;
BEGIN
    -- SKIP VALIDAZIONE 1: per update automatici dal trigger di sincronizzazione
    -- Quando il trigger aggiorna le pianificazioni a "Completata" (foglio diventa Completato o successivi)
    IF TG_OP = 'UPDATE'
       AND NEW.stato_pianificazione = 'Completata'
       AND OLD.stato_pianificazione IN ('Pianificata', 'Confermata', 'In Corso') THEN
        RETURN NEW;
    END IF;

    -- SKIP VALIDAZIONE 2: NUOVO - per update automatici dal trigger di sincronizzazione INVERSO
    -- Quando il trigger riporta le pianificazioni a "Confermata" (foglio torna a stati precedenti)
    IF TG_OP = 'UPDATE'
       AND NEW.stato_pianificazione = 'Confermata'
       AND OLD.stato_pianificazione = 'Completata' THEN
        -- Verifica se questo update proviene dal trigger verificando lo stato del foglio
        IF NEW.foglio_assistenza_id IS NOT NULL THEN
            SELECT stato_foglio INTO v_stato_foglio
            FROM public.fogli_assistenza
            WHERE id = NEW.foglio_assistenza_id;

            -- Se il foglio è in uno stato "lavorabile", permetti la transizione Completata → Confermata
            IF v_stato_foglio IN ('Aperto', 'In Lavorazione', 'Attesa Firma') THEN
                RETURN NEW;
            END IF;
        END IF;
    END IF;

    -- VALIDAZIONE STATO FOGLIO: Solo se foglio_assistenza_id è specificato
    IF NEW.foglio_assistenza_id IS NOT NULL THEN
        -- Recupera lo stato corrente del foglio associato
        SELECT stato_foglio INTO v_stato_foglio
        FROM public.fogli_assistenza
        WHERE id = NEW.foglio_assistenza_id;

        -- Verifica che il foglio sia in uno stato pianificabile
        -- (solo per INSERT o UPDATE manuali, non per quelli automatici dal trigger)
        IF v_stato_foglio NOT IN ('Aperto', 'In Lavorazione', 'Attesa Firma') THEN
            RAISE EXCEPTION 'Impossibile modificare la pianificazione: il foglio associato (ID: %) è in stato "%" che non permette modifiche alle pianificazioni. Solo i fogli in stato Aperto, In Lavorazione o Attesa Firma possono avere pianificazioni modificate.',
                NEW.foglio_assistenza_id, v_stato_foglio;
        END IF;
    END IF;

    -- Validazione transizione stati pianificazione
    IF TG_OP = 'UPDATE' AND OLD.stato_pianificazione != NEW.stato_pianificazione THEN
        IF NEW.stato_pianificazione = 'Cancellata' THEN
            NULL; -- Ok da qualsiasi stato

        ELSIF OLD.stato_pianificazione = 'Pianificata' THEN
            IF NEW.stato_pianificazione NOT IN ('Confermata', 'In Corso', 'Cancellata') THEN
                RAISE EXCEPTION 'Transizione di stato pianificazione non valida: da "Pianificata" si può passare solo a "Confermata", "In Corso" o "Cancellata"';
            END IF;

        ELSIF OLD.stato_pianificazione = 'Confermata' THEN
            IF NEW.stato_pianificazione NOT IN ('In Corso', 'Pianificata', 'Cancellata') THEN
                RAISE EXCEPTION 'Transizione di stato pianificazione non valida: da "Confermata" si può passare solo a "In Corso", "Pianificata" o "Cancellata"';
            END IF;

        ELSIF OLD.stato_pianificazione = 'In Corso' THEN
            IF NEW.stato_pianificazione NOT IN ('Completata', 'Confermata', 'Cancellata') THEN
                RAISE EXCEPTION 'Transizione di stato pianificazione non valida: da "In Corso" si può passare solo a "Completata", "Confermata" o "Cancellata"';
            END IF;

        ELSIF OLD.stato_pianificazione = 'Completata' THEN
            -- MODIFICA CRITICA: Ora permette anche Confermata (oltre a In Corso e Cancellata)
            -- per supportare la sincronizzazione inversa dal trigger
            IF NEW.stato_pianificazione NOT IN ('In Corso', 'Confermata', 'Cancellata') THEN
                RAISE EXCEPTION 'Transizione di stato pianificazione non valida: da "Completata" si può passare solo a "In Corso", "Confermata" (per sincronizzazione con foglio) o "Cancellata"';
            END IF;

        ELSIF OLD.stato_pianificazione = 'Cancellata' THEN
            IF NEW.stato_pianificazione != 'Pianificata' THEN
                RAISE EXCEPTION 'Transizione di stato pianificazione non valida: da "Cancellata" si può passare solo a "Pianificata" (riattivazione)';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_pianificazione IS 'Valida la pianificazione prima di INSERT/UPDATE verificando stato foglio (se presente) e transizioni stato. Supporta sincronizzazione bidirezionale con trigger sync_pianificazione_stato_foglio.';

-- Ricrea trigger (per sicurezza, anche se la funzione è già esistente)
DROP TRIGGER IF EXISTS validate_pianificazione_trigger ON public.pianificazioni;
CREATE TRIGGER validate_pianificazione_trigger
    BEFORE INSERT OR UPDATE ON public.pianificazioni
    FOR EACH ROW
    EXECUTE FUNCTION validate_pianificazione();

-- =============================================
-- TEST: Verifica che la correzione funzioni
-- =============================================

DO $$
DECLARE
    v_test_foglio_id UUID;
    v_test_pianificazione_id UUID;
    v_test_numero_foglio TEXT;
    v_stato_pianificazione TEXT;
    v_cliente_id UUID;
    v_commessa_id UUID;
    v_tecnico_id UUID;
BEGIN
    -- Genera numero foglio univoco per test
    v_test_numero_foglio := 'TEST_FIX_' || substring(gen_random_uuid()::text from 1 for 8);

    -- Ottieni dati necessari per test
    SELECT id INTO v_cliente_id FROM public.clienti LIMIT 1;
    SELECT id INTO v_commessa_id FROM public.commesse LIMIT 1;
    SELECT id INTO v_tecnico_id FROM public.tecnici LIMIT 1;

    IF v_cliente_id IS NULL OR v_commessa_id IS NULL OR v_tecnico_id IS NULL THEN
        RAISE NOTICE 'SKIP TEST: Database non ha dati sufficienti (clienti, commesse, tecnici)';
        RETURN;
    END IF;

    RAISE NOTICE '=============================================';
    RAISE NOTICE 'AVVIO TEST CORREZIONE validate_pianificazione';
    RAISE NOTICE '=============================================';

    -- Crea foglio di test con creato_da_user_id da un admin esistente
    INSERT INTO public.fogli_assistenza (
        numero_foglio,
        data_apertura_foglio,
        stato_foglio,
        cliente_id,
        commessa_id,
        creato_da_user_id
    )
    SELECT
        v_test_numero_foglio,
        CURRENT_DATE,
        'Aperto',
        v_cliente_id,
        v_commessa_id,
        (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
    RETURNING id INTO v_test_foglio_id;

    RAISE NOTICE 'Foglio test creato: % (ID: %)', v_test_numero_foglio, v_test_foglio_id;

    -- Crea pianificazione di test
    INSERT INTO public.pianificazioni (
        foglio_assistenza_id,
        data_inizio_pianificata,
        data_fine_pianificata,
        stato_pianificazione,
        tecnici_assegnati
    ) VALUES (
        v_test_foglio_id,
        CURRENT_DATE,
        CURRENT_DATE,
        'Confermata',
        ARRAY[v_tecnico_id]
    )
    RETURNING id INTO v_test_pianificazione_id;

    RAISE NOTICE 'Pianificazione test creata: ID %', v_test_pianificazione_id;

    -- TEST 1: Passa foglio a Completato (deve aggiornare pianificazione a Completata)
    RAISE NOTICE '';
    RAISE NOTICE 'TEST 1: Foglio Aperto → Completato (pianificazione deve diventare Completata)';
    UPDATE public.fogli_assistenza
    SET stato_foglio = 'Completato'
    WHERE id = v_test_foglio_id;

    -- Verifica
    SELECT stato_pianificazione INTO v_stato_pianificazione
    FROM public.pianificazioni
    WHERE id = v_test_pianificazione_id;

    IF v_stato_pianificazione != 'Completata' THEN
        RAISE EXCEPTION 'TEST 1 FALLITO: Pianificazione non aggiornata a Completata (stato attuale: %)', v_stato_pianificazione;
    END IF;
    RAISE NOTICE '✓ TEST 1 PASSATO: Pianificazione aggiornata a Completata';

    -- TEST 2: Riporta foglio a Aperto (deve riportare pianificazione a Confermata)
    RAISE NOTICE '';
    RAISE NOTICE 'TEST 2: Foglio Completato → Aperto (pianificazione deve tornare a Confermata)';
    UPDATE public.fogli_assistenza
    SET stato_foglio = 'Aperto'
    WHERE id = v_test_foglio_id;

    -- Verifica
    SELECT stato_pianificazione INTO v_stato_pianificazione
    FROM public.pianificazioni
    WHERE id = v_test_pianificazione_id;

    IF v_stato_pianificazione != 'Confermata' THEN
        RAISE EXCEPTION 'TEST 2 FALLITO: Pianificazione non riportata a Confermata (stato attuale: %)', v_stato_pianificazione;
    END IF;
    RAISE NOTICE '✓ TEST 2 PASSATO: Pianificazione riportata a Confermata';

    -- TEST 3: Ciclo completo Aperto → Completato → In Lavorazione → Completato
    RAISE NOTICE '';
    RAISE NOTICE 'TEST 3: Ciclo completo multiple transizioni';

    UPDATE public.fogli_assistenza SET stato_foglio = 'Completato' WHERE id = v_test_foglio_id;
    SELECT stato_pianificazione INTO v_stato_pianificazione FROM public.pianificazioni WHERE id = v_test_pianificazione_id;
    IF v_stato_pianificazione != 'Completata' THEN
        RAISE EXCEPTION 'TEST 3.1 FALLITO';
    END IF;
    RAISE NOTICE '  ✓ Aperto → Completato: OK';

    UPDATE public.fogli_assistenza SET stato_foglio = 'In Lavorazione' WHERE id = v_test_foglio_id;
    SELECT stato_pianificazione INTO v_stato_pianificazione FROM public.pianificazioni WHERE id = v_test_pianificazione_id;
    IF v_stato_pianificazione != 'Confermata' THEN
        RAISE EXCEPTION 'TEST 3.2 FALLITO';
    END IF;
    RAISE NOTICE '  ✓ Completato → In Lavorazione: OK';

    UPDATE public.fogli_assistenza SET stato_foglio = 'Completato' WHERE id = v_test_foglio_id;
    SELECT stato_pianificazione INTO v_stato_pianificazione FROM public.pianificazioni WHERE id = v_test_pianificazione_id;
    IF v_stato_pianificazione != 'Completata' THEN
        RAISE EXCEPTION 'TEST 3.3 FALLITO';
    END IF;
    RAISE NOTICE '  ✓ In Lavorazione → Completato: OK';
    RAISE NOTICE '✓ TEST 3 PASSATO: Ciclo completo funziona correttamente';

    -- Cleanup
    DELETE FROM public.pianificazioni WHERE id = v_test_pianificazione_id;
    DELETE FROM public.fogli_assistenza WHERE id = v_test_foglio_id;

    RAISE NOTICE '';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'TUTTI I TEST PASSATI ✓';
    RAISE NOTICE 'Correzione funziona correttamente';
    RAISE NOTICE '=============================================';

EXCEPTION
    WHEN OTHERS THEN
        -- Cleanup in caso di errore
        DELETE FROM public.pianificazioni WHERE id = v_test_pianificazione_id;
        DELETE FROM public.fogli_assistenza WHERE id = v_test_foglio_id;
        RAISE;
END $$;

-- =============================================
-- FINE SCRIPT
-- =============================================
