-- 1. Rimuovere la vecchia colonna 'indirizzo' dalla tabella 'clienti'
-- ATTENZIONE: Questo cancellerà i dati degli indirizzi esistenti. Fai un backup se necessario!
-- Se preferisci, puoi rinominarla e poi migrare i dati. Per semplicità, la rimuoviamo.
ALTER TABLE public.clienti
DROP COLUMN IF EXISTS indirizzo;

-- 2. Creare la nuova tabella 'indirizzi_clienti'
CREATE TABLE public.indirizzi_clienti (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cliente_id UUID NOT NULL REFERENCES public.clienti(id) ON DELETE CASCADE,
    descrizione TEXT, -- Es. "Sede Principale", "Magazzino Nord", "Ufficio Vendite"
    indirizzo_completo TEXT NOT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indice per recuperare velocemente gli indirizzi di un cliente
CREATE INDEX idx_indirizzi_clienti_cliente_id ON public.indirizzi_clienti(cliente_id);

-- Assicurati che ci sia al massimo un indirizzo di default per cliente
-- Questo è un po' più complesso da fare con un constraint diretto a livello di tabella
-- che funzioni per "solo uno true". Spesso si gestisce a livello applicativo
-- o con un trigger più complesso. Per ora, ci affidiamo alla logica applicativa.
-- Una soluzione potrebbe essere un indice univoco parziale, ma è più avanzato:
-- CREATE UNIQUE INDEX idx_unique_default_indirizzo_per_cliente
-- ON public.indirizzi_clienti (cliente_id, is_default)
-- WHERE is_default = TRUE;
-- Questo però permette 0 o 1 default. Se vuoi *esattamente* 1 default, la logica applicativa è più semplice.

-- Abilita RLS per la nuova tabella
ALTER TABLE public.indirizzi_clienti ENABLE ROW LEVEL SECURITY;

-- Policy RLS di base per indirizzi_clienti (da adattare ai tuoi ruoli)
-- Permetti agli utenti autenticati che possono vedere il cliente di vedere i suoi indirizzi
CREATE POLICY "Authenticated users can view client addresses"
    ON public.indirizzi_clienti FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.clienti c
            WHERE c.id = indirizzi_clienti.cliente_id
            -- Qui dovresti replicare la logica di chi può vedere il cliente
            -- Esempio: se solo admin/manager/head/user proprietario possono vedere il cliente:
            -- AND (
            --    public.get_my_role() IN ('admin', 'manager', 'head') OR
            --    (public.get_my_role() = 'user' AND c.creato_da_user_id = auth.uid()) -- se clienti ha creato_da_user_id
            -- )
            -- Per ora, una policy più semplice se i clienti sono generalmente visibili agli utenti loggati che hanno accesso:
            AND public.get_my_role() IS NOT NULL -- O una condizione più specifica basata sui ruoli
        )
    );

-- Permetti agli utenti che possono modificare il cliente di aggiungere/modificare/eliminare i suoi indirizzi
CREATE POLICY "Users who can manage client can manage addresses"
    ON public.indirizzi_clienti FOR ALL -- INSERT, UPDATE, DELETE
    TO authenticated
    USING ( -- Per SELECT implicito in UPDATE/DELETE
        EXISTS (
            SELECT 1 FROM public.clienti c
            WHERE c.id = indirizzi_clienti.cliente_id AND
            (public.get_my_role() IN ('admin', 'manager')) -- Solo admin/manager possono modificare clienti
        )
    )
    WITH CHECK ( -- Per INSERT/UPDATE
         EXISTS (
            SELECT 1 FROM public.clienti c
            WHERE c.id = indirizzi_clienti.cliente_id AND
            (public.get_my_role() IN ('admin', 'manager'))
        )
    );


-- 3. Aggiungere una colonna a 'fogli_assistenza' per l'indirizzo dell'intervento
ALTER TABLE public.fogli_assistenza
ADD COLUMN indirizzo_intervento_id UUID REFERENCES public.indirizzi_clienti(id) ON DELETE SET NULL;
-- ON DELETE SET NULL: se l'indirizzo viene cancellato, il foglio di assistenza non viene cancellato ma il riferimento diventa NULL.
-- Valuta se ON DELETE RESTRICT o un'altra azione sia più appropriata.