-- =====================================================
-- Script: 72. Alter table attivita_standard_clienti add indirizzo_cliente_id
-- Descrizione: Aggiunge discriminazione per sede nelle attività standard
-- Data: 2025-01-31
-- =====================================================

-- STEP 1: Aggiungere colonna indirizzo_cliente_id (nullable)
-- NULL = listino generico/unico valido per tutte le sedi
-- valore = listino specifico solo per quella sede
ALTER TABLE public.attivita_standard_clienti
ADD COLUMN IF NOT EXISTS indirizzo_cliente_id UUID NULL
  REFERENCES public.indirizzi_clienti(id) ON DELETE CASCADE;

-- STEP 2: Popolare con NULL i record esistenti (per sicurezza)
-- Questo garantisce che le attività già configurate rimangano valide per tutte le sedi
UPDATE public.attivita_standard_clienti
SET indirizzo_cliente_id = NULL
WHERE indirizzo_cliente_id IS NULL;

-- STEP 3: Rimuovere vecchio constraint UNIQUE
-- Il vecchio constraint permetteva solo (cliente_id, codice_attivita) unici
-- Questo impediva di avere lo stesso codice attività per sedi diverse
ALTER TABLE public.attivita_standard_clienti
DROP CONSTRAINT IF EXISTS attivita_standard_clienti_cliente_id_codice_attivita_key;

-- STEP 4: Aggiungere nuovo constraint UNIQUE che include la sede
-- Questo permette:
-- - Stesso codice attività per sedi diverse dello stesso cliente
-- - Un solo listino generico (NULL) per ogni combinazione cliente+codice
-- - Un solo listino per sede specifica per ogni combinazione cliente+codice+sede
ALTER TABLE public.attivita_standard_clienti
ADD CONSTRAINT attivita_standard_clienti_cliente_sede_codice_unique
  UNIQUE(cliente_id, codice_attivita, indirizzo_cliente_id);

-- STEP 5: Aggiungere indice per migliorare performance delle query filtrate per sede
CREATE INDEX IF NOT EXISTS idx_attivita_standard_indirizzo_cliente
  ON public.attivita_standard_clienti(indirizzo_cliente_id)
  WHERE indirizzo_cliente_id IS NOT NULL;

-- STEP 6: Commento descrittivo
COMMENT ON COLUMN public.attivita_standard_clienti.indirizzo_cliente_id IS
  'NULL = listino generico valido per tutte le sedi del cliente (o listino unico). Valore UUID = listino specifico solo per quella sede.';

-- Note implementative:
-- - Se cliente.usa_listino_unico = TRUE, indirizzo_cliente_id deve essere sempre NULL
-- - Se cliente.usa_listino_unico = FALSE, indirizzo_cliente_id può essere NULL (fallback) o un ID specifico
-- - Il constraint UNIQUE permette di avere:
--   * Cliente A, Codice "MAINT-001", Sede NULL (listino generico)
--   * Cliente A, Codice "MAINT-001", Sede Milano (listino specifico)
--   * Cliente A, Codice "MAINT-001", Sede Parigi (listino specifico)
-- - Le query in FoglioAttivitaStandardPage filtreranno per:
--   * (sede_foglio) OR (sede IS NULL) quando listino non è unico
