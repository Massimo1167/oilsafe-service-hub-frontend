-- =====================================================
-- Alter tabella interventi_assistenza - Aggiungi mansione_id
-- =====================================================
-- Creata il: 2025-10-24
-- Aggiornata il: 2025-10-24
-- Descrizione: Aggiunge il campo mansione_id alla tabella interventi_assistenza
--              per storicizzare la mansione del tecnico al momento dell''intervento.
--              Questo permette di calcolare i costi storici anche se il tecnico
--              cambia mansione in futuro.
-- =====================================================

-- Aggiungi colonna mansione_id come foreign key alla tabella mansioni
ALTER TABLE public.interventi_assistenza
ADD COLUMN IF NOT EXISTS mansione_id UUID REFERENCES public.mansioni(id) ON DELETE SET NULL;

-- Crea indice per performance sulle query di JOIN
CREATE INDEX IF NOT EXISTS idx_interventi_assistenza_mansione_id
ON public.interventi_assistenza(mansione_id);

-- Aggiungi commento per documentazione
COMMENT ON COLUMN public.interventi_assistenza.mansione_id IS
'FK verso mansioni - storicizza la mansione del tecnico al momento dell''intervento per calcoli costi storici';

-- =====================================================
-- NOTA IMPORTANTE PER MIGRAZIONE DATI ESISTENTI
-- =====================================================
-- Gli interventi esistenti avranno mansione_id = NULL dopo questa migrazione.
-- La UI dovrà popolare questo campo automaticamente quando:
-- 1. Viene creato un nuovo intervento (copia mansione_id da tecnici)
-- 2. Viene modificato il tecnico di un intervento (aggiorna mansione_id)
--
-- Per popolare retroattivamente gli interventi esistenti (OPZIONALE):
-- Eseguire questa query per copiare la mansione attuale del tecnico
-- negli interventi dove è ancora NULL:
--
-- UPDATE public.interventi_assistenza ia
-- SET mansione_id = t.mansione_id
-- FROM public.tecnici t
-- WHERE ia.tecnico_id = t.id
-- AND ia.mansione_id IS NULL
-- AND t.mansione_id IS NOT NULL;
--
-- =====================================================

-- =====================================================
-- CALCOLO COSTI (FUTURO - NON IMPLEMENTATO ORA)
-- =====================================================
-- In futuro, il report consuntivo calcolerà i costi con questa logica:
--
-- SELECT
--   ia.id,
--   ia.descrizione_attivita_svolta_intervento,
--   ia.ore_lavoro_effettive,
--   ia.tipo_intervento,
--   t.nome || '' '' || t.cognome AS tecnico,
--   m.ruolo AS mansione,
--   -- Determina costo orario in base a tipo_intervento
--   CASE
--     WHEN ia.tipo_intervento = ''In loco'' THEN m.costo_orario_sede
--     WHEN ia.tipo_intervento = ''Remoto'' THEN m.costo_orario_trasferta
--     ELSE 0
--   END AS costo_orario_applicato,
--   -- Calcola costo totale
--   COALESCE(ia.ore_lavoro_effettive, 0) *
--   CASE
--     WHEN ia.tipo_intervento = ''In loco'' THEN m.costo_orario_sede
--     WHEN ia.tipo_intervento = ''Remoto'' THEN m.costo_orario_trasferta
--     ELSE 0
--   END AS costo_totale
-- FROM interventi_assistenza ia
-- LEFT JOIN tecnici t ON ia.tecnico_id = t.id
-- LEFT JOIN mansioni m ON ia.mansione_id = m.id
-- WHERE ia.foglio_assistenza_id = ''xxx''
-- ORDER BY ia.data_intervento_effettivo;
--
-- =====================================================

-- Query di verifica post-migrazione
-- Esegui questa query per vedere quali interventi non hanno mansione assegnata:
--
-- SELECT
--   ia.id,
--   ia.descrizione_attivita_svolta_intervento,
--   ia.data_intervento_effettivo,
--   t.nome || '' '' || t.cognome AS tecnico,
--   t.mansione_id AS mansione_tecnico,
--   ia.mansione_id AS mansione_intervento
-- FROM public.interventi_assistenza ia
-- LEFT JOIN public.tecnici t ON ia.tecnico_id = t.id
-- WHERE ia.mansione_id IS NULL
-- ORDER BY ia.created_at DESC
-- LIMIT 50;
