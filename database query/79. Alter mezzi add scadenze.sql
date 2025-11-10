-- =============================================
-- Script: 79. Alter mezzi_trasporto add scadenze
-- Descrizione: Aggiunge campi per gestione scadenze mezzi
-- Data: 2025-11-10
-- Versione: 1.0.0
-- =============================================

-- Aggiungi colonne scadenze
ALTER TABLE public.mezzi_trasporto
  ADD COLUMN scadenza_revisione DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  ADD COLUMN scadenza_assicurazione DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  ADD COLUMN scadenza_bollo DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  ADD COLUMN scadenza_manutenzione DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '6 months'),
  ADD COLUMN note_stato_mezzo TEXT;

-- Rimuovi i default dopo averli usati per i record esistenti
ALTER TABLE public.mezzi_trasporto
  ALTER COLUMN scadenza_revisione DROP DEFAULT,
  ALTER COLUMN scadenza_assicurazione DROP DEFAULT,
  ALTER COLUMN scadenza_bollo DROP DEFAULT,
  ALTER COLUMN scadenza_manutenzione DROP DEFAULT;

-- Indici per query performance sulle scadenze
CREATE INDEX IF NOT EXISTS idx_mezzi_scadenza_revisione
  ON public.mezzi_trasporto(scadenza_revisione);

CREATE INDEX IF NOT EXISTS idx_mezzi_scadenza_assicurazione
  ON public.mezzi_trasporto(scadenza_assicurazione);

CREATE INDEX IF NOT EXISTS idx_mezzi_scadenza_bollo
  ON public.mezzi_trasporto(scadenza_bollo);

CREATE INDEX IF NOT EXISTS idx_mezzi_scadenza_manutenzione
  ON public.mezzi_trasporto(scadenza_manutenzione);

-- Constraint: scadenze devono essere nel futuro all'inserimento
-- NOTA: Si applica solo a INSERT, non a UPDATE (per permettere gestione storico)
CREATE OR REPLACE FUNCTION validate_mezzi_scadenze_future()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.scadenza_revisione < CURRENT_DATE THEN
      RAISE EXCEPTION 'La scadenza revisione deve essere futura';
    END IF;
    IF NEW.scadenza_assicurazione < CURRENT_DATE THEN
      RAISE EXCEPTION 'La scadenza assicurazione deve essere futura';
    END IF;
    IF NEW.scadenza_bollo < CURRENT_DATE THEN
      RAISE EXCEPTION 'La scadenza bollo deve essere futura';
    END IF;
    IF NEW.scadenza_manutenzione < CURRENT_DATE THEN
      RAISE EXCEPTION 'La scadenza manutenzione deve essere futura';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_mezzi_scadenze_future ON public.mezzi_trasporto;
CREATE TRIGGER check_mezzi_scadenze_future
  BEFORE INSERT ON public.mezzi_trasporto
  FOR EACH ROW
  EXECUTE FUNCTION validate_mezzi_scadenze_future();

-- Commenti
COMMENT ON COLUMN public.mezzi_trasporto.scadenza_revisione IS 'Data scadenza revisione veicolo (alert 45gg)';
COMMENT ON COLUMN public.mezzi_trasporto.scadenza_assicurazione IS 'Data scadenza assicurazione (alert 30gg)';
COMMENT ON COLUMN public.mezzi_trasporto.scadenza_bollo IS 'Data scadenza bollo auto (alert 30gg)';
COMMENT ON COLUMN public.mezzi_trasporto.scadenza_manutenzione IS 'Data scadenza manutenzione programmata (alert 15gg)';
COMMENT ON COLUMN public.mezzi_trasporto.note_stato_mezzo IS 'Note multilinea sullo stato del mezzo';
