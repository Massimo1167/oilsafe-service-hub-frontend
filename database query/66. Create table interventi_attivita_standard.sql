-- =====================================================
-- Tabella interventi_attivita_standard
-- =====================================================
-- Creata il: 2025-10-30
-- Descrizione: Storicizza le attività standard eseguite negli interventi.
--              Salva codice, descrizione, UM e costo unitario al momento dell'intervento
--              per preservare i dati storici anche se l'anagrafica cambia.
--              Il costo totale è calcolato automaticamente: quantita * costo_unitario
-- =====================================================

CREATE TABLE IF NOT EXISTS public.interventi_attivita_standard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign Keys
  intervento_assistenza_id UUID NOT NULL REFERENCES public.interventi_assistenza(id) ON DELETE CASCADE,
  attivita_standard_id UUID NOT NULL REFERENCES public.attivita_standard_clienti(id) ON DELETE CASCADE,

  -- STORICIZZAZIONE (valori al momento dell'intervento)
  codice_attivita VARCHAR(50) NOT NULL,
  descrizione TEXT NOT NULL,
  unita_misura VARCHAR(50) NOT NULL,
  costo_unitario DECIMAL(10,2) NOT NULL CHECK (costo_unitario >= 0),

  -- QUANTITÀ EFFETTIVA
  quantita DECIMAL(10,2) NOT NULL CHECK (quantita > 0),  -- Minimo 1, può essere decimale (es: 2.5 ore)

  -- COSTO TOTALE CALCOLATO AUTOMATICAMENTE
  costo_totale DECIMAL(10,2) GENERATED ALWAYS AS (quantita * costo_unitario) STORED,

  -- Vincolo: stessa attività non può essere registrata due volte per lo stesso intervento
  UNIQUE(intervento_assistenza_id, attivita_standard_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_interventi_attivita_intervento_id
  ON public.interventi_attivita_standard(intervento_assistenza_id);

CREATE INDEX IF NOT EXISTS idx_interventi_attivita_attivita_id
  ON public.interventi_attivita_standard(attivita_standard_id);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION public.update_interventi_attivita_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_interventi_attivita_updated_at
BEFORE UPDATE ON public.interventi_attivita_standard
FOR EACH ROW
EXECUTE FUNCTION public.update_interventi_attivita_updated_at();

-- Commenti
COMMENT ON TABLE public.interventi_attivita_standard IS
  'Storicizza attività standard eseguite negli interventi con prezzi al momento dell''intervento';

COMMENT ON COLUMN public.interventi_attivita_standard.codice_attivita IS
  'Codice storicizzato (snapshot al momento dell''intervento)';

COMMENT ON COLUMN public.interventi_attivita_standard.costo_unitario IS
  'Costo unitario storicizzato al momento dell''intervento per preservare dati storici';

COMMENT ON COLUMN public.interventi_attivita_standard.quantita IS
  'Quantità effettivamente eseguita (minimo 1, può essere decimale es: 2.5h)';

COMMENT ON COLUMN public.interventi_attivita_standard.costo_totale IS
  'Costo totale calcolato automaticamente: quantita * costo_unitario (GENERATED COLUMN)';

COMMENT ON COLUMN public.interventi_attivita_standard.intervento_assistenza_id IS
  'FK verso interventi_assistenza - ON DELETE CASCADE';

COMMENT ON COLUMN public.interventi_attivita_standard.attivita_standard_id IS
  'FK verso attivita_standard_clienti - riferimento all''anagrafica (può cambiare nel tempo)';
