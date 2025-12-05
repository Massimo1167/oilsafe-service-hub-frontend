-- =============================================
-- Script: 94-96 COMPLETO - Permessi admin senior e controllo rollback
-- Descrizione: Script unificato che include:
--              - Script 94: Struttura permessi admin senior
--              - Script 95: Fix set_special_permission con NULL auth
--              - Script 96: Controllo rollback da Completato
-- Data: 2025-12-05
-- Versione: 1.0.0 COMPLETO
-- =============================================

-- =============================================
-- PARTE 1: STRUTTURA BASE (da Script 94)
-- =============================================

-- STEP 1: Aggiungi campo permessi_speciali a profiles
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS permessi_speciali JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.profiles.permessi_speciali IS 'Permessi speciali granulari per operazioni critiche (force_stato_rollback, etc.)';

CREATE INDEX IF NOT EXISTS idx_profiles_permessi_speciali
    ON public.profiles USING GIN(permessi_speciali);

-- STEP 2: Crea tabella log operazioni critiche
CREATE TABLE IF NOT EXISTS public.log_operazioni_critiche (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_operazione TEXT NOT NULL,
    foglio_assistenza_id UUID REFERENCES public.fogli_assistenza(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    dettagli TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.log_operazioni_critiche IS 'Log di tutte le operazioni critiche eseguite da admin senior';
COMMENT ON COLUMN public.log_operazioni_critiche.tipo_operazione IS 'Tipo operazione: FORCE_ROLLBACK_STATO, MODIFICA_PERMESSO_SPECIALE, etc.';

CREATE INDEX IF NOT EXISTS idx_log_operazioni_tipo
    ON public.log_operazioni_critiche(tipo_operazione, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_log_operazioni_user
    ON public.log_operazioni_critiche(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_log_operazioni_foglio
    ON public.log_operazioni_critiche(foglio_assistenza_id, created_at DESC);

-- =============================================
-- PARTE 2: FUNZIONI (con FIX da Script 95)
-- =============================================

-- Funzione: Verifica permesso speciale
CREATE OR REPLACE FUNCTION has_special_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_has_permission BOOLEAN;
BEGIN
    -- Verifica se l'utente ha il permesso speciale
    SELECT COALESCE((permessi_speciali->>permission_name)::boolean, false)
    INTO v_has_permission
    FROM public.profiles
    WHERE id = auth.uid();

    RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION has_special_permission IS 'Verifica se l''utente corrente ha uno specifico permesso speciale';

-- Funzione: Imposta permesso speciale (VERSIONE CORRETTA da Script 95)
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

    RAISE NOTICE 'Permesso % per utente % impostato a %', p_permission_name, p_user_id, p_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION set_special_permission IS 'Imposta o rimuove un permesso speciale per un utente (solo admin). Gestisce correttamente esecuzioni da SQL Editor.';

-- =============================================
-- PARTE 3: TRIGGER ROLLBACK (VERSIONE COMPLETA da Script 96)
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
                COALESCE(auth.uid(), NEW.creato_da_user_id),
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
-- PARTE 4: RLS POLICIES
-- =============================================

ALTER TABLE public.log_operazioni_critiche ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read all critical operations" ON public.log_operazioni_critiche;
CREATE POLICY "Admin read all critical operations"
    ON public.log_operazioni_critiche
    FOR SELECT
    USING (
        public.get_my_role() = 'admin'
    );

-- =============================================
-- PARTE 5: FUNZIONI UTILITY
-- =============================================

-- Funzione: Ottieni lista utenti con permessi speciali
CREATE OR REPLACE FUNCTION get_users_with_special_permissions()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    force_stato_rollback BOOLEAN,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        au.email::TEXT,
        p.full_name,
        p.role,
        COALESCE((p.permessi_speciali->>'force_stato_rollback')::boolean, false),
        au.created_at
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    WHERE p.permessi_speciali IS NOT NULL
      AND p.permessi_speciali != '{}'::jsonb
    ORDER BY au.email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_users_with_special_permissions IS 'Ottiene lista utenti che hanno almeno un permesso speciale attivo';

-- Funzione: Report utilizzo permessi speciali
CREATE OR REPLACE FUNCTION report_utilizzo_permessi_speciali(
    p_data_inizio DATE DEFAULT CURRENT_DATE - 30,
    p_data_fine DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    data_operazione TIMESTAMPTZ,
    tipo_operazione TEXT,
    user_email TEXT,
    user_full_name TEXT,
    dettagli TEXT,
    success BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.created_at,
        l.tipo_operazione,
        au.email::TEXT,
        p.full_name,
        l.dettagli,
        l.success
    FROM public.log_operazioni_critiche l
    JOIN public.profiles p ON l.user_id = p.id
    LEFT JOIN auth.users au ON p.id = au.id
    WHERE l.created_at::DATE BETWEEN p_data_inizio AND p_data_fine
      AND l.tipo_operazione IN ('FORCE_ROLLBACK_STATO', 'MODIFICA_PERMESSO_SPECIALE')
    ORDER BY l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION report_utilizzo_permessi_speciali IS 'Report utilizzo permessi speciali per periodo specificato';

-- =============================================
-- TEST FINALI
-- =============================================

DO $$
BEGIN
    RAISE NOTICE '=============================================';
    RAISE NOTICE 'INSTALLAZIONE COMPLETATA';
    RAISE NOTICE '=============================================';
    RAISE NOTICE '';
    RAISE NOTICE '✓ Colonna permessi_speciali aggiunta a profiles';
    RAISE NOTICE '✓ Tabella log_operazioni_critiche creata';
    RAISE NOTICE '✓ Funzioni has_special_permission e set_special_permission create';
    RAISE NOTICE '✓ Trigger sync_pianificazione_stato_foglio aggiornato';
    RAISE NOTICE '✓ RLS policies configurate';
    RAISE NOTICE '✓ Funzioni utility create';
    RAISE NOTICE '';
    RAISE NOTICE 'PROSSIMI PASSI:';
    RAISE NOTICE '1. Assegna permesso a un admin:';
    RAISE NOTICE '   SELECT set_special_permission(<user_id>, ''force_stato_rollback'', true);';
    RAISE NOTICE '';
    RAISE NOTICE '2. Verifica utenti con permessi:';
    RAISE NOTICE '   SELECT * FROM get_users_with_special_permissions();';
    RAISE NOTICE '';
    RAISE NOTICE '3. Test rollback da frontend';
    RAISE NOTICE '=============================================';
END $$;

-- =============================================
-- FINE SCRIPT COMPLETO
-- =============================================
