-- Per clienti (nome_azienda)
ALTER TABLE public.clienti
ADD CONSTRAINT clienti_nome_azienda_unique UNIQUE (nome_azienda);

-- Per commesse (codice_commessa)
ALTER TABLE public.commesse
ADD CONSTRAINT commesse_codice_commessa_unique UNIQUE (codice_commessa);

-- Per ordini_cliente (numero_ordine_cliente)
-- Assicurati che non ci siano duplicati prima di aggiungere il vincolo,
-- altrimenti dovrai decidere come gestirli.
-- Potresti voler rendere numero_ordine_cliente univoco PER cliente_id,
-- il che è più complesso (indice univoco su più colonne).
-- Per ora, lo rendiamo globalmente univoco per semplicità, ma valuta se è corretto.
-- Se deve essere univoco per cliente, la logica di upsert diventa più complessa
-- perché onConflict su una singola colonna potrebbe non bastare.
-- Per questo esempio, assumiamo che numero_ordine_cliente sia globalmente univoco.
ALTER TABLE public.ordini_cliente
ADD CONSTRAINT ordini_cliente_numero_ordine_cliente_unique UNIQUE (numero_ordine_cliente);

-- Per tecnici (combinazione di nome e cognome)
-- Creiamo un indice univoco su entrambe le colonne.
-- Questo previene l'inserimento di un tecnico con lo stesso nome E cognome.
DROP INDEX IF EXISTS idx_tecnici_nome_cognome_unique; -- Rimuovi se esiste per ricrearlo
CREATE UNIQUE INDEX idx_tecnici_nome_cognome_unique ON public.tecnici (LOWER(nome), LOWER(cognome));
-- Nota: Usare LOWER() rende il controllo case-insensitive, che è spesso desiderabile.
-- L'operazione di upsert dovrà specificare entrambe le colonne in onConflict.