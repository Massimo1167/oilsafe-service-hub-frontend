-- =====================================================
-- Row Level Security Policies per tabella attivita_standard_clienti
-- =====================================================
-- Creata il: 2025-10-30
-- Descrizione: Policies RLS per gestione accessi alla tabella attivita_standard_clienti
--              - Admin: Full access (SELECT, INSERT, UPDATE, DELETE)
--              - Manager: Full access (SELECT, INSERT, UPDATE, DELETE)
--              - Head: Read-only (SELECT)
--              - User: Read-only (SELECT)
-- =====================================================

-- Abilita Row Level Security
ALTER TABLE public.attivita_standard_clienti ENABLE ROW LEVEL SECURITY;

-- DROP policies esistenti se presenti (per re-run sicuro)
DROP POLICY IF EXISTS "attivita_standard_select_policy" ON public.attivita_standard_clienti;
DROP POLICY IF EXISTS "attivita_standard_insert_policy" ON public.attivita_standard_clienti;
DROP POLICY IF EXISTS "attivita_standard_update_policy" ON public.attivita_standard_clienti;
DROP POLICY IF EXISTS "attivita_standard_delete_policy" ON public.attivita_standard_clienti;

-- Policy SELECT: Tutti gli utenti autenticati possono vedere le attività standard
CREATE POLICY "attivita_standard_select_policy"
  ON public.attivita_standard_clienti
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy INSERT: Solo admin e manager possono creare attività standard
CREATE POLICY "attivita_standard_insert_policy"
  ON public.attivita_standard_clienti
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND LOWER(profiles.role) IN ('admin', 'manager')
    )
  );

-- Policy UPDATE: Solo admin e manager possono modificare attività standard
CREATE POLICY "attivita_standard_update_policy"
  ON public.attivita_standard_clienti
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND LOWER(profiles.role) IN ('admin', 'manager')
    )
  );

-- Policy DELETE: Solo admin e manager possono eliminare attività standard
CREATE POLICY "attivita_standard_delete_policy"
  ON public.attivita_standard_clienti
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND LOWER(profiles.role) IN ('admin', 'manager')
    )
  );

-- Verifica che le policies siano attive
DO $$
BEGIN
  RAISE NOTICE 'Row Level Security abilitata per tabella attivita_standard_clienti';
  RAISE NOTICE 'Policy SELECT: Tutti gli utenti autenticati';
  RAISE NOTICE 'Policy INSERT/UPDATE/DELETE: Solo admin e manager';
END $$;
