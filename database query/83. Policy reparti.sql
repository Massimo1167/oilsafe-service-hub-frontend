-- =====================================================
-- RLS Policies per tabella reparti
-- =====================================================
-- Creata il: 2025-01-16
-- Descrizione: Politiche di sicurezza Row Level Security
--              per la gestione dei reparti.
--              Solo admin/manager possono modificare,
--              tutti gli utenti autenticati possono consultare.
-- =====================================================

ALTER TABLE public.reparti ENABLE ROW LEVEL SECURITY;

-- POLICY: SELECT - Tutti gli utenti autenticati possono leggere
DROP POLICY IF EXISTS "Tutti possono leggere reparti" ON public.reparti;
CREATE POLICY "Tutti possono leggere reparti"
ON public.reparti
FOR SELECT
TO authenticated
USING (true);

-- POLICY: INSERT - Solo admin e manager possono inserire
DROP POLICY IF EXISTS "Solo admin e manager possono inserire reparti" ON public.reparti;
CREATE POLICY "Solo admin e manager possono inserire reparti"
ON public.reparti
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- POLICY: UPDATE - Solo admin e manager possono modificare
DROP POLICY IF EXISTS "Solo admin e manager possono modificare reparti" ON public.reparti;
CREATE POLICY "Solo admin e manager possono modificare reparti"
ON public.reparti
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- POLICY: DELETE - Solo admin può eliminare
DROP POLICY IF EXISTS "Solo admin può eliminare reparti" ON public.reparti;
CREATE POLICY "Solo admin può eliminare reparti"
ON public.reparti
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
