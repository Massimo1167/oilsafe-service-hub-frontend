-- =============================================
-- Script: 81. Alter pianificazioni foglio nullable add commessa
-- Descrizione: Modifica tabella pianificazioni per supportare pianificazione diretta per commessa
--              senza richiedere un foglio di assistenza pre-esistente
-- Data: 2025-01-15
-- Versione: 1.0.0
-- =============================================

-- STEP 0: Disabilita temporaneamente i trigger di validazione
-- =============================================

-- Disabilita trigger di validazione (verrà ricreato con nuova logica)
DROP TRIGGER IF EXISTS validate_pianificazione_trigger ON public.pianificazioni;

-- STEP 1: Rimuovi constraints che dipendono da foglio_assistenza_id NOT NULL
-- =============================================

-- Rimuovi constraint almeno_un_tecnico temporaneamente (verrà ricreato)
ALTER TABLE public.pianificazioni
    DROP CONSTRAINT IF EXISTS pianificazioni_almeno_un_tecnico;

-- STEP 2: Aggiungi nuove colonne per riferimenti diretti
-- =============================================

-- Aggiungi commessa_id (riferimento diretto alla commessa)
ALTER TABLE public.pianificazioni
    ADD COLUMN IF NOT EXISTS commessa_id UUID REFERENCES public.commesse(id) ON DELETE CASCADE;

-- Aggiungi cliente_id (riferimento diretto al cliente)
ALTER TABLE public.pianificazioni
    ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clienti(id) ON DELETE CASCADE;

-- STEP 3: Popola i nuovi campi dai fogli esistenti
-- =============================================

-- Popola commessa_id e cliente_id dalle pianificazioni esistenti che hanno foglio
UPDATE public.pianificazioni p
SET
    commessa_id = fa.commessa_id,
    cliente_id = fa.cliente_id
FROM public.fogli_assistenza fa
WHERE p.foglio_assistenza_id = fa.id
  AND p.commessa_id IS NULL;

-- STEP 4: Modifica foglio_assistenza_id da NOT NULL a NULLABLE
-- =============================================

ALTER TABLE public.pianificazioni
    ALTER COLUMN foglio_assistenza_id DROP NOT NULL;

-- STEP 5: Aggiungi nuovi constraints
-- =============================================

-- Constraint: Almeno uno tra foglio o commessa deve essere specificato
ALTER TABLE public.pianificazioni
    ADD CONSTRAINT pianificazioni_foglio_o_commessa
    CHECK (
        foglio_assistenza_id IS NOT NULL OR
        commessa_id IS NOT NULL
    );

-- Constraint: Se specificato foglio, non serve commessa (verrà presa dal foglio)
-- Se NO foglio, DEVE esserci commessa
ALTER TABLE public.pianificazioni
    ADD CONSTRAINT pianificazioni_commessa_obbligatoria_senza_foglio
    CHECK (
        (foglio_assistenza_id IS NOT NULL) OR
        (foglio_assistenza_id IS NULL AND commessa_id IS NOT NULL)
    );

-- Ricrea constraint almeno_un_tecnico
ALTER TABLE public.pianificazioni
    ADD CONSTRAINT pianificazioni_almeno_un_tecnico
    CHECK (array_length(tecnici_assegnati, 1) > 0);

-- STEP 6: Crea indici per le nuove colonne
-- =============================================

CREATE INDEX IF NOT EXISTS idx_pianificazioni_commessa
    ON public.pianificazioni(commessa_id);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_cliente
    ON public.pianificazioni(cliente_id);

-- STEP 7: Aggiungi colonne per ricorrenza (template pianificazioni)
-- =============================================

-- Flag per indicare se è una pianificazione ricorrente
ALTER TABLE public.pianificazioni
    ADD COLUMN IF NOT EXISTS ricorrente BOOLEAN NOT NULL DEFAULT false;

-- Giorni della settimana per ricorrenza (array di integers 0-6, dove 0=Domenica, 1=Lunedì, etc.)
ALTER TABLE public.pianificazioni
    ADD COLUMN IF NOT EXISTS giorni_settimana INTEGER[] DEFAULT '{}';

-- Data fine ricorrenza (opzionale, NULL = infinita)
ALTER TABLE public.pianificazioni
    ADD COLUMN IF NOT EXISTS data_fine_ricorrenza DATE;

-- ID della pianificazione template (per collegare istanze generate)
ALTER TABLE public.pianificazioni
    ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.pianificazioni(id) ON DELETE CASCADE;

-- STEP 8: Indici per ricorrenza
-- =============================================

CREATE INDEX IF NOT EXISTS idx_pianificazioni_ricorrente
    ON public.pianificazioni(ricorrente);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_template
    ON public.pianificazioni(template_id);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_giorni_settimana
    ON public.pianificazioni USING GIN(giorni_settimana);

-- STEP 9: Aggiungi commenti per nuove colonne
-- =============================================

COMMENT ON COLUMN public.pianificazioni.commessa_id IS 'Riferimento diretto alla commessa (obbligatorio se non c''è foglio)';
COMMENT ON COLUMN public.pianificazioni.cliente_id IS 'Riferimento diretto al cliente';
COMMENT ON COLUMN public.pianificazioni.ricorrente IS 'Se true, questa pianificazione si ripete secondo giorni_settimana';
COMMENT ON COLUMN public.pianificazioni.giorni_settimana IS 'Array di giorni settimana per ricorrenza (0=Dom, 1=Lun, ..., 6=Sab)';
COMMENT ON COLUMN public.pianificazioni.data_fine_ricorrenza IS 'Data fine ricorrenza (NULL = infinita)';
COMMENT ON COLUMN public.pianificazioni.template_id IS 'ID della pianificazione template che ha generato questa istanza';

-- STEP 10: Aggiorna RLS policies per supportare pianificazioni senza foglio
-- =============================================

-- Policy: User può leggere pianificazioni dei fogli a cui è assegnato O delle sue commesse/tecnici
DROP POLICY IF EXISTS "User read assigned pianificazioni" ON public.pianificazioni;
CREATE POLICY "User read assigned pianificazioni"
    ON public.pianificazioni
    FOR SELECT
    USING (
        public.get_my_role() = 'user' AND (
            -- Caso 1: Pianificazione con foglio - user può vedere se assegnato al foglio
            (foglio_assistenza_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.fogli_assistenza fa
                WHERE fa.id = pianificazioni.foglio_assistenza_id
                  AND (fa.creato_da_user_id = auth.uid() OR fa.assegnato_a_user_id = auth.uid())
            )) OR
            -- Caso 2: Pianificazione senza foglio - user può vedere se è tra i tecnici assegnati
            auth.uid() = ANY(
                SELECT t.user_id FROM public.tecnici t
                WHERE t.id = ANY(pianificazioni.tecnici_assegnati)
                  AND t.user_id IS NOT NULL
            )
        )
    );

-- STEP 11: Crea funzione helper per ottenere dati completi pianificazione
-- =============================================

-- Funzione per ottenere informazioni complete della pianificazione
-- (gestisce sia il caso con foglio che senza)
CREATE OR REPLACE FUNCTION get_pianificazione_info(p_pianificazione_id UUID)
RETURNS TABLE (
    id UUID,
    foglio_id UUID,
    numero_foglio TEXT,
    commessa_id UUID,
    commessa_codice TEXT,
    cliente_id UUID,
    cliente_nome TEXT,
    data_inizio DATE,
    data_fine DATE,
    stato TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.foglio_assistenza_id AS foglio_id,
        fa.numero_foglio,
        COALESCE(p.commessa_id, fa.commessa_id) AS commessa_id,
        c.codice_commessa,
        COALESCE(p.cliente_id, fa.cliente_id) AS cliente_id,
        cl.ragione_sociale AS cliente_nome,
        p.data_inizio_pianificata AS data_inizio,
        p.data_fine_pianificata AS data_fine,
        p.stato_pianificazione AS stato
    FROM public.pianificazioni p
    LEFT JOIN public.fogli_assistenza fa ON p.foglio_assistenza_id = fa.id
    LEFT JOIN public.commesse c ON COALESCE(p.commessa_id, fa.commessa_id) = c.id
    LEFT JOIN public.clienti cl ON COALESCE(p.cliente_id, fa.cliente_id) = cl.id
    WHERE p.id = p_pianificazione_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_pianificazione_info IS 'Ottiene informazioni complete di una pianificazione, gestendo sia il caso con foglio che senza';

-- STEP 12: Ricrea trigger di validazione con nuova logica
-- =============================================

-- Ricrea funzione validate_pianificazione con supporto per foglio_id NULL
CREATE OR REPLACE FUNCTION validate_pianificazione()
RETURNS TRIGGER AS $$
DECLARE
    v_stato_foglio TEXT;
BEGIN
    -- SKIP VALIDAZIONE per update automatici dal trigger di sincronizzazione
    IF TG_OP = 'UPDATE'
       AND NEW.stato_pianificazione = 'Completata'
       AND OLD.stato_pianificazione IN ('Pianificata', 'Confermata', 'In Corso') THEN
        RETURN NEW;
    END IF;

    -- NUOVA LOGICA: Valida stato foglio SOLO se foglio_assistenza_id è specificato
    IF NEW.foglio_assistenza_id IS NOT NULL THEN
        -- Recupera lo stato corrente del foglio associato
        SELECT stato_foglio INTO v_stato_foglio
        FROM public.fogli_assistenza
        WHERE id = NEW.foglio_assistenza_id;

        -- Verifica che il foglio sia in uno stato pianificabile
        IF v_stato_foglio NOT IN ('Aperto', 'In Lavorazione', 'Attesa Firma') THEN
            RAISE EXCEPTION 'Impossibile pianificare: il foglio % è in stato "%" (solo fogli in stato Aperto, In Lavorazione o Attesa Firma sono pianificabili)',
                NEW.foglio_assistenza_id, v_stato_foglio;
        END IF;
    END IF;

    -- Validazione transizione stati pianificazione (invariata)
    IF TG_OP = 'UPDATE' AND OLD.stato_pianificazione != NEW.stato_pianificazione THEN
        IF NEW.stato_pianificazione = 'Cancellata' THEN
            NULL; -- Ok da qualsiasi stato

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
            IF NEW.stato_pianificazione NOT IN ('In Corso', 'Cancellata') THEN
                RAISE EXCEPTION 'Transizione invalida: da Completata si può passare solo a In Corso o Cancellata';
            END IF;

        ELSIF OLD.stato_pianificazione = 'Cancellata' THEN
            IF NEW.stato_pianificazione != 'Pianificata' THEN
                RAISE EXCEPTION 'Transizione invalida: da Cancellata si può passare solo a Pianificata (riattivazione)';
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_pianificazione IS 'Valida la pianificazione prima di INSERT/UPDATE verificando stato foglio (se presente) e transizioni stato';

-- Ricrea trigger
CREATE TRIGGER validate_pianificazione_trigger
    BEFORE INSERT OR UPDATE ON public.pianificazioni
    FOR EACH ROW
    EXECUTE FUNCTION validate_pianificazione();

-- =============================================
-- FINE SCRIPT
-- =============================================
