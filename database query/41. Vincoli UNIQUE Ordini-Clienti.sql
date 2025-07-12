-- Per ordini_cliente (numero_ordine_cliente, cliente_id)
-- L'unicità va garantita dalla combinazione del codice ordine con il cliente
-- in modo da permettere lo stesso numero per clienti differenti.
ALTER TABLE public.ordini_cliente
    DROP CONSTRAINT IF EXISTS ordini_cliente_numero_ordine_cliente_unique;
ALTER TABLE public.ordini_cliente
    ADD CONSTRAINT ordini_cliente_numero_ordine_cliente_unique
        UNIQUE (numero_ordine_cliente, cliente_id);
