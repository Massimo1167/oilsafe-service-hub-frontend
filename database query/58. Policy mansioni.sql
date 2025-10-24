-- =====================================================
-- RLS Policies per tabella mansioni
-- =====================================================
-- Creata il: 2025-10-24
-- Descrizione: Politiche di sicurezza Row Level Security
--              per la gestione delle mansioni/qualifiche.
--              Solo admin/manager possono modificare,
--              tutti gli utenti autenticati possono consultare.
-- =====================================================

-- Abilita RLS sulla tabella mansioni
ALTER TABLE public.mansioni ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICY: SELECT - Tutti gli utenti autenticati possono leggere
-- =====================================================
DROP POLICY IF EXISTS "Tutti possono leggere mansioni" ON public.mansioni;

CREATE POLICY "Tutti possono leggere mansioni"
ON public.mansioni
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- POLICY: INSERT - Solo admin e manager possono inserire
-- =====================================================
DROP POLICY IF EXISTS "Solo admin e manager possono inserire mansioni" ON public.mansioni;

CREATE POLICY "Solo admin e manager possono inserire mansioni"
ON public.mansioni
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- =====================================================
-- POLICY: UPDATE - Solo admin e manager possono modificare
-- =====================================================
DROP POLICY IF EXISTS "Solo admin e manager possono modificare mansioni" ON public.mansioni;

CREATE POLICY "Solo admin e manager possono modificare mansioni"
ON public.mansioni
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

-- =====================================================
-- POLICY: DELETE - Solo admin può eliminare
-- =====================================================
DROP POLICY IF EXISTS "Solo admin può eliminare mansioni" ON public.mansioni;

CREATE POLICY "Solo admin può eliminare mansioni"
ON public.mansioni
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- =====================================================
-- Commenti per documentazione
-- =====================================================
COMMENT ON POLICY "Tutti possono leggere mansioni" ON public.mansioni
IS 'Tutti gli utenti autenticati possono consultare le mansioni per selezionarle nei form';

COMMENT ON POLICY "Solo admin e manager possono inserire mansioni" ON public.mansioni
IS 'Solo amministratori e manager possono creare nuove mansioni';

COMMENT ON POLICY "Solo admin e manager possono modificare mansioni" ON public.mansioni
IS 'Solo amministratori e manager possono modificare i costi e i dettagli delle mansioni';

COMMENT ON POLICY "Solo admin può eliminare mansioni" ON public.mansioni
IS 'Solo amministratori possono eliminare mansioni (sconsigliato, preferire flag attivo=false)';
