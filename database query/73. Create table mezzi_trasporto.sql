-- =============================================
-- Script: 73. Create table mezzi_trasporto
-- Descrizione: Crea la tabella per l'anagrafica dei mezzi di trasporto aziendali
-- Data: 2025-01-07
-- Versione: 1.0.0
-- =============================================

-- Creazione tabella mezzi_trasporto
CREATE TABLE IF NOT EXISTS public.mezzi_trasporto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Informazioni identificative (targa UNIQUE e obbligatoria)
    targa TEXT NOT NULL,
    tipo_mezzo TEXT NOT NULL,  -- Es: "Furgone", "Auto", "Camion", "Moto"

    -- Dettagli veicolo (opzionali)
    modello TEXT,              -- Es: "Ducato"
    marca TEXT,                -- Es: "Fiat"
    anno_immatricolazione INTEGER,

    -- Note e stato
    note TEXT,
    attivo BOOLEAN NOT NULL DEFAULT true,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indice univoco su targa (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS mezzi_trasporto_targa_unique
    ON public.mezzi_trasporto (LOWER(targa));

-- Indice per filtri comuni
CREATE INDEX IF NOT EXISTS idx_mezzi_trasporto_attivo
    ON public.mezzi_trasporto(attivo);
CREATE INDEX IF NOT EXISTS idx_mezzi_trasporto_tipo
    ON public.mezzi_trasporto(tipo_mezzo);

-- Commenti sulla tabella
COMMENT ON TABLE public.mezzi_trasporto IS 'Anagrafica mezzi di trasporto aziendali';
COMMENT ON COLUMN public.mezzi_trasporto.targa IS 'Targa del veicolo (univoca, case-insensitive)';
COMMENT ON COLUMN public.mezzi_trasporto.tipo_mezzo IS 'Tipologia veicolo (Furgone, Auto, Camion, Moto, ecc.)';
COMMENT ON COLUMN public.mezzi_trasporto.attivo IS 'Indica se il mezzo è attivo e utilizzabile';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.mezzi_trasporto ENABLE ROW LEVEL SECURITY;

-- Policy: Admin ha accesso completo
DROP POLICY IF EXISTS "Admin full access on mezzi_trasporto" ON public.mezzi_trasporto;
CREATE POLICY "Admin full access on mezzi_trasporto"
    ON public.mezzi_trasporto
    FOR ALL
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');

-- Policy: Manager ha accesso completo (CRUD)
DROP POLICY IF EXISTS "Manager full access on mezzi_trasporto" ON public.mezzi_trasporto;
CREATE POLICY "Manager full access on mezzi_trasporto"
    ON public.mezzi_trasporto
    FOR ALL
    USING (public.get_my_role() = 'manager')
    WITH CHECK (public.get_my_role() = 'manager');

-- Policy: Head e User hanno accesso in sola lettura
DROP POLICY IF EXISTS "Head and User read access on mezzi_trasporto" ON public.mezzi_trasporto;
CREATE POLICY "Head and User read access on mezzi_trasporto"
    ON public.mezzi_trasporto
    FOR SELECT
    USING (public.get_my_role() IN ('head', 'user'));

-- =============================================
-- TRIGGER per updated_at
-- =============================================

-- Funzione per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION update_mezzi_trasporto_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger che chiama la funzione prima di ogni UPDATE
DROP TRIGGER IF EXISTS set_mezzi_trasporto_updated_at ON public.mezzi_trasporto;
CREATE TRIGGER set_mezzi_trasporto_updated_at
    BEFORE UPDATE ON public.mezzi_trasporto
    FOR EACH ROW
    EXECUTE FUNCTION update_mezzi_trasporto_updated_at();

-- =============================================
-- VALIDAZIONI
-- =============================================

-- Constraint: targa non vuota
ALTER TABLE public.mezzi_trasporto
    ADD CONSTRAINT mezzi_trasporto_targa_not_empty
    CHECK (LENGTH(TRIM(targa)) > 0);

-- Constraint: tipo_mezzo non vuoto
ALTER TABLE public.mezzi_trasporto
    ADD CONSTRAINT mezzi_trasporto_tipo_not_empty
    CHECK (LENGTH(TRIM(tipo_mezzo)) > 0);

-- Constraint: anno immatricolazione ragionevole (se specificato)
ALTER TABLE public.mezzi_trasporto
    ADD CONSTRAINT mezzi_trasporto_anno_valido
    CHECK (
        anno_immatricolazione IS NULL OR
        (anno_immatricolazione >= 1900 AND anno_immatricolazione <= EXTRACT(YEAR FROM CURRENT_DATE) + 1)
    );

-- =============================================
-- DATI DI ESEMPIO (opzionale - commentato)
-- =============================================

-- INSERT INTO public.mezzi_trasporto (targa, tipo_mezzo, modello, marca, anno_immatricolazione, attivo)
-- VALUES
--     ('AB123CD', 'Furgone', 'Ducato', 'Fiat', 2020, true),
--     ('EF456GH', 'Auto', 'Doblo', 'Fiat', 2019, true),
--     ('IJ789KL', 'Camion', 'Daily', 'Iveco', 2018, true);

-- =============================================
-- FINE SCRIPT
-- =============================================
