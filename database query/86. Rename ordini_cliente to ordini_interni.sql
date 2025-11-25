-- =============================================
-- 86. Rename ordini_cliente to ordini_interni
-- =============================================
-- Rinomina la tabella ordini_cliente in ordini_interni per chiarire che contiene
-- i numeri d'ordine interni del gestionale Oilsafe, non gli ordini del cliente.
-- Aggiunge campi opzionali per tracciare i dati dell'ordine effettivo del cliente.

-- Step 1: Rinomina la tabella
ALTER TABLE public.ordini_cliente RENAME TO ordini_interni;

-- Step 2: Aggiungi nuove colonne per i dati dell'ordine cliente
ALTER TABLE public.ordini_interni
ADD COLUMN IF NOT EXISTS codice_ordine_cliente VARCHAR(100),
ADD COLUMN IF NOT EXISTS data_ordine_cliente DATE,
ADD COLUMN IF NOT EXISTS data_conferma_ordine DATE;

-- Step 3: Aggiungi commenti alle nuove colonne
COMMENT ON COLUMN public.ordini_interni.codice_ordine_cliente IS 'Codice ordine fornito dal cliente';
COMMENT ON COLUMN public.ordini_interni.data_ordine_cliente IS 'Data ordine del cliente';
COMMENT ON COLUMN public.ordini_interni.data_conferma_ordine IS 'Data conferma ordine da parte nostra';

-- Step 4: Aggiorna il commento della tabella
COMMENT ON TABLE public.ordini_interni IS 'Numeri d''ordine interni del gestionale Oilsafe collegati alle commesse';

-- Step 5: Rinomina il vincolo UNIQUE
-- PostgreSQL non supporta IF EXISTS con RENAME CONSTRAINT, quindi usa DO block
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_numero_ordine_per_commessa'
    ) THEN
        ALTER TABLE public.ordini_interni
        RENAME CONSTRAINT unique_numero_ordine_per_commessa
        TO unique_numero_ordine_interno_per_commessa;
    END IF;
END $$;

-- Step 6: Rinomina la colonna foreign key nella tabella fogli_assistenza
ALTER TABLE public.fogli_assistenza
RENAME COLUMN ordine_cliente_id TO ordine_interno_id;

-- Step 7: Aggiorna il commento della colonna rinominata
COMMENT ON COLUMN public.fogli_assistenza.ordine_interno_id IS 'Riferimento all''ordine interno del gestionale';

-- Step 8: Ricrea le policy RLS con il nuovo nome tabella

-- Drop vecchie policy
DROP POLICY IF EXISTS "Tutti possono leggere ordini_cliente" ON public.ordini_interni;
DROP POLICY IF EXISTS "Solo admin e manager possono inserire ordini_cliente" ON public.ordini_interni;
DROP POLICY IF EXISTS "Solo admin e manager possono aggiornare ordini_cliente" ON public.ordini_interni;
DROP POLICY IF EXISTS "Solo admin e manager possono eliminare ordini_cliente" ON public.ordini_interni;

-- Ricrea policy con nuovo nome
CREATE POLICY "Tutti possono leggere ordini_interni"
ON public.ordini_interni
FOR SELECT
USING (true);

CREATE POLICY "Solo admin e manager possono inserire ordini_interni"
ON public.ordini_interni
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
);

CREATE POLICY "Solo admin e manager possono aggiornare ordini_interni"
ON public.ordini_interni
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
);

CREATE POLICY "Solo admin e manager possono eliminare ordini_interni"
ON public.ordini_interni
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'manager')
    )
);

-- Verifica finale
SELECT
    'Tabella rinominata correttamente' AS status,
    count(*) AS numero_ordini_interni
FROM public.ordini_interni;
