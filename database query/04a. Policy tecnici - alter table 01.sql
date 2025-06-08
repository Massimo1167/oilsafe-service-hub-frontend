ALTER TABLE public.tecnici
ADD COLUMN email TEXT;

-- Opzionale: se vuoi che l'email sia unica (ma potrebbe dare problemi se un tecnico è anche un utente con la stessa email e vuoi flessibilità)
-- ALTER TABLE public.tecnici
-- ADD CONSTRAINT tecnici_email_unique UNIQUE (email);

-- Aggiorna le policy RLS se necessario (quelle esistenti dovrebbero già coprire la nuova colonna per SELECT, INSERT, UPDATE)
-- Se vuoi policy specifiche per la colonna email (es. chi può vederla/modificarla), dovrai aggiungerle.
-- Per ora, assumiamo che le policy esistenti per i ruoli admin/manager siano sufficienti.