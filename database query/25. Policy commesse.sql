-- Assicurati che RLS sia abilitata e rimuovi le vecchie policy generiche se presenti
ALTER TABLE public.commesse ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access on commesse" ON public.commesse;
DROP POLICY IF EXISTS "Manager CUD access on commesse for insert" ON public.commesse;
DROP POLICY IF EXISTS "Manager CUD access on commesse for update" ON public.commesse; -- Separata
DROP POLICY IF EXISTS "Manager CUD access on commesse for delete" ON public.commesse; -- Separata
DROP POLICY IF EXISTS "Head and User read access on commesse" ON public.commesse;


-- ADMIN: tutti i permessi
CREATE POLICY "Admin full access on commesse"
  ON public.commesse
  FOR ALL -- Copre SELECT, INSERT, UPDATE, DELETE
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');


-- MANAGER:
-- Permesso di INSERIMENTO per Manager
CREATE POLICY "Manager insert access on commesse"
  ON public.commesse
  FOR INSERT
  WITH CHECK (public.get_my_role() = 'manager');

-- Permesso di AGGIORNAMENTO per Manager
CREATE POLICY "Manager update access on commesse"
  ON public.commesse
  FOR UPDATE
  USING (public.get_my_role() = 'manager') -- Condizione per QUALI righe può aggiornare (tutte in questo caso)
  WITH CHECK (public.get_my_role() = 'manager'); -- Condizione sui NUOVI dati (non strettamente necessaria qui se USING è sufficiente)

-- Permesso di CANCELLAZIONE per Manager
CREATE POLICY "Manager delete access on commesse"
  ON public.commesse
  FOR DELETE
  USING (public.get_my_role() = 'manager'); -- Condizione per QUALI righe può cancellare (tutte in questo caso)


-- HEAD & USER: solo visualizzazione (SELECT)
CREATE POLICY "Head and User read access on commesse"
  ON public.commesse
  FOR SELECT
  USING (public.get_my_role() IN ('manager', 'head', 'user')); -- Manager può anche leggere tramite questa