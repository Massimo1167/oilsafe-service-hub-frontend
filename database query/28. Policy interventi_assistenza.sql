-- Assumi che fogli_assistenza abbia la colonna creato_da_user_id
-- e che tu possa fare un JOIN o usare una subquery per controllare il proprietario del foglio padre.

ALTER TABLE public.interventi_assistenza ENABLE ROW LEVEL SECURITY;
-- Rimuovi vecchie policy generiche...

-- ADMIN: tutti i permessi
DROP POLICY IF EXISTS "Admin full access on interventi_assistenza" ON public.interventi_assistenza;
CREATE POLICY "Admin full access on interventi_assistenza"
  ON public.interventi_assistenza FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- MANAGER: visualizzare e modificare i fogli di lavoro di tutti
DROP POLICY IF EXISTS "Manager read all interventi_assistenza" ON public.interventi_assistenza;
CREATE POLICY "Manager read all interventi_assistenza"
  ON public.interventi_assistenza FOR SELECT
  USING (public.get_my_role() = 'manager');

DROP POLICY IF EXISTS "Manager update all interventi_assistenza" ON public.interventi_assistenza;
CREATE POLICY "Manager update all interventi_assistenza"
  ON public.interventi_assistenza FOR UPDATE
  USING (public.get_my_role() = 'manager')
  WITH CHECK (public.get_my_role() = 'manager');
-- Nota: Il manager non ha INSERT o DELETE su interventi_assistenza secondo la tua definizione iniziale.


-- HEAD: visualizzare gli interventi di tutti i fogli
DROP POLICY IF EXISTS "Head read all interventi_assistenza" ON public.interventi_assistenza;
CREATE POLICY "Head read all interventi_assistenza"
  ON public.interventi_assistenza FOR SELECT
  USING (public.get_my_role() = 'head');

-- USER: creare, cancellare, modificare interventi SUI PROPRI fogli di lavoro
-- Per SELECT, UPDATE, DELETE: l'utente può operare su un intervento se il foglio_assistenza_id
-- corrisponde a un foglio creato da lui.
DROP POLICY IF EXISTS "User CRUD on own interventi_assistenza for select" ON public.interventi_assistenza;
CREATE POLICY "User CRUD on own interventi_assistenza for select"
  ON public.interventi_assistenza FOR SELECT
  USING (
    public.get_my_role() = 'user' AND
    (
      EXISTS (
        SELECT 1 FROM public.fogli_assistenza fa
        WHERE fa.id = interventi_assistenza.foglio_assistenza_id AND fa.creato_da_user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.tecnici t
        WHERE t.id = interventi_assistenza.tecnico_id
          AND LOWER(t.email) = LOWER(current_setting('request.jwt.claims', true)::json->>'email')
      )
    )
  );

DROP POLICY IF EXISTS "User CRUD on own interventi_assistenza for update" ON public.interventi_assistenza;
CREATE POLICY "User CRUD on own interventi_assistenza for update"
  ON public.interventi_assistenza FOR UPDATE
  USING (
    public.get_my_role() = 'user' AND
    (
      EXISTS (
        SELECT 1 FROM public.fogli_assistenza fa
        WHERE fa.id = interventi_assistenza.foglio_assistenza_id AND fa.creato_da_user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.tecnici t
        WHERE t.id = interventi_assistenza.tecnico_id
          AND LOWER(t.email) = LOWER(current_setting('request.jwt.claims', true)::json->>'email')
      )
    )
  );

DROP POLICY IF EXISTS "User CRUD on own interventi_assistenza for delete" ON public.interventi_assistenza;
CREATE POLICY "User CRUD on own interventi_assistenza for delete"
  ON public.interventi_assistenza FOR DELETE
  USING (
    public.get_my_role() = 'user' AND
    (
      EXISTS (
        SELECT 1 FROM public.fogli_assistenza fa
        WHERE fa.id = interventi_assistenza.foglio_assistenza_id AND fa.creato_da_user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.tecnici t
        WHERE t.id = interventi_assistenza.tecnico_id
          AND LOWER(t.email) = LOWER(current_setting('request.jwt.claims', true)::json->>'email')
      )
    )
  );


-- Per INSERT: l'utente può inserire un intervento se il foglio_assistenza_id
-- corrisponde a un foglio creato da lui.
DROP POLICY IF EXISTS "User CRUD on own interventi_assistenza for insert" ON public.interventi_assistenza;
CREATE POLICY "User CRUD on own interventi_assistenza for insert"
  ON public.interventi_assistenza FOR INSERT
  WITH CHECK (
    public.get_my_role() = 'user' AND
    (
      EXISTS (
        SELECT 1 FROM public.fogli_assistenza fa
        WHERE fa.id = interventi_assistenza.foglio_assistenza_id AND fa.creato_da_user_id = auth.uid()
      ) OR
      EXISTS (
        SELECT 1 FROM public.tecnici t
        WHERE t.id = interventi_assistenza.tecnico_id
          AND LOWER(t.email) = LOWER(current_setting('request.jwt.claims', true)::json->>'email')
      )
    )
  );