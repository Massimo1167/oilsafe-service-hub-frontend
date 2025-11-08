-- =============================================
-- Script: 77. Trigger sync stato foglio pianificazione
-- Descrizione: Sincronizza automaticamente lo stato della pianificazione
--              quando lo stato del foglio di assistenza cambia
-- Data: 2025-01-07
-- Versione: 1.0.0
-- =============================================

-- =============================================
-- FUNZIONE: Sincronizza stato pianificazione con foglio
-- =============================================

CREATE OR REPLACE FUNCTION sync_pianificazione_stato_foglio()
RETURNS TRIGGER AS $$
BEGIN
    -- Quando un foglio passa a "Completato" o stati successivi,
    -- aggiorna tutte le pianificazioni associate

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

        -- Se il foglio torna a stato precedente (es. da Completato a In Lavorazione)
        ELSIF OLD.stato_foglio IN ('Completato', 'Consuntivato', 'Inviato', 'In attesa accettazione', 'Fatturato', 'Chiuso')
              AND NEW.stato_foglio IN ('Aperto', 'In Lavorazione', 'Attesa Firma') THEN

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

COMMENT ON FUNCTION sync_pianificazione_stato_foglio IS 'Sincronizza lo stato delle pianificazioni quando cambia lo stato del foglio associato';

-- =============================================
-- TRIGGER su fogli_assistenza
-- =============================================

DROP TRIGGER IF EXISTS sync_pianificazione_on_foglio_update ON public.fogli_assistenza;
CREATE TRIGGER sync_pianificazione_on_foglio_update
    AFTER UPDATE OF stato_foglio ON public.fogli_assistenza
    FOR EACH ROW
    WHEN (OLD.stato_foglio IS DISTINCT FROM NEW.stato_foglio)
    EXECUTE FUNCTION sync_pianificazione_stato_foglio();

-- =============================================
-- FUNZIONE: Verifica validità pianificazione prima di INSERT/UPDATE
-- =============================================

CREATE OR REPLACE FUNCTION validate_pianificazione()
RETURNS TRIGGER AS $$
DECLARE
    v_stato_foglio TEXT;
BEGIN
    -- Recupera lo stato corrente del foglio associato
    SELECT stato_foglio INTO v_stato_foglio
    FROM public.fogli_assistenza
    WHERE id = NEW.foglio_assistenza_id;

    -- Verifica che il foglio sia in uno stato pianificabile
    IF v_stato_foglio NOT IN ('Aperto', 'In Lavorazione', 'Attesa Firma') THEN
        RAISE EXCEPTION 'Impossibile pianificare: il foglio % è in stato "%" (solo fogli in stato Aperto, In Lavorazione o Attesa Firma sono pianificabili)',
            NEW.foglio_assistenza_id, v_stato_foglio;
    END IF;

    -- Validazione transizione stati pianificazione
    IF TG_OP = 'UPDATE' AND OLD.stato_pianificazione != NEW.stato_pianificazione THEN

        -- Verifica flusso corretto: Pianificata → Confermata → In Corso → Completata
        -- (Cancellata può essere raggiunta da qualsiasi stato)

        IF NEW.stato_pianificazione = 'Cancellata' THEN
            -- Ok, può essere cancellata da qualsiasi stato
            NULL;

        ELSIF OLD.stato_pianificazione = 'Pianificata' THEN
            IF NEW.stato_pianificazione NOT IN ('Confermata', 'In Corso', 'Cancellata') THEN
                RAISE EXCEPTION 'Transizione invalida: da Pianificata si può passare solo a Confermata, In Corso o Cancellata';
            END IF;

        ELSIF OLD.stato_pianificazione = 'Confermata' THEN
            IF NEW.stato_pianificazione NOT IN ('In Corso', 'Pianificata', 'Cancellata') THEN
                RAISE EXCEPTION 'Transizione invalida: da Confermata si può passare solo a In Corso, Pianificata o Cancellata';
            END IF;

        ELSIF OLD.stato_pianificazione = 'In Corso' THEN
            IF NEW.stato_pianificazione NOT IN ('Completata', 'Confermata', 'Cancellata') THEN
                RAISE EXCEPTION 'Transizione invalida: da In Corso si può passare solo a Completata, Confermata o Cancellata';
            END IF;

        ELSIF OLD.stato_pianificazione = 'Completata' THEN
            -- Una volta completata, può tornare solo a In Corso (per correzioni) o essere cancellata
            IF NEW.stato_pianificazione NOT IN ('In Corso', 'Cancellata') THEN
                RAISE EXCEPTION 'Transizione invalida: da Completata si può passare solo a In Corso o Cancellata';
            END IF;

        ELSIF OLD.stato_pianificazione = 'Cancellata' THEN
            -- Una volta cancellata, non può cambiare stato (a meno che non venga riattivata a Pianificata)
            IF NEW.stato_pianificazione != 'Pianificata' THEN
                RAISE EXCEPTION 'Transizione invalida: da Cancellata si può passare solo a Pianificata (riattivazione)';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_pianificazione IS 'Valida la pianificazione prima di INSERT/UPDATE verificando stato foglio e transizioni stato';

-- =============================================
-- TRIGGER su pianificazioni per validazione
-- =============================================

DROP TRIGGER IF EXISTS validate_pianificazione_trigger ON public.pianificazioni;
CREATE TRIGGER validate_pianificazione_trigger
    BEFORE INSERT OR UPDATE ON public.pianificazioni
    FOR EACH ROW
    EXECUTE FUNCTION validate_pianificazione();

-- =============================================
-- FUNZIONE: Impedisce eliminazione foglio con pianificazioni attive
-- =============================================

CREATE OR REPLACE FUNCTION prevent_delete_foglio_with_active_pianificazioni()
RETURNS TRIGGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Conta pianificazioni attive (non Completate o Cancellate) associate al foglio
    SELECT COUNT(*)
    INTO v_count
    FROM public.pianificazioni
    WHERE foglio_assistenza_id = OLD.id
      AND stato_pianificazione NOT IN ('Completata', 'Cancellata');

    IF v_count > 0 THEN
        RAISE EXCEPTION 'Impossibile eliminare il foglio %: esistono % pianificazioni attive. Cancellare prima le pianificazioni o completarle.',
            OLD.numero_foglio, v_count;
    END IF;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION prevent_delete_foglio_with_active_pianificazioni IS 'Impedisce l''eliminazione di un foglio se ha pianificazioni attive';

-- =============================================
-- TRIGGER su fogli_assistenza per impedire eliminazione
-- =============================================

DROP TRIGGER IF EXISTS prevent_delete_foglio_with_pianificazioni ON public.fogli_assistenza;
CREATE TRIGGER prevent_delete_foglio_with_pianificazioni
    BEFORE DELETE ON public.fogli_assistenza
    FOR EACH ROW
    EXECUTE FUNCTION prevent_delete_foglio_with_active_pianificazioni();

-- =============================================
-- FINE SCRIPT
-- =============================================
