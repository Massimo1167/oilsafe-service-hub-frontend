-- =====================================================
-- Tabella attivita_standard_aziendali per listino prezzi aziendale globale
-- =====================================================
-- Creata il: 2025-12-15
-- Descrizione: Listino prezzi aziendale di default valido per tutti i clienti.
--              Funziona come fallback globale: se un'attività non è specificata
--              a livello cliente o sede, viene utilizzata quella aziendale.
--              Gerarchia: Sede > Cliente > Aziendale (il più specifico sovrascrive)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.attivita_standard_aziendali (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Identificativo attività
  codice_attivita VARCHAR(50) NOT NULL UNIQUE,  -- UNIQUE globale (no composite key)
  normativa TEXT,  -- Campo informativo opzionale (es: riferimento normativo)
  descrizione TEXT NOT NULL,

  -- Unità di misura e costo
  unita_misura_id UUID NOT NULL REFERENCES public.unita_misura(id) ON DELETE RESTRICT,
  costo_unitario DECIMAL(10,2) NOT NULL CHECK (costo_unitario >= 0),

  -- Metadati
  attivo BOOLEAN DEFAULT TRUE NOT NULL
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_attivita_aziendale_attivo
  ON public.attivita_standard_aziendali(attivo);

CREATE INDEX IF NOT EXISTS idx_attivita_aziendale_codice
  ON public.attivita_standard_aziendali(codice_attivita);

CREATE INDEX IF NOT EXISTS idx_attivita_aziendale_unita_misura
  ON public.attivita_standard_aziendali(unita_misura_id);

-- Trigger per aggiornare updated_at
CREATE TRIGGER trigger_attivita_aziendale_updated_at
BEFORE UPDATE ON public.attivita_standard_aziendali
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Commenti
COMMENT ON TABLE public.attivita_standard_aziendali IS
  'Listino prezzi aziendale globale - fallback per tutte le attività non specificate a livello cliente/sede';

COMMENT ON COLUMN public.attivita_standard_aziendali.codice_attivita IS
  'Codice univoco attività a livello aziendale (es: MAINT-001, VERIF-002)';

COMMENT ON COLUMN public.attivita_standard_aziendali.normativa IS
  'Riferimento normativo opzionale (es: UNI EN 1234:2020, norma legale)';

COMMENT ON COLUMN public.attivita_standard_aziendali.descrizione IS
  'Descrizione dettagliata dell''attività standard aziendale';

COMMENT ON COLUMN public.attivita_standard_aziendali.unita_misura_id IS
  'FK a unita_misura - Unità di misura standardizzata (es: €/h, €/prova, €/consegna)';

COMMENT ON COLUMN public.attivita_standard_aziendali.costo_unitario IS
  'Costo unitario aziendale di default (può essere sovrascritto a livello cliente/sede)';

COMMENT ON COLUMN public.attivita_standard_aziendali.attivo IS
  'Flag per disabilitare l''attività senza eliminarla (soft delete)';

-- Verifica finale
DO $$
BEGIN
  RAISE NOTICE '✅ Tabella attivita_standard_aziendali creata con successo';
  RAISE NOTICE '📊 Indici: attivo, codice_attivita, unita_misura_id';
  RAISE NOTICE '📐 Constraint: UNIQUE(codice_attivita) - univocità globale';
  RAISE NOTICE '🔄 Trigger: update_updated_at_column abilitato';
  RAISE NOTICE '🎯 Gerarchia prezzi: Sede > Cliente > AZIENDALE (nuovo livello fallback)';
END $$;
