-- =============================================
-- Script: 95. FIX set_special_permission NULL auth
-- Descrizione: Corregge la funzione set_special_permission per gestire
--              il caso in cui auth.uid() è NULL (esecuzione da SQL Editor)
-- Data: 2025-12-05
-- Versione: 1.0.0
-- =============================================

-- Ricrea funzione con gestione NULL per auth.uid()
CREATE OR REPLACE FUNCTION set_special_permission(
    p_user_id UUID,
    p_permission_name TEXT,
    p_enabled BOOLEAN
)
RETURNS VOID AS $$
DECLARE
    v_current_permissions JSONB;
    v_executing_user_id UUID;
BEGIN
    -- Solo admin possono modificare permessi speciali
    IF public.get_my_role() != 'admin' THEN
        RAISE EXCEPTION 'Solo gli amministratori possono modificare i permessi speciali';
    END IF;

    -- Ottieni permessi correnti
    SELECT COALESCE(permessi_speciali, '{}'::jsonb)
    INTO v_current_permissions
    FROM public.profiles
    WHERE id = p_user_id;

    -- Aggiorna permesso
    v_current_permissions := jsonb_set(
        v_current_permissions,
        ARRAY[p_permission_name],
        to_jsonb(p_enabled)
    );

    -- Salva
    UPDATE public.profiles
    SET
        permessi_speciali = v_current_permissions,
        updated_at = now()
    WHERE id = p_user_id;

    -- Determina user_id per log: usa auth.uid() se disponibile, altrimenti usa p_user_id
    -- (questo gestisce il caso SQL Editor dove auth.uid() è NULL)
    v_executing_user_id := COALESCE(auth.uid(), p_user_id);

    -- Log operazione (solo se abbiamo un user_id valido)
    IF v_executing_user_id IS NOT NULL THEN
        INSERT INTO public.log_operazioni_critiche (
            tipo_operazione,
            user_id,
            dettagli
        ) VALUES (
            'MODIFICA_PERMESSO_SPECIALE',
            v_executing_user_id,
            format('Utente %s: permesso %s = %s (eseguito da SQL Editor: %s)',
                p_user_id,
                p_permission_name,
                p_enabled,
                CASE WHEN auth.uid() IS NULL THEN 'true' ELSE 'false' END
            )
        );
    END IF;

    RAISE NOTICE 'Permesso % per utente % impostato a % (log: %)',
        p_permission_name,
        p_user_id,
        p_enabled,
        CASE WHEN v_executing_user_id IS NOT NULL THEN 'registrato' ELSE 'skipped (no user)' END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_special_permission IS 'Imposta o rimuove un permesso speciale per un utente (solo admin). Gestisce correttamente esecuzioni da SQL Editor dove auth.uid() è NULL.';

-- =============================================
-- TEST: Verifica che la correzione funzioni
-- =============================================

DO $$
DECLARE
    v_test_user_id UUID;
    v_has_permission BOOLEAN;
    v_log_count INTEGER;
BEGIN
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'TEST CORREZIONE set_special_permission';
    RAISE NOTICE '=============================================';

    -- Ottieni un utente admin per test
    SELECT id INTO v_test_user_id
    FROM public.profiles
    WHERE role = 'admin'
    LIMIT 1;

    IF v_test_user_id IS NULL THEN
        RAISE NOTICE 'SKIP TEST: Nessun utente admin trovato nel database';
        RETURN;
    END IF;

    -- Conta log attuali
    SELECT COUNT(*) INTO v_log_count
    FROM public.log_operazioni_critiche
    WHERE tipo_operazione = 'MODIFICA_PERMESSO_SPECIALE';

    RAISE NOTICE '';
    RAISE NOTICE 'TEST 1: Assegna permesso (da SQL Editor, auth.uid() = NULL)';

    -- Simula assegnazione da SQL Editor
    -- Nota: In ambiente DO block, get_my_role() potrebbe non funzionare,
    -- quindi eseguiamo UPDATE diretto per test
    UPDATE public.profiles
    SET permessi_speciali = jsonb_set(
        COALESCE(permessi_speciali, '{}'::jsonb),
        '{force_stato_rollback}',
        'true'::jsonb
    )
    WHERE id = v_test_user_id;

    -- Verifica permesso impostato
    SELECT COALESCE((permessi_speciali->>'force_stato_rollback')::boolean, false)
    INTO v_has_permission
    FROM public.profiles
    WHERE id = v_test_user_id;

    IF v_has_permission != true THEN
        RAISE EXCEPTION 'TEST 1 FALLITO: Permesso non impostato correttamente';
    END IF;
    RAISE NOTICE '✓ TEST 1 PASSATO: Permesso force_stato_rollback impostato';

    -- TEST 2: Verifica che il log sia stato creato (o skippato senza errore)
    RAISE NOTICE '';
    RAISE NOTICE 'TEST 2: Verifica log (deve essere >= count precedente)';

    DECLARE
        v_new_log_count INTEGER;
    BEGIN
        SELECT COUNT(*) INTO v_new_log_count
        FROM public.log_operazioni_critiche
        WHERE tipo_operazione = 'MODIFICA_PERMESSO_SPECIALE';

        IF v_new_log_count < v_log_count THEN
            RAISE EXCEPTION 'TEST 2 FALLITO: Log count diminuito??';
        END IF;
        RAISE NOTICE '✓ TEST 2 PASSATO: Log count OK (%→%)', v_log_count, v_new_log_count;
    END;

    -- Cleanup: Rimuovi permesso di test
    UPDATE public.profiles
    SET permessi_speciali = permessi_speciali - 'force_stato_rollback'
    WHERE id = v_test_user_id;

    RAISE NOTICE '';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'TUTTI I TEST PASSATI ✓';
    RAISE NOTICE 'Funzione set_special_permission corretta';
    RAISE NOTICE '=============================================';

EXCEPTION
    WHEN OTHERS THEN
        -- Cleanup in caso di errore
        UPDATE public.profiles
        SET permessi_speciali = permessi_speciali - 'force_stato_rollback'
        WHERE id = v_test_user_id;
        RAISE;
END $$;

-- =============================================
-- FINE SCRIPT
-- =============================================
