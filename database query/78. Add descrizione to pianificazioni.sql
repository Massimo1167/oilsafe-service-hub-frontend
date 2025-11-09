-- Migration: Aggiunge campo descrizione alla tabella pianificazioni
-- Data: 2025-01-08
-- Descrizione: Campo opzionale per note e dettagli sulla pianificazione

-- Aggiunge la colonna descrizione
ALTER TABLE pianificazioni
ADD COLUMN IF NOT EXISTS descrizione TEXT;

-- Commento sulla colonna
COMMENT ON COLUMN pianificazioni.descrizione IS 'Note e dettagli opzionali sulla pianificazione';
