-- =====================================================
-- Tabella fogli_attivita_standard (junction table)
-- =====================================================
-- Creata il: 2025-10-30
-- Descrizione: Tabella di collegamento tra fogli_assistenza e attivita_standard_clienti.
--              Permette ad admin/manager di selezionare N attività standard da
--              presentare agli user durante la compilazione degli interventi.
--              Alcune attività possono essere marcate come obbligatorie.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.fogli_attivita_standard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Foreign Keys
  foglio_assistenza_id UUID NOT NULL REFERENCES public.fogli_assistenza(id) ON DELETE CASCADE,
  attivita_standard_id UUID NOT NULL REFERENCES public.attivita_standard_clienti(id) ON DELETE CASCADE,

  -- Flag obbligatorietà
  obbligatoria BOOLEAN DEFAULT FALSE,

  -- Vincolo: stessa attività non può essere selezionata due volte per lo stesso foglio
  UNIQUE(foglio_assistenza_id, attivita_standard_id)
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_fogli_attivita_foglio_id
  ON public.fogli_attivita_standard(foglio_assistenza_id);

CREATE INDEX IF NOT EXISTS idx_fogli_attivita_attivita_id
  ON public.fogli_attivita_standard(attivita_standard_id);

-- Commenti
COMMENT ON TABLE public.fogli_attivita_standard IS
  'Junction table: collega fogli_assistenza con attivita_standard_clienti selezionate da admin/manager';

COMMENT ON COLUMN public.fogli_attivita_standard.obbligatoria IS
  'Flag che indica se l''attività DEVE essere compilata dall''user nell''intervento';

COMMENT ON COLUMN public.fogli_attivita_standard.foglio_assistenza_id IS
  'FK verso fogli_assistenza - ON DELETE CASCADE: se foglio eliminato, eliminate le selezioni';

COMMENT ON COLUMN public.fogli_attivita_standard.attivita_standard_id IS
  'FK verso attivita_standard_clienti - ON DELETE CASCADE: se attività eliminata, eliminate le selezioni';
