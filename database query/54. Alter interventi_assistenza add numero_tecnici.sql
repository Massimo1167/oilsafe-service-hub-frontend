-- Records the number of technicians involved in an intervention
ALTER TABLE public.interventi_assistenza
  ADD COLUMN numero_tecnici INTEGER NOT NULL DEFAULT 1;
