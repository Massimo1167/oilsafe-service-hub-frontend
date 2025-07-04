-- Adds a note field for tracking status information on service sheets
ALTER TABLE public.fogli_assistenza
  ADD COLUMN nota_stato_foglio TEXT;
