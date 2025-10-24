-- =====================================================
-- Alter tabella tecnici - Aggiungi mansione_id
-- =====================================================
-- Creata il: 2025-10-24
-- Descrizione: Aggiunge il campo mansione_id alla tabella tecnici
--              per collegare ogni tecnico alla sua mansione/qualifica.
--              Utilizzato per determinare il costo orario applicabile
--              durante la creazione degli interventi.
-- =====================================================

-- Aggiungi colonna mansione_id come foreign key alla tabella mansioni
ALTER TABLE public.tecnici
ADD COLUMN IF NOT EXISTS mansione_id UUID REFERENCES public.mansioni(id) ON DELETE SET NULL;

-- Crea indice per performance sulle query di JOIN
CREATE INDEX IF NOT EXISTS idx_tecnici_mansione_id ON public.tecnici(mansione_id);

-- Aggiungi commento per documentazione
COMMENT ON COLUMN public.tecnici.mansione_id IS 'FK verso mansioni - qualifica/ruolo del tecnico per calcolo costi orari';

-- =====================================================
-- NOTA IMPORTANTE PER MIGRAZIONE DATI ESISTENTI
-- =====================================================
-- I tecnici esistenti avranno mansione_id = NULL dopo questa migrazione.
-- È necessario assegnare manualmente o programmaticamente una mansione
-- ad ogni tecnico esistente attraverso l'interfaccia TecniciManager.
--
-- Esempio di assegnazione massiva (da eseguire manualmente se necessario):
--
-- UPDATE public.tecnici
-- SET mansione_id = (SELECT id FROM public.mansioni WHERE ruolo = 'Meccanico Junior' LIMIT 1)
-- WHERE nome_cognome LIKE '%specificare_pattern%' AND mansione_id IS NULL;
--
-- =====================================================

-- Query di verifica post-migrazione
-- Esegui questa query per vedere quali tecnici non hanno ancora una mansione assegnata:
--
-- SELECT id, nome_cognome, mansione_id
-- FROM public.tecnici
-- WHERE mansione_id IS NULL;
