-- =====================================================
-- Modifica tabella attivita_standard_clienti
-- =====================================================
-- Creata il: 2025-10-31
-- Descrizione: Sostituisce la colonna unita_misura (TEXT)
--              con unita_misura_id (FK a unita_misura)
--              per standardizzare le unità di misura
-- =====================================================

-- Step 1: Rimuovere la colonna TEXT unita_misura
-- Nota: I record esistenti verranno cancellati manualmente prima di eseguire questo script
ALTER TABLE public.attivita_standard_clienti
DROP COLUMN IF EXISTS unita_misura;

-- Step 2: Aggiungere la nuova colonna FK unita_misura_id
ALTER TABLE public.attivita_standard_clienti
ADD COLUMN unita_misura_id UUID NOT NULL
REFERENCES public.unita_misura(id) ON DELETE RESTRICT;

-- Step 3: Creare indice per performance
CREATE INDEX IF NOT EXISTS idx_attivita_standard_unita_misura
ON public.attivita_standard_clienti(unita_misura_id);

-- Commento
COMMENT ON COLUMN public.attivita_standard_clienti.unita_misura_id
IS 'FK a unita_misura - Unità di misura standardizzata per l''attività';
