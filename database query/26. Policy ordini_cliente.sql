-- Assicurati che RLS sia abilitata e rimuovi le vecchie policy generiche se presenti
ALTER TABLE public.ordini_cliente ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access on ordini_cliente" ON public.ordini_cliente;
DROP POLICY IF EXISTS "Manager CUD access on ordini_cliente for insert" ON public.ordini_cliente;
DROP POLICY IF EXISTS "Manager CUD access on ordini_cliente for update" ON public.ordini_cliente; -- Separata
DROP POLICY IF EXISTS "Manager CUD access on ordini_cliente for delete" ON public.ordini_cliente; -- Separata
DROP POLICY IF EXISTS "Head and User read access on ordini_cliente" ON public.ordini_cliente;


-- ADMIN: tutti i permessi
CREATE POLICY "Admin full access on ordini_cliente"
  ON public.ordini_cliente
  FOR ALL -- Copre SELECT, INSERT, UPDATE, DELETE
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');


-- MANAGER:
-- Permesso di INSERIMENTO per Manager
CREATE POLICY "Manager insert access on ordini_cliente"
  ON public.ordini_cliente
  FOR INSERT
  WITH CHECK (public.get_my_role() = 'manager');

-- Permesso di AGGIORNAMENTO per Manager
CREATE POLICY "Manager update access on ordini_cliente"
  ON public.ordini_cliente
  FOR UPDATE
  USING (public.get_my_role() = 'manager') -- Condizione per QUALI righe può aggiornare (tutte in questo caso)
  WITH CHECK (public.get_my_role() = 'manager'); -- Condizione sui NUOVI dati (non strettamente necessaria qui se USING è sufficiente)

-- Permesso di CANCELLAZIONE per Manager
CREATE POLICY "Manager delete access on ordini_cliente"
  ON public.ordini_cliente
  FOR DELETE
  USING (public.get_my_role() = 'manager'); -- Condizione per QUALI righe può cancellare (tutte in questo caso)


-- HEAD & USER: solo visualizzazione (SELECT)
CREATE POLICY "Head and User read access on ordini_cliente"
  ON public.ordini_cliente
  FOR SELECT
  USING (public.get_my_role() IN ('manager', 'head', 'user')); -- Manager può anche leggere tramite questa