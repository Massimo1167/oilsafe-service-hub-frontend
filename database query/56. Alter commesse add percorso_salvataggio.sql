-- Aggiunge il campo opzionale "percorso_salvataggio" alla tabella commesse
-- per specificare il percorso di default per il salvataggio dei fogli di lavoro PDF

ALTER TABLE public.commesse
ADD COLUMN percorso_salvataggio TEXT;

-- Aggiungi un commento per documentare il campo
COMMENT ON COLUMN public.commesse.percorso_salvataggio IS 'Percorso di default per il salvataggio dei fogli di lavoro PDF della commessa (opzionale)';