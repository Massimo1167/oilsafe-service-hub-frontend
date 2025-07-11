-- Prima aggiungi la colonna se non esiste:
-- ALTER TABLE public.fogli_assistenza ADD COLUMN creato_da_user_id UUID REFERENCES auth.users(id);
-- Considera di popolarla per i record esistenti o di renderla nullable se non vuoi forzarla subito

ALTER TABLE public.fogli_assistenza ENABLE ROW LEVEL SECURITY;
-- Rimuovi vecchie policy generiche...

-- ADMIN: tutti i permessi
DROP POLICY IF EXISTS "Admin full access on fogli_assistenza" ON public.fogli_assistenza;
CREATE POLICY "Admin full access on fogli_assistenza"
  ON public.fogli_assistenza FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- MANAGER: visualizzare e modificare i fogli di lavoro di tutti
DROP POLICY IF EXISTS "Manager read all fogli_assistenza" ON public.fogli_assistenza;
--CREATE POLICY "Manager read all fogli_assistenza"
--  ON public.fogli_assistenza FOR SELECT
--  USING (public.get_my_role() = 'manager');

DROP POLICY IF EXISTS "Manager update all fogli_assistenza" ON public.fogli_assistenza;
--CREATE POLICY "Manager update all fogli_assistenza"
--  ON public.fogli_assistenza FOR UPDATE
--  USING (public.get_my_role() = 'manager')
--  WITH CHECK (public.get_my_role() = 'manager');

-- Nota: Il manager non ha DELETE su fogli_assistenza secondo la tua definizione iniziale.
-- adesso ho assegnato tutti i permessi anche a manager perchè sono aumentate le mansioni
-- MANAGER: tutti i permessi
DROP POLICY IF EXISTS "Manager full access on fogli_assistenza" ON public.fogli_assistenza;
CREATE POLICY "Manager full access on fogli_assistenza"
  ON public.fogli_assistenza FOR ALL
  USING (public.get_my_role() = 'manager')
  WITH CHECK (public.get_my_role() = 'manager');

-- HEAD: visualizzare i fogli di lavoro di tutti
DROP POLICY IF EXISTS "Head read all fogli_assistenza" ON public.fogli_assistenza;
CREATE POLICY "Head read all fogli_assistenza"
  ON public.fogli_assistenza FOR SELECT
  USING (public.get_my_role() = 'head');

-- USER: creare, cancellare, modificare i fogli di lavoro personali
-- E visualizzare solo i propri
DROP POLICY IF EXISTS "User CRUD on own fogli_assistenza for insert" ON public.fogli_assistenza;
CREATE POLICY "User CRUD on own fogli_assistenza for insert"
  ON public.fogli_assistenza FOR INSERT
  WITH CHECK (
    (
      public.get_my_role() = 'user' AND auth.uid() = creato_da_user_id
    ) OR
    public.get_my_role() = 'manager'
  );
  -- Quando un 'user' inserisce, il 'creato_da_user_id' DEVE essere il suo auth.uid()

DROP POLICY IF EXISTS "User CRUD on own fogli_assistenza for select" ON public.fogli_assistenza;
CREATE POLICY "User CRUD on own fogli_assistenza for select"
  ON public.fogli_assistenza FOR SELECT
  USING (
    public.get_my_role() = 'user' AND (
      auth.uid() = creato_da_user_id OR
      auth.uid() = assegnato_a_user_id
    )
  );
  -- Per update, il check implicito è che l'utente stia modificando un record che già vede (quindi il suo)
  
DROP POLICY IF EXISTS "User CRUD on own fogli_assistenza for update" ON public.fogli_assistenza;
CREATE POLICY "User CRUD on own fogli_assistenza for update"
  ON public.fogli_assistenza FOR UPDATE
  USING (
    public.get_my_role() = 'user' AND (
      auth.uid() = creato_da_user_id OR
      auth.uid() = assegnato_a_user_id
    )
  );
  -- Per update, il check implicito è che l'utente stia modificando un record che già vede (quindi il suo)

DROP POLICY IF EXISTS "User CRUD on own fogli_assistenza for delete" ON public.fogli_assistenza;
CREATE POLICY "User CRUD on own fogli_assistenza for delete"
  ON public.fogli_assistenza FOR DELETE
  USING (public.get_my_role() = 'user' AND auth.uid() = creato_da_user_id);
  -- Per update, il check implicito è che l'utente stia modificando un record che già vede (quindi il suo)