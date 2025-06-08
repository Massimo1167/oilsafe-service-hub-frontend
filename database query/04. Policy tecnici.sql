ALTER TABLE public.tecnici ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin full access on tecnici" ON public.tecnici;
DROP POLICY IF EXISTS "Manager insert access on tecnici" ON public.tecnici;
DROP POLICY IF EXISTS "Manager update access on tecnici" ON public.tecnici;
DROP POLICY IF EXISTS "Manager delete access on tecnici" ON public.tecnici;
DROP POLICY IF EXISTS "Head and User read access on tecnici" ON public.tecnici;

-- ADMIN
CREATE POLICY "Admin full access on tecnici"
  ON public.tecnici FOR ALL USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

-- MANAGER
CREATE POLICY "Manager insert access on tecnici"
  ON public.tecnici FOR INSERT WITH CHECK (public.get_my_role() = 'manager');
CREATE POLICY "Manager update access on tecnici"
  ON public.tecnici FOR UPDATE USING (public.get_my_role() = 'manager') WITH CHECK (public.get_my_role() = 'manager');
CREATE POLICY "Manager delete access on tecnici"
  ON public.tecnici FOR DELETE USING (public.get_my_role() = 'manager');

-- HEAD & USER
CREATE POLICY "Head and User read access on tecnici"
  ON public.tecnici FOR SELECT USING (public.get_my_role() IN ('manager', 'head', 'user'));