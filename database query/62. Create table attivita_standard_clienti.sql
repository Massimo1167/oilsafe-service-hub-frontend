-- =====================================================
-- Tabella attivita_standard_clienti per gestione attività standard per cliente
-- =====================================================
-- Creata il: 2025-10-30
-- Descrizione: Anagrafica attività standard con prezzi predefiniti per cliente.
--              Utilizzata per definire contrattualmente attività ricorrenti
--              con tariffe fisse (es: €/prova, €/h, €/consegna, etc.)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.attivita_standard_clienti (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Relazione con cliente
  cliente_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,

  -- Identificativo attività
  codice_attivita VARCHAR(50) NOT NULL,
  normativa TEXT,  -- Campo informativo opzionale (es: riferimento normativo)
  descrizione TEXT NOT NULL,

  -- Unità di misura e costo
  unita_misura VARCHAR(50) NOT NULL,  -- es: '€/prova', '€/h', '€/consegna', '€/giorno', '€/ritiro', '€/pezzo', '€*mc/giorno'
  costo_unitario DECIMAL(10,2) NOT NULL CHECK (costo_unitario >= 0),

  -- Metadati
  attivo BOOLEAN DEFAULT TRUE,

  -- Vincolo: stesso cliente non può avere 2 attività con stesso codice
  UNIQUE(cliente_id, codice_attivita)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_attivita_standard_cliente_id
  ON public.attivita_standard_clienti(cliente_id);

CREATE INDEX IF NOT EXISTS idx_attivita_standard_attivo
  ON public.attivita_standard_clienti(attivo);

CREATE INDEX IF NOT EXISTS idx_attivita_standard_codice
  ON public.attivita_standard_clienti(codice_attivita);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION public.update_attivita_standard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_attivita_standard_updated_at
BEFORE UPDATE ON public.attivita_standard_clienti
FOR EACH ROW
EXECUTE FUNCTION public.update_attivita_standard_updated_at();

-- Commenti
COMMENT ON TABLE public.attivita_standard_clienti IS
  'Anagrafica attività standard con prezzi predefiniti per cliente per contratti di manutenzione';

COMMENT ON COLUMN public.attivita_standard_clienti.codice_attivita IS
  'Codice identificativo attività (univoco per cliente)';

COMMENT ON COLUMN public.attivita_standard_clienti.normativa IS
  'Riferimento normativo opzionale (es: norma legale, standard tecnico)';

COMMENT ON COLUMN public.attivita_standard_clienti.unita_misura IS
  'Unità di misura per il costo unitario (es: €/prova, €/h, €/consegna)';

COMMENT ON COLUMN public.attivita_standard_clienti.costo_unitario IS
  'Costo unitario dell''attività in euro secondo l''unità di misura specificata';
