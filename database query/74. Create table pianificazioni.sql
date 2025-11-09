-- =============================================
-- Script: 74. Create table pianificazioni
-- Descrizione: Crea la tabella per la pianificazione degli interventi futuri
-- Data: 2025-01-07
-- Versione: 1.0.0
-- =============================================

-- Creazione tabella pianificazioni
CREATE TABLE IF NOT EXISTS public.pianificazioni (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Relazione con foglio di assistenza (OBBLIGATORIA)
    foglio_assistenza_id UUID NOT NULL REFERENCES public.fogli_assistenza(id) ON DELETE CASCADE,

    -- Date e orari pianificati
    data_inizio_pianificata DATE NOT NULL,
    ora_inizio_pianificata TIME,
    data_fine_pianificata DATE NOT NULL,
    ora_fine_pianificata TIME,
    tutto_il_giorno BOOLEAN NOT NULL DEFAULT false,

    -- Opzioni gestione giorni
    salta_sabato BOOLEAN NOT NULL DEFAULT false,
    salta_domenica BOOLEAN NOT NULL DEFAULT false,
    salta_festivi BOOLEAN NOT NULL DEFAULT false,

    -- Assegnazione risorse
    tecnici_assegnati UUID[] DEFAULT '{}',  -- Array di IDs tecnici
    mezzo_principale_id UUID REFERENCES public.mezzi_trasporto(id) ON DELETE SET NULL,
    mezzi_secondari_ids UUID[] DEFAULT '{}',  -- Array di IDs mezzi secondari

    -- Stato pianificazione
    stato_pianificazione TEXT NOT NULL DEFAULT 'Pianificata',
    -- Valori possibili: 'Pianificata', 'Confermata', 'In Corso', 'Completata', 'Cancellata'

    -- Tracking modifiche
    creato_da_user_id UUID REFERENCES auth.users(id),
    modificato_da_user_id UUID REFERENCES auth.users(id),

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDICI per performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_pianificazioni_foglio
    ON public.pianificazioni(foglio_assistenza_id);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_data_inizio
    ON public.pianificazioni(data_inizio_pianificata);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_data_fine
    ON public.pianificazioni(data_fine_pianificata);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_stato
    ON public.pianificazioni(stato_pianificazione);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_mezzo_principale
    ON public.pianificazioni(mezzo_principale_id);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_creato_da
    ON public.pianificazioni(creato_da_user_id);

-- GIN index per ricerca efficiente in array
CREATE INDEX IF NOT EXISTS idx_pianificazioni_tecnici
    ON public.pianificazioni USING GIN(tecnici_assegnati);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_mezzi_secondari
    ON public.pianificazioni USING GIN(mezzi_secondari_ids);

-- =============================================
-- CONSTRAINTS e VALIDAZIONI
-- =============================================

-- Constraint: data fine >= data inizio
ALTER TABLE public.pianificazioni
    ADD CONSTRAINT pianificazioni_date_valide
    CHECK (data_fine_pianificata >= data_inizio_pianificata);

-- Constraint: se specificati orari, devono essere coerenti
ALTER TABLE public.pianificazioni
    ADD CONSTRAINT pianificazioni_orari_validi
    CHECK (
        -- Se è "tutto il giorno", non devono esserci orari
        (tutto_il_giorno = true AND ora_inizio_pianificata IS NULL AND ora_fine_pianificata IS NULL) OR
        -- Se non è "tutto il giorno", possono esserci o non esserci orari
        (tutto_il_giorno = false AND (
            -- Caso 1: nessun orario specificato (eventi senza ora specifica)
            (ora_inizio_pianificata IS NULL AND ora_fine_pianificata IS NULL) OR
            -- Caso 2: entrambi gli orari specificati
            (ora_inizio_pianificata IS NOT NULL AND ora_fine_pianificata IS NOT NULL AND (
                -- Se stesso giorno, ora fine > ora inizio
                (data_inizio_pianificata = data_fine_pianificata AND ora_fine_pianificata > ora_inizio_pianificata) OR
                -- Se giorni diversi, gli orari possono essere qualsiasi
                (data_inizio_pianificata < data_fine_pianificata)
            ))
        ))
    );

-- Constraint: stato deve essere uno dei valori ammessi
ALTER TABLE public.pianificazioni
    ADD CONSTRAINT pianificazioni_stato_valido
    CHECK (stato_pianificazione IN ('Pianificata', 'Confermata', 'In Corso', 'Completata', 'Cancellata'));

-- Constraint: almeno un tecnico assegnato (array non vuoto)
ALTER TABLE public.pianificazioni
    ADD CONSTRAINT pianificazioni_almeno_un_tecnico
    CHECK (array_length(tecnici_assegnati, 1) > 0);

-- =============================================
-- COMMENTI sulla tabella
-- =============================================

COMMENT ON TABLE public.pianificazioni IS 'Pianificazione interventi futuri per fogli di assistenza';
COMMENT ON COLUMN public.pianificazioni.foglio_assistenza_id IS 'Riferimento al foglio di assistenza da pianificare';
COMMENT ON COLUMN public.pianificazioni.tutto_il_giorno IS 'Se true, l''evento dura tutto il giorno senza orari specifici';
COMMENT ON COLUMN public.pianificazioni.salta_sabato IS 'Se true, il sabato viene escluso dal calcolo dei giorni lavorativi';
COMMENT ON COLUMN public.pianificazioni.salta_domenica IS 'Se true, la domenica viene esclusa dal calcolo dei giorni lavorativi';
COMMENT ON COLUMN public.pianificazioni.salta_festivi IS 'Se true, i festivi vengono esclusi dal calcolo dei giorni lavorativi';
COMMENT ON COLUMN public.pianificazioni.tecnici_assegnati IS 'Array di UUID dei tecnici assegnati alla pianificazione';
COMMENT ON COLUMN public.pianificazioni.mezzo_principale_id IS 'Mezzo di trasporto principale assegnato';
COMMENT ON COLUMN public.pianificazioni.mezzi_secondari_ids IS 'Array di UUID dei mezzi secondari (per interventi con più mezzi)';
COMMENT ON COLUMN public.pianificazioni.stato_pianificazione IS 'Stato: Pianificata, Confermata, In Corso, Completata, Cancellata';

-- =============================================
-- TRIGGER per updated_at e tracking modifiche
-- =============================================

-- Funzione per aggiornare automaticamente updated_at e modificato_da
CREATE OR REPLACE FUNCTION update_pianificazioni_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.modificato_da_user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger per UPDATE
DROP TRIGGER IF EXISTS set_pianificazioni_updated_at ON public.pianificazioni;
CREATE TRIGGER set_pianificazioni_updated_at
    BEFORE UPDATE ON public.pianificazioni
    FOR EACH ROW
    EXECUTE FUNCTION update_pianificazioni_updated_at();

-- Trigger per INSERT (imposta creato_da)
CREATE OR REPLACE FUNCTION set_pianificazioni_creato_da()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.creato_da_user_id IS NULL THEN
        NEW.creato_da_user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_pianificazioni_creato_da_trigger ON public.pianificazioni;
CREATE TRIGGER set_pianificazioni_creato_da_trigger
    BEFORE INSERT ON public.pianificazioni
    FOR EACH ROW
    EXECUTE FUNCTION set_pianificazioni_creato_da();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.pianificazioni ENABLE ROW LEVEL SECURITY;

-- Policy: Admin ha accesso completo
DROP POLICY IF EXISTS "Admin full access on pianificazioni" ON public.pianificazioni;
CREATE POLICY "Admin full access on pianificazioni"
    ON public.pianificazioni
    FOR ALL
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');

-- Policy: Manager ha accesso completo
DROP POLICY IF EXISTS "Manager full access on pianificazioni" ON public.pianificazioni;
CREATE POLICY "Manager full access on pianificazioni"
    ON public.pianificazioni
    FOR ALL
    USING (public.get_my_role() = 'manager')
    WITH CHECK (public.get_my_role() = 'manager');

-- Policy: Head può solo leggere
DROP POLICY IF EXISTS "Head read access on pianificazioni" ON public.pianificazioni;
CREATE POLICY "Head read access on pianificazioni"
    ON public.pianificazioni
    FOR SELECT
    USING (public.get_my_role() = 'head');

-- Policy: User può leggere pianificazioni dei fogli a cui è assegnato o che ha creato
DROP POLICY IF EXISTS "User read assigned pianificazioni" ON public.pianificazioni;
CREATE POLICY "User read assigned pianificazioni"
    ON public.pianificazioni
    FOR SELECT
    USING (
        public.get_my_role() = 'user' AND (
            -- User può vedere pianificazioni di fogli che ha creato o a cui è assegnato
            EXISTS (
                SELECT 1 FROM public.fogli_assistenza fa
                WHERE fa.id = pianificazioni.foglio_assistenza_id
                  AND (fa.creato_da_user_id = auth.uid() OR fa.assegnato_a_user_id = auth.uid())
            ) OR
            -- Oppure se è tra i tecnici assegnati alla pianificazione
            auth.uid() = ANY(
                SELECT t.user_id FROM public.tecnici t
                WHERE t.id = ANY(pianificazioni.tecnici_assegnati)
                  AND t.user_id IS NOT NULL
            )
        )
    );

-- =============================================
-- FUNZIONI HELPER (opzionali)
-- =============================================

-- Funzione per verificare se un tecnico è disponibile in un periodo
CREATE OR REPLACE FUNCTION is_tecnico_disponibile(
    p_tecnico_id UUID,
    p_data_inizio DATE,
    p_data_fine DATE,
    p_ora_inizio TIME DEFAULT NULL,
    p_ora_fine TIME DEFAULT NULL,
    p_exclude_pianificazione_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Conta sovrapposizioni con pianificazioni esistenti (escluse quelle Cancellate)
    SELECT COUNT(*)
    INTO v_count
    FROM public.pianificazioni
    WHERE p_tecnico_id = ANY(tecnici_assegnati)
      AND stato_pianificazione NOT IN ('Cancellata', 'Completata')
      AND (p_exclude_pianificazione_id IS NULL OR id != p_exclude_pianificazione_id)
      AND (
          -- Sovrapposizione date
          (data_inizio_pianificata <= p_data_fine AND data_fine_pianificata >= p_data_inizio)
      );

    RETURN (v_count = 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_tecnico_disponibile IS 'Verifica se un tecnico è disponibile in un periodo specificato';

-- Funzione per verificare se un mezzo è disponibile in un periodo
CREATE OR REPLACE FUNCTION is_mezzo_disponibile(
    p_mezzo_id UUID,
    p_data_inizio DATE,
    p_data_fine DATE,
    p_exclude_pianificazione_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Conta sovrapposizioni con pianificazioni esistenti
    SELECT COUNT(*)
    INTO v_count
    FROM public.pianificazioni
    WHERE (mezzo_principale_id = p_mezzo_id OR p_mezzo_id = ANY(mezzi_secondari_ids))
      AND stato_pianificazione NOT IN ('Cancellata', 'Completata')
      AND (p_exclude_pianificazione_id IS NULL OR id != p_exclude_pianificazione_id)
      AND (data_inizio_pianificata <= p_data_fine AND data_fine_pianificata >= p_data_inizio);

    RETURN (v_count = 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_mezzo_disponibile IS 'Verifica se un mezzo è disponibile in un periodo specificato';

-- =============================================
-- FINE SCRIPT
-- =============================================
