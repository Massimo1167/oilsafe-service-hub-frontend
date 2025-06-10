-- 1. Creare una tabella dedicata per il contatore dei fogli di lavoro.
-- L'uso di una tabella con una colonna BIGSERIAL è il modo più robusto in PostgreSQL
-- per garantire un contatore sequenziale e univoco, anche in caso di accessi concorrenti.
CREATE TABLE public.fogli_assistenza_counter (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Abilita RLS per sicurezza, anche se non prevediamo accessi diretti dal client.
ALTER TABLE public.fogli_assistenza_counter ENABLE ROW LEVEL SECURITY;
-- Nessuna policy è necessaria se solo le funzioni SECURITY DEFINER vi accedono.


-- 2. Creare una funzione PostgreSQL (che Supabase esporrà come RPC)
-- per generare il prossimo numero di foglio.
-- Questa funzione è atomica e sicura per l'uso concorrente.
CREATE OR REPLACE FUNCTION public.genera_prossimo_numero_foglio()
RETURNS TEXT -- La funzione restituirà il numero formattato come testo (es. "FLE_00000001")
LANGUAGE plpgsql
SECURITY DEFINER -- Esegue con i permessi del creatore, necessario per modificare la tabella counter
AS $$
DECLARE
    next_id BIGINT;
    formatted_id TEXT;
BEGIN
    -- Inserisce una nuova riga nella tabella contatore e ottiene il nuovo ID generato
    INSERT INTO public.fogli_assistenza_counter DEFAULT VALUES RETURNING id INTO next_id;

    -- Formatta l'ID numerico nel formato desiderato: FLE_ seguito da 8 cifre con padding di zeri a sinistra.
    -- Esempio: 1 -> 00000001, 123 -> 00000123
    formatted_id := 'FLE_' || LPAD(next_id::TEXT, 8, '0');

    RETURN formatted_id;
END;
$$;


-- 3. Aggiungere un vincolo UNIQUE alla colonna 'numero_foglio' nella tabella principale
-- Questo assicura che il database stesso impedisca l'inserimento di numeri di foglio duplicati,
-- garantendo l'integrità dei dati.
ALTER TABLE public.fogli_assistenza
ADD CONSTRAINT fogli_assistenza_numero_foglio_unique UNIQUE (numero_foglio);