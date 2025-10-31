-- =====================================================
-- RLS Policies per tabella unita_misura
-- =====================================================
-- Creata il: 2025-10-31
-- Descrizione: Politiche di sicurezza Row Level Security
--              per la gestione delle unità di misura.
--              Solo admin/manager possono modificare,
--              tutti gli utenti autenticati possono consultare.
-- =====================================================

-- Abilita RLS sulla tabella unita_misura
ALTER TABLE public.unita_misura ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLICY: SELECT - Tutti gli utenti autenticati possono leggere
-- =====================================================
DROP POLICY IF EXISTS "Tutti possono leggere unita_misura" ON public.unita_misura;

CREATE POLICY "Tutti possono leggere unita_misura"
ON public.unita_misura
FOR SELECT
TO authenticated
USING (true);

-- =====================================================
-- POLICY: INSERT - Solo admin e manager possono inserire
-- =====================================================
DROP POLICY IF EXISTS "Solo admin e manager possono inserire unita_misura" ON public.unita_misura;

CREATE POLICY "Solo admin e manager possono inserire unita_misura"
ON public.unita_misura
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
DROP POLICY IF EXISTS "Solo admin e manager possono modificare unita_misura" ON public.unita_misura;

CREATE POLICY "Solo admin e manager possono modificare unita_misura"
ON public.unita_misura
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
-- POLICY: DELETE - Solo admin e manager possono eliminare
-- =====================================================
DROP POLICY IF EXISTS "Solo admin e manager possono eliminare unita_misura" ON public.unita_misura;

CREATE POLICY "Solo admin e manager possono eliminare unita_misura"
ON public.unita_misura
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'manager')
  )
);

-- =====================================================
-- Commenti per documentazione
-- =====================================================
COMMENT ON POLICY "Tutti possono leggere unita_misura" ON public.unita_misura
IS 'Tutti gli utenti autenticati possono consultare le unità di misura per selezionarle nei form';

COMMENT ON POLICY "Solo admin e manager possono inserire unita_misura" ON public.unita_misura
IS 'Solo amministratori e manager possono creare nuove unità di misura';

COMMENT ON POLICY "Solo admin e manager possono modificare unita_misura" ON public.unita_misura
IS 'Solo amministratori e manager possono modificare le unità di misura';

COMMENT ON POLICY "Solo admin e manager possono eliminare unita_misura" ON public.unita_misura
IS 'Solo amministratori e manager possono eliminare unità di misura (verificare che non siano in uso prima dell''eliminazione)';
