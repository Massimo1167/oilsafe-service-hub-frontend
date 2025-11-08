-- =============================================
-- Script: 75. Create table pianificazioni_mezzi
-- Descrizione: Crea la tabella per la pianificazione separata dei mezzi di trasporto
--              (include assegnazioni per lavori, manutenzione, altro)
-- Data: 2025-01-07
-- Versione: 1.0.0
-- =============================================

-- Creazione tabella pianificazioni_mezzi
CREATE TABLE IF NOT EXISTS public.pianificazioni_mezzi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Mezzo di riferimento (OBBLIGATORIO)
    mezzo_id UUID NOT NULL REFERENCES public.mezzi_trasporto(id) ON DELETE CASCADE,

    -- Date e orari pianificati
    data_inizio DATE NOT NULL,
    ora_inizio TIME,
    data_fine DATE NOT NULL,
    ora_fine TIME,
    tutto_il_giorno BOOLEAN NOT NULL DEFAULT false,

    -- Tipo utilizzo
    tipo_utilizzo TEXT NOT NULL DEFAULT 'Lavoro',
    -- Valori possibili: 'Lavoro', 'Manutenzione', 'Revisione', 'Altro'

    -- Riferimenti opzionali (se l'utilizzo è per un lavoro specifico)
    foglio_assistenza_id UUID REFERENCES public.fogli_assistenza(id) ON DELETE SET NULL,
    pianificazione_id UUID REFERENCES public.pianificazioni(id) ON DELETE SET NULL,
    commessa_id UUID REFERENCES public.commesse(id) ON DELETE SET NULL,

    -- Descrizione libera
    descrizione TEXT,
    note TEXT,

    -- Tracking
    creato_da_user_id UUID REFERENCES auth.users(id),
    modificato_da_user_id UUID REFERENCES auth.users(id),

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- INDICI per performance
-- =============================================

CREATE INDEX IF NOT EXISTS idx_pianificazioni_mezzi_mezzo
    ON public.pianificazioni_mezzi(mezzo_id);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_mezzi_data_inizio
    ON public.pianificazioni_mezzi(data_inizio);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_mezzi_data_fine
    ON public.pianificazioni_mezzi(data_fine);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_mezzi_tipo
    ON public.pianificazioni_mezzi(tipo_utilizzo);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_mezzi_foglio
    ON public.pianificazioni_mezzi(foglio_assistenza_id);

CREATE INDEX IF NOT EXISTS idx_pianificazioni_mezzi_pianificazione
    ON public.pianificazioni_mezzi(pianificazione_id);

-- =============================================
-- CONSTRAINTS e VALIDAZIONI
-- =============================================

-- Constraint: data fine >= data inizio
ALTER TABLE public.pianificazioni_mezzi
    ADD CONSTRAINT pianificazioni_mezzi_date_valide
    CHECK (data_fine >= data_inizio);

-- Constraint: se specificati orari, devono essere coerenti
ALTER TABLE public.pianificazioni_mezzi
    ADD CONSTRAINT pianificazioni_mezzi_orari_validi
    CHECK (
        -- Se è "tutto il giorno", non devono esserci orari
        (tutto_il_giorno = true AND ora_inizio IS NULL AND ora_fine IS NULL) OR
        -- Se non è "tutto il giorno"
        (tutto_il_giorno = false AND (
            -- Caso 1: nessun orario specificato
            (ora_inizio IS NULL AND ora_fine IS NULL) OR
            -- Caso 2: entrambi gli orari specificati
            (ora_inizio IS NOT NULL AND ora_fine IS NOT NULL AND (
                -- Se stesso giorno, ora fine > ora inizio
                (data_inizio = data_fine AND ora_fine > ora_inizio) OR
                -- Se giorni diversi, ok
                (data_inizio < data_fine)
            ))
        ))
    );

-- Constraint: tipo_utilizzo deve essere valido
ALTER TABLE public.pianificazioni_mezzi
    ADD CONSTRAINT pianificazioni_mezzi_tipo_valido
    CHECK (tipo_utilizzo IN ('Lavoro', 'Manutenzione', 'Revisione', 'Altro'));

-- =============================================
-- COMMENTI sulla tabella
-- =============================================

COMMENT ON TABLE public.pianificazioni_mezzi IS 'Pianificazione separata dei mezzi di trasporto (lavoro, manutenzione, altro)';
COMMENT ON COLUMN public.pianificazioni_mezzi.mezzo_id IS 'Mezzo di trasporto pianificato';
COMMENT ON COLUMN public.pianificazioni_mezzi.tipo_utilizzo IS 'Tipo: Lavoro, Manutenzione, Revisione, Altro';
COMMENT ON COLUMN public.pianificazioni_mezzi.foglio_assistenza_id IS 'Riferimento opzionale al foglio (se utilizzo per lavoro)';
COMMENT ON COLUMN public.pianificazioni_mezzi.pianificazione_id IS 'Riferimento opzionale alla pianificazione intervento';
COMMENT ON COLUMN public.pianificazioni_mezzi.descrizione IS 'Descrizione libera dell''utilizzo pianificato';

-- =============================================
-- TRIGGER per updated_at e tracking
-- =============================================

-- Funzione per updated_at
CREATE OR REPLACE FUNCTION update_pianificazioni_mezzi_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.modificato_da_user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_pianificazioni_mezzi_updated_at ON public.pianificazioni_mezzi;
CREATE TRIGGER set_pianificazioni_mezzi_updated_at
    BEFORE UPDATE ON public.pianificazioni_mezzi
    FOR EACH ROW
    EXECUTE FUNCTION update_pianificazioni_mezzi_updated_at();

-- Trigger per INSERT (creato_da)
CREATE OR REPLACE FUNCTION set_pianificazioni_mezzi_creato_da()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.creato_da_user_id IS NULL THEN
        NEW.creato_da_user_id = auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_pianificazioni_mezzi_creato_da_trigger ON public.pianificazioni_mezzi;
CREATE TRIGGER set_pianificazioni_mezzi_creato_da_trigger
    BEFORE INSERT ON public.pianificazioni_mezzi
    FOR EACH ROW
    EXECUTE FUNCTION set_pianificazioni_mezzi_creato_da();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.pianificazioni_mezzi ENABLE ROW LEVEL SECURITY;

-- Policy: Admin ha accesso completo
DROP POLICY IF EXISTS "Admin full access on pianificazioni_mezzi" ON public.pianificazioni_mezzi;
CREATE POLICY "Admin full access on pianificazioni_mezzi"
    ON public.pianificazioni_mezzi
    FOR ALL
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');

-- Policy: Manager ha accesso completo
DROP POLICY IF EXISTS "Manager full access on pianificazioni_mezzi" ON public.pianificazioni_mezzi;
CREATE POLICY "Manager full access on pianificazioni_mezzi"
    ON public.pianificazioni_mezzi
    FOR ALL
    USING (public.get_my_role() = 'manager')
    WITH CHECK (public.get_my_role() = 'manager');

-- Policy: Head può solo leggere
DROP POLICY IF EXISTS "Head read access on pianificazioni_mezzi" ON public.pianificazioni_mezzi;
CREATE POLICY "Head read access on pianificazioni_mezzi"
    ON public.pianificazioni_mezzi
    FOR SELECT
    USING (public.get_my_role() = 'head');

-- Policy: User può leggere pianificazioni mezzi relative ai propri fogli
DROP POLICY IF EXISTS "User read own pianificazioni_mezzi" ON public.pianificazioni_mezzi;
CREATE POLICY "User read own pianificazioni_mezzi"
    ON public.pianificazioni_mezzi
    FOR SELECT
    USING (
        public.get_my_role() = 'user' AND (
            -- Pianificazioni senza foglio (pubbliche)
            foglio_assistenza_id IS NULL OR
            -- Pianificazioni relative a fogli dell'utente
            EXISTS (
                SELECT 1 FROM public.fogli_assistenza fa
                WHERE fa.id = pianificazioni_mezzi.foglio_assistenza_id
                  AND (fa.creato_da_user_id = auth.uid() OR fa.assegnato_a_user_id = auth.uid())
            )
        )
    );

-- =============================================
-- FINE SCRIPT
-- =============================================
