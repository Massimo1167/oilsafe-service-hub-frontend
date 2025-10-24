-- =====================================================
-- Tabella mansioni per gestione qualifiche e costi orari
-- =====================================================
-- Creata il: 2025-10-24
-- Descrizione: Anagrafica mansioni/qualifiche dei tecnici
--              con costi orari differenziati per tipo orario e ubicazione.
--              Utilizzata per calcolo consuntivi amministrativi.
-- =====================================================

CREATE TABLE IF NOT EXISTS public.mansioni (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Identificativo mansione
  ruolo VARCHAR(100) NOT NULL UNIQUE,
  descrizione TEXT,
  livello VARCHAR(20), -- 'generico', 'junior', 'senior'
  categoria VARCHAR(50), -- 'operaio', 'carpentiere', 'oleodinamico', 'meccanico', 'elettricista', 'softwarista', 'progettista'

  -- Costi Orari Normali (€/ora)
  costo_orario_sede DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo_orario_sede >= 0),
  costo_orario_trasferta DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo_orario_trasferta >= 0),

  -- Costi Orari Straordinari (€/ora)
  costo_straordinario_sede DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo_straordinario_sede >= 0),
  costo_straordinario_trasferta DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo_straordinario_trasferta >= 0),

  -- Costi Orari Festivi (€/ora)
  costo_festivo_sede DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo_festivo_sede >= 0),
  costo_festivo_trasferta DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo_festivo_trasferta >= 0),

  -- Costi Orari Straordinari Festivi (€/ora)
  costo_straordinario_festivo_sede DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo_straordinario_festivo_sede >= 0),
  costo_straordinario_festivo_trasferta DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (costo_straordinario_festivo_trasferta >= 0),

  -- Metadati
  attivo BOOLEAN DEFAULT true,
  note TEXT
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_mansioni_ruolo ON public.mansioni(ruolo);
CREATE INDEX IF NOT EXISTS idx_mansioni_categoria ON public.mansioni(categoria);
CREATE INDEX IF NOT EXISTS idx_mansioni_livello ON public.mansioni(livello);
CREATE INDEX IF NOT EXISTS idx_mansioni_attivo ON public.mansioni(attivo);

-- Trigger per aggiornare updated_at
CREATE OR REPLACE FUNCTION public.update_mansioni_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mansioni_updated_at ON public.mansioni;
CREATE TRIGGER trigger_mansioni_updated_at
  BEFORE UPDATE ON public.mansioni
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mansioni_updated_at();

-- Commenti per documentazione
COMMENT ON TABLE public.mansioni IS 'Anagrafica mansioni/qualifiche dei tecnici con costi orari per calcolo consuntivi';
COMMENT ON COLUMN public.mansioni.ruolo IS 'Nome mansione univoco (es: Carpentiere Senior, Meccanico Junior)';
COMMENT ON COLUMN public.mansioni.descrizione IS 'Descrizione dettagliata della mansione';
COMMENT ON COLUMN public.mansioni.livello IS 'Livello esperienza: generico, junior, senior';
COMMENT ON COLUMN public.mansioni.categoria IS 'Categoria professionale: operaio, carpentiere, oleodinamico, meccanico, elettricista, softwarista, progettista';
COMMENT ON COLUMN public.mansioni.costo_orario_sede IS 'Costo orario normale in sede (€/h)';
COMMENT ON COLUMN public.mansioni.costo_orario_trasferta IS 'Costo orario normale in trasferta (€/h)';
COMMENT ON COLUMN public.mansioni.costo_straordinario_sede IS 'Costo orario straordinario in sede (€/h)';
COMMENT ON COLUMN public.mansioni.costo_straordinario_trasferta IS 'Costo orario straordinario in trasferta (€/h)';
COMMENT ON COLUMN public.mansioni.costo_festivo_sede IS 'Costo orario festivo in sede (€/h)';
COMMENT ON COLUMN public.mansioni.costo_festivo_trasferta IS 'Costo orario festivo in trasferta (€/h)';
COMMENT ON COLUMN public.mansioni.costo_straordinario_festivo_sede IS 'Costo orario straordinario festivo in sede (€/h)';
COMMENT ON COLUMN public.mansioni.costo_straordinario_festivo_trasferta IS 'Costo orario straordinario festivo in trasferta (€/h)';
COMMENT ON COLUMN public.mansioni.attivo IS 'Flag per disattivare mansioni obsolete senza eliminarle';
COMMENT ON COLUMN public.mansioni.note IS 'Note aggiuntive sulla mansione';
