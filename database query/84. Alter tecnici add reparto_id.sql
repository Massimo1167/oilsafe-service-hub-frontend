-- =====================================================
-- Alter tabella tecnici - Aggiungi reparto_id
-- =====================================================
-- Creata il: 2025-01-16
-- Descrizione: Aggiunge il campo reparto_id alla tabella tecnici
--              per collegare ogni tecnico al suo reparto di appartenenza.
--              Permette di organizzare i tecnici per dipartimento/area.
-- =====================================================

-- Aggiungi colonna reparto_id come foreign key alla tabella reparti
ALTER TABLE public.tecnici
ADD COLUMN IF NOT EXISTS reparto_id UUID REFERENCES public.reparti(id) ON DELETE SET NULL;

-- Crea indice per performance sulle query di JOIN e filtri
CREATE INDEX IF NOT EXISTS idx_tecnici_reparto_id ON public.tecnici(reparto_id);

-- Aggiungi commento per documentazione
COMMENT ON COLUMN public.tecnici.reparto_id IS 'FK verso reparti - reparto/dipartimento di appartenenza del tecnico';
