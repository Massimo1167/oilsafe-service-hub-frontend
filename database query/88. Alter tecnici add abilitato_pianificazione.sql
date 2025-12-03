-- FASE 1: Aggiunge campo boolean per abilitare/disabilitare tecnico in pianificazione
-- Questo campo permette di nascondere tecnici dalle interfacce di pianificazione
-- senza eliminarli dal database (es: personale amministrativo, ex-dipendenti)

ALTER TABLE public.tecnici
ADD COLUMN IF NOT EXISTS abilitato_pianificazione BOOLEAN DEFAULT true NOT NULL;

COMMENT ON COLUMN public.tecnici.abilitato_pianificazione IS
'Se true, il tecnico viene mostrato nelle interfacce di pianificazione (griglia settimanale, dropdown). Se false, viene escluso dalle pianificazioni ma rimane visibile in anagrafica e fogli assistenza.';

-- Verifica
SELECT
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tecnici'
  AND column_name = 'abilitato_pianificazione';
