-- Per clienti (nome_azienda)
ALTER TABLE public.clienti
ADD CONSTRAINT clienti_nome_azienda_unique UNIQUE (nome_azienda);

-- Per commesse (codice_commessa)
ALTER TABLE public.commesse
ADD CONSTRAINT commesse_codice_commessa_unique UNIQUE (codice_commessa);

-- Per tecnici (combinazione di nome e cognome)
-- Creiamo un indice univoco su entrambe le colonne.
-- Questo previene l'inserimento di un tecnico con lo stesso nome E cognome.
DROP INDEX IF EXISTS idx_tecnici_nome_cognome_unique; -- Rimuovi se esiste per ricrearlo
CREATE UNIQUE INDEX idx_tecnici_nome_cognome_unique ON public.tecnici (LOWER(nome), LOWER(cognome));
-- Nota: Usare LOWER() rende il controllo case-insensitive, che è spesso desiderabile.
-- L'operazione di upsert dovrà specificare entrambe le colonne in onConflict.