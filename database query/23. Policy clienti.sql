-- Assicurati che RLS sia abilitata e rimuovi le vecchie policy generiche se presenti
ALTER TABLE public.clienti ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access on clienti" ON public.clienti;
DROP POLICY IF EXISTS "Manager CUD access on clienti for insert" ON public.clienti;
DROP POLICY IF EXISTS "Manager CUD access on clienti for update" ON public.clienti; -- Separata
DROP POLICY IF EXISTS "Manager CUD access on clienti for delete" ON public.clienti; -- Separata
DROP POLICY IF EXISTS "Head and User read access on clienti" ON public.clienti;


-- ADMIN: tutti i permessi
CREATE POLICY "Admin full access on clienti"
  ON public.clienti
  FOR ALL -- Copre SELECT, INSERT, UPDATE, DELETE
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');


-- MANAGER:
-- Permesso di INSERIMENTO per Manager
CREATE POLICY "Manager insert access on clienti"
  ON public.clienti
  FOR INSERT
  WITH CHECK (public.get_my_role() = 'manager');

-- Permesso di AGGIORNAMENTO per Manager
CREATE POLICY "Manager update access on clienti"
  ON public.clienti
  FOR UPDATE
  USING (public.get_my_role() = 'manager') -- Condizione per QUALI righe può aggiornare (tutte in questo caso)
  WITH CHECK (public.get_my_role() = 'manager'); -- Condizione sui NUOVI dati (non strettamente necessaria qui se USING è sufficiente)

-- Permesso di CANCELLAZIONE per Manager
CREATE POLICY "Manager delete access on clienti"
  ON public.clienti
  FOR DELETE
  USING (public.get_my_role() = 'manager'); -- Condizione per QUALI righe può cancellare (tutte in questo caso)


-- HEAD & USER: solo visualizzazione (SELECT)
CREATE POLICY "Head and User read access on clienti"
  ON public.clienti
  FOR SELECT
  USING (public.get_my_role() IN ('manager', 'head', 'user')); -- Manager può anche leggere tramite questa