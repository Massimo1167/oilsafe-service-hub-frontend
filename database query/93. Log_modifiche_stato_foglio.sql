-- =============================================
-- Script: 93. Log modifiche stato foglio
-- Descrizione: Crea sistema di logging per tracciare tutte le modifiche
--              di stato dei fogli di assistenza con motivo obbligatorio
-- Data: 2025-12-05
-- Versione: 1.0.0
-- =============================================

-- =============================================
-- STEP 1: Crea tabella log modifiche stato
-- =============================================

CREATE TABLE IF NOT EXISTS public.log_modifiche_stato_foglio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foglio_assistenza_id UUID NOT NULL REFERENCES public.fogli_assistenza(id) ON DELETE CASCADE,
    numero_foglio TEXT NOT NULL,
    stato_precedente TEXT NOT NULL,
    stato_nuovo TEXT NOT NULL,
    modificato_da_user_id UUID NOT NULL REFERENCES public.profiles(id),
    motivo_modifica TEXT NOT NULL,
    data_modifica TIMESTAMPTZ NOT NULL DEFAULT now(),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.log_modifiche_stato_foglio IS 'Log di tutte le modifiche di stato dei fogli di assistenza con audit trail completo';
COMMENT ON COLUMN public.log_modifiche_stato_foglio.motivo_modifica IS 'Motivo obbligatorio per tracciabilità e compliance';

-- =============================================
-- STEP 2: Crea indici per performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_log_modifiche_foglio
    ON public.log_modifiche_stato_foglio(foglio_assistenza_id, data_modifica DESC);

CREATE INDEX IF NOT EXISTS idx_log_modifiche_user
    ON public.log_modifiche_stato_foglio(modificato_da_user_id, data_modifica DESC);

CREATE INDEX IF NOT EXISTS idx_log_modifiche_data
    ON public.log_modifiche_stato_foglio(data_modifica DESC);

CREATE INDEX IF NOT EXISTS idx_log_modifiche_stato_nuovo
    ON public.log_modifiche_stato_foglio(stato_nuovo);

-- =============================================
-- STEP 3: Crea funzione trigger per log automatico
-- =============================================

CREATE OR REPLACE FUNCTION log_cambio_stato_foglio()
RETURNS TRIGGER AS $$
DECLARE
    v_motivo TEXT;
    v_is_stato_critico BOOLEAN;
BEGIN
    -- Verifica se lo stato è cambiato
    IF NEW.stato_foglio != OLD.stato_foglio THEN

        -- Determina se è un cambio verso uno stato critico (>= Completato)
        v_is_stato_critico := NEW.stato_foglio IN (
            'Completato',
            'Consuntivato',
            'Inviato',
            'In attesa accettazione',
            'Fatturato',
            'Chiuso'
        );

        -- Ottieni il motivo dal campo nota_stato_foglio
        v_motivo := COALESCE(NULLIF(TRIM(NEW.nota_stato_foglio), ''), 'Motivo non specificato');

        -- Per stati critici, il motivo dovrebbe essere sempre specificato
        IF v_is_stato_critico AND (NEW.nota_stato_foglio IS NULL OR TRIM(NEW.nota_stato_foglio) = '') THEN
            -- Log comunque, ma con avviso
            v_motivo := '[ATTENZIONE: Motivo non specificato per stato critico]';
        END IF;

        -- Inserisci nel log
        -- Usa auth.uid() se disponibile, altrimenti usa il creato_da_user_id del foglio
        INSERT INTO public.log_modifiche_stato_foglio (
            foglio_assistenza_id,
            numero_foglio,
            stato_precedente,
            stato_nuovo,
            modificato_da_user_id,
            motivo_modifica,
            data_modifica
        ) VALUES (
            NEW.id,
            NEW.numero_foglio,
            OLD.stato_foglio,
            NEW.stato_foglio,
            COALESCE(auth.uid(), NEW.creato_da_user_id),
            v_motivo,
            now()
        );

        -- Log notice per stati critici
        IF v_is_stato_critico THEN
            RAISE NOTICE 'LOG STATO CRITICO: Foglio % cambiato da % a % - Motivo: %',
                NEW.numero_foglio, OLD.stato_foglio, NEW.stato_foglio, v_motivo;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_cambio_stato_foglio IS 'Registra automaticamente ogni cambio di stato del foglio nel log con motivo e timestamp';

-- =============================================
-- STEP 4: Crea trigger su fogli_assistenza
-- =============================================

DROP TRIGGER IF EXISTS log_stato_foglio_trigger ON public.fogli_assistenza;
CREATE TRIGGER log_stato_foglio_trigger
    AFTER UPDATE OF stato_foglio ON public.fogli_assistenza
    FOR EACH ROW
    WHEN (OLD.stato_foglio IS DISTINCT FROM NEW.stato_foglio)
    EXECUTE FUNCTION log_cambio_stato_foglio();

-- =============================================
-- STEP 5: RLS Policies per log_modifiche_stato_foglio
-- =============================================

ALTER TABLE public.log_modifiche_stato_foglio ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/Manager possono vedere tutto
DROP POLICY IF EXISTS "Admin Manager read all logs" ON public.log_modifiche_stato_foglio;
CREATE POLICY "Admin Manager read all logs"
    ON public.log_modifiche_stato_foglio
    FOR SELECT
    USING (
        public.get_my_role() IN ('admin', 'manager')
    );

-- Policy: Head può vedere tutto (solo lettura)
DROP POLICY IF EXISTS "Head read all logs" ON public.log_modifiche_stato_foglio;
CREATE POLICY "Head read all logs"
    ON public.log_modifiche_stato_foglio
    FOR SELECT
    USING (
        public.get_my_role() = 'head'
    );

-- Policy: User può vedere log dei propri fogli
DROP POLICY IF EXISTS "User read own logs" ON public.log_modifiche_stato_foglio;
CREATE POLICY "User read own logs"
    ON public.log_modifiche_stato_foglio
    FOR SELECT
    USING (
        public.get_my_role() = 'user' AND (
            -- Log di fogli creati dall'utente
            EXISTS (
                SELECT 1 FROM public.fogli_assistenza fa
                WHERE fa.id = log_modifiche_stato_foglio.foglio_assistenza_id
                  AND fa.creato_da_user_id = auth.uid()
            )
            OR
            -- Log di fogli assegnati all'utente
            EXISTS (
                SELECT 1 FROM public.fogli_assistenza fa
                WHERE fa.id = log_modifiche_stato_foglio.foglio_assistenza_id
                  AND fa.assegnato_a_user_id = auth.uid()
            )
        )
    );

-- =============================================
-- STEP 6: Funzioni utility per query report
-- =============================================

-- Funzione: Ottieni storico completo modifiche stato per un foglio
CREATE OR REPLACE FUNCTION get_storico_stato_foglio(p_foglio_id UUID)
RETURNS TABLE (
    data_modifica TIMESTAMPTZ,
    stato_precedente TEXT,
    stato_nuovo TEXT,
    modificato_da TEXT,
    motivo TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.data_modifica,
        l.stato_precedente,
        l.stato_nuovo,
        COALESCE(p.full_name, au.email::TEXT, 'Utente sconosciuto') AS modificato_da,
        l.motivo_modifica
    FROM public.log_modifiche_stato_foglio l
    LEFT JOIN public.profiles p ON l.modificato_da_user_id = p.id
    LEFT JOIN auth.users au ON p.id = au.id
    WHERE l.foglio_assistenza_id = p_foglio_id
    ORDER BY l.data_modifica DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_storico_stato_foglio IS 'Ottiene storico completo delle modifiche di stato per un foglio specifico';

-- Funzione: Report modifiche stato per periodo
CREATE OR REPLACE FUNCTION report_modifiche_stato(
    p_data_inizio DATE,
    p_data_fine DATE,
    p_stato_nuovo TEXT DEFAULT NULL
)
RETURNS TABLE (
    numero_foglio TEXT,
    data_modifica TIMESTAMPTZ,
    stato_precedente TEXT,
    stato_nuovo TEXT,
    modificato_da TEXT,
    motivo TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.numero_foglio,
        l.data_modifica,
        l.stato_precedente,
        l.stato_nuovo,
        COALESCE(p.full_name, au.email::TEXT, 'Utente sconosciuto') AS modificato_da,
        l.motivo_modifica
    FROM public.log_modifiche_stato_foglio l
    LEFT JOIN public.profiles p ON l.modificato_da_user_id = p.id
    LEFT JOIN auth.users au ON p.id = au.id
    WHERE l.data_modifica::DATE BETWEEN p_data_inizio AND p_data_fine
      AND (p_stato_nuovo IS NULL OR l.stato_nuovo = p_stato_nuovo)
    ORDER BY l.data_modifica DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION report_modifiche_stato IS 'Report delle modifiche di stato per un periodo specificato, opzionalmente filtrato per stato';

-- =============================================
-- STEP 7: Query di esempio per analisi
-- =============================================

-- Query 1: Conta modifiche di stato per utente (ultimi 30 giorni)
-- SELECT
--     p.full_name,
--     au.email,
--     COUNT(*) as num_modifiche,
--     COUNT(DISTINCT l.foglio_assistenza_id) as num_fogli_unici
-- FROM public.log_modifiche_stato_foglio l
-- JOIN public.profiles p ON l.modificato_da_user_id = p.id
-- LEFT JOIN auth.users au ON p.id = au.id
-- WHERE l.data_modifica > now() - interval '30 days'
-- GROUP BY p.id, p.full_name, au.email
-- ORDER BY num_modifiche DESC;

-- Query 2: Fogli che sono tornati indietro da stati avanzati
-- SELECT
--     l.numero_foglio,
--     l.data_modifica,
--     l.stato_precedente,
--     l.stato_nuovo,
--     l.motivo_modifica,
--     COALESCE(p.full_name, au.email) as modificato_da
-- FROM public.log_modifiche_stato_foglio l
-- JOIN public.profiles p ON l.modificato_da_user_id = p.id
-- LEFT JOIN auth.users au ON p.id = au.id
-- WHERE l.stato_precedente IN ('Completato', 'Consuntivato', 'Inviato', 'Fatturato')
--   AND l.stato_nuovo IN ('Aperto', 'In Lavorazione', 'Attesa Firma')
-- ORDER BY l.data_modifica DESC;

-- Query 3: Tempo medio per completare un foglio (da Aperto a Completato)
-- SELECT
--     AVG(EXTRACT(EPOCH FROM (completato.data_modifica - aperto.created_at)) / 86400) as giorni_medi
-- FROM public.fogli_assistenza fa
-- JOIN public.log_modifiche_stato_foglio completato
--     ON fa.id = completato.foglio_assistenza_id
--     AND completato.stato_nuovo = 'Completato'
-- WHERE fa.created_at > now() - interval '90 days';

-- =============================================
-- STEP 8: TEST del sistema di logging
-- =============================================

DO $$
DECLARE
    v_test_foglio_id UUID;
    v_test_numero_foglio TEXT;
    v_log_count INTEGER;
    v_cliente_id UUID;
    v_commessa_id UUID;
BEGIN
    -- Genera numero foglio univoco per test
    v_test_numero_foglio := 'TEST_LOG_' || substring(gen_random_uuid()::text from 1 for 8);

    -- Ottieni dati necessari
    SELECT id INTO v_cliente_id FROM public.clienti LIMIT 1;
    SELECT id INTO v_commessa_id FROM public.commesse LIMIT 1;

    IF v_cliente_id IS NULL OR v_commessa_id IS NULL THEN
        RAISE NOTICE 'SKIP TEST: Database non ha dati sufficienti';
        RETURN;
    END IF;

    RAISE NOTICE '=============================================';
    RAISE NOTICE 'AVVIO TEST SISTEMA LOG MODIFICHE STATO';
    RAISE NOTICE '=============================================';

    -- Crea foglio test con creato_da_user_id da un admin esistente
    INSERT INTO public.fogli_assistenza (
        numero_foglio,
        data_apertura_foglio,
        stato_foglio,
        cliente_id,
        commessa_id,
        nota_stato_foglio,
        creato_da_user_id
    )
    SELECT
        v_test_numero_foglio,
        CURRENT_DATE,
        'Aperto',
        v_cliente_id,
        v_commessa_id,
        'Foglio test per verifica logging',
        (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
    RETURNING id INTO v_test_foglio_id;

    RAISE NOTICE 'Foglio test creato: %', v_test_numero_foglio;

    -- TEST 1: Cambio stato Aperto → In Lavorazione
    UPDATE public.fogli_assistenza
    SET
        stato_foglio = 'In Lavorazione',
        nota_stato_foglio = 'Test cambio a In Lavorazione'
    WHERE id = v_test_foglio_id;

    -- TEST 2: Cambio stato In Lavorazione → Completato
    UPDATE public.fogli_assistenza
    SET
        stato_foglio = 'Completato',
        nota_stato_foglio = 'Test cambio a Completato'
    WHERE id = v_test_foglio_id;

    -- TEST 3: Cambio stato Completato → Consuntivato
    UPDATE public.fogli_assistenza
    SET
        stato_foglio = 'Consuntivato',
        nota_stato_foglio = 'Test cambio a Consuntivato'
    WHERE id = v_test_foglio_id;

    -- Verifica: Conta record nel log
    SELECT COUNT(*) INTO v_log_count
    FROM public.log_modifiche_stato_foglio
    WHERE foglio_assistenza_id = v_test_foglio_id;

    IF v_log_count != 3 THEN
        RAISE EXCEPTION 'TEST FALLITO: Attesi 3 log, trovati %', v_log_count;
    END IF;

    RAISE NOTICE '✓ TEST PASSATO: % record di log creati correttamente', v_log_count;

    -- Test funzione get_storico_stato_foglio
    RAISE NOTICE '';
    RAISE NOTICE 'Test funzione get_storico_stato_foglio():';
    IF EXISTS (SELECT 1 FROM get_storico_stato_foglio(v_test_foglio_id)) THEN
        RAISE NOTICE '✓ Funzione get_storico_stato_foglio funziona correttamente';
    ELSE
        RAISE EXCEPTION 'TEST FALLITO: Funzione get_storico_stato_foglio non restituisce risultati';
    END IF;

    -- Cleanup
    DELETE FROM public.log_modifiche_stato_foglio WHERE foglio_assistenza_id = v_test_foglio_id;
    DELETE FROM public.fogli_assistenza WHERE id = v_test_foglio_id;

    RAISE NOTICE '';
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'TUTTI I TEST PASSATI ✓';
    RAISE NOTICE 'Sistema di logging funziona correttamente';
    RAISE NOTICE '=============================================';

EXCEPTION
    WHEN OTHERS THEN
        -- Cleanup in caso di errore
        DELETE FROM public.log_modifiche_stato_foglio WHERE foglio_assistenza_id = v_test_foglio_id;
        DELETE FROM public.fogli_assistenza WHERE id = v_test_foglio_id;
        RAISE;
END $$;

-- =============================================
-- FINE SCRIPT
-- =============================================
