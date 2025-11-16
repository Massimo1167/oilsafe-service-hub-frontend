-- =====================================================
-- Tabella reparti per organizzazione tecnici
-- =====================================================
-- Creata il: 2025-01-16
-- Descrizione: Anagrafica reparti/dipartimenti per raggruppamento tecnici
--              per area di competenza o specializzazione
-- =====================================================

CREATE TABLE IF NOT EXISTS public.reparti (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Identificativo reparto
  codice VARCHAR(50) NOT NULL UNIQUE,
  descrizione TEXT NOT NULL,

  -- Metadati
  attivo BOOLEAN DEFAULT true,
  note TEXT
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_reparti_codice ON public.reparti(codice);
CREATE INDEX IF NOT EXISTS idx_reparti_attivo ON public.reparti(attivo);

-- Trigger per aggiornare automaticamente updated_at
CREATE OR REPLACE FUNCTION public.update_reparti_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reparti_updated_at ON public.reparti;
CREATE TRIGGER trigger_reparti_updated_at
  BEFORE UPDATE ON public.reparti
  FOR EACH ROW
  EXECUTE FUNCTION public.update_reparti_updated_at();

-- Commenti per documentazione
COMMENT ON TABLE public.reparti IS 'Anagrafica reparti/dipartimenti per organizzazione tecnici';
COMMENT ON COLUMN public.reparti.codice IS 'Codice univoco reparto (es: REP-MECC, REP-ELETT, REP-IMPL)';
COMMENT ON COLUMN public.reparti.descrizione IS 'Descrizione completa del reparto';
COMMENT ON COLUMN public.reparti.attivo IS 'Flag per disattivare reparti obsoleti senza eliminarli fisicamente';
COMMENT ON COLUMN public.reparti.note IS 'Note aggiuntive e informazioni supplementari sul reparto';
