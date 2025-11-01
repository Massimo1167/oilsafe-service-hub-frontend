-- =====================================================
-- Script: 71. Alter table clienti add usa_listino_unico
-- Descrizione: Aggiunge campo per gestire modalità listino unico vs listino per sede
-- Data: 2025-01-31
-- =====================================================

-- Aggiungere colonna usa_listino_unico alla tabella clienti
-- TRUE = listino unico valido per tutte le sedi del cliente
-- FALSE = listini differenziati per singola sede
ALTER TABLE public.clienti
ADD COLUMN IF NOT EXISTS usa_listino_unico BOOLEAN DEFAULT true NOT NULL;

-- Commento descrittivo
COMMENT ON COLUMN public.clienti.usa_listino_unico IS
  'TRUE = listino unico per tutte le sedi, FALSE = listini differenziati per sede. Default TRUE per retrocompatibilità.';

-- Nota: I clienti esistenti avranno automaticamente usa_listino_unico = TRUE
-- per mantenere il comportamento attuale (un unico listino per cliente)
