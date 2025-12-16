-- =====================================================
-- Row Level Security Policies per attivita_standard_aziendali
-- =====================================================
-- Creata il: 2025-12-15
-- Descrizione: Policies RLS per gestire permessi su listino prezzi aziendale.
--              SELECT: Tutti gli utenti autenticati possono leggere
--              INSERT/UPDATE/DELETE: Solo admin e manager
-- =====================================================

-- Abilita Row Level Security
ALTER TABLE public.attivita_standard_aziendali ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Policy SELECT: Tutti gli utenti autenticati possono leggere
-- =====================================================
CREATE POLICY "attivita_aziendale_select_policy"
  ON public.attivita_standard_aziendali
  FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- Policy INSERT: Solo admin e manager possono inserire
-- =====================================================
CREATE POLICY "attivita_aziendale_insert_policy"
  ON public.attivita_standard_aziendali
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND LOWER(profiles.role) IN ('admin', 'manager')
    )
  );

-- =====================================================
-- Policy UPDATE: Solo admin e manager possono modificare
-- =====================================================
CREATE POLICY "attivita_aziendale_update_policy"
  ON public.attivita_standard_aziendali
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND LOWER(profiles.role) IN ('admin', 'manager')
    )
  );

-- =====================================================
-- Policy DELETE: Solo admin e manager possono eliminare
-- =====================================================
CREATE POLICY "attivita_aziendale_delete_policy"
  ON public.attivita_standard_aziendali
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND LOWER(profiles.role) IN ('admin', 'manager')
    )
  );

-- Commenti
COMMENT ON POLICY "attivita_aziendale_select_policy" ON public.attivita_standard_aziendali IS
  'Tutti gli utenti autenticati possono leggere il listino prezzi aziendale';

COMMENT ON POLICY "attivita_aziendale_insert_policy" ON public.attivita_standard_aziendali IS
  'Solo admin e manager possono creare nuove attività aziendali';

COMMENT ON POLICY "attivita_aziendale_update_policy" ON public.attivita_standard_aziendali IS
  'Solo admin e manager possono modificare attività aziendali esistenti';

COMMENT ON POLICY "attivita_aziendale_delete_policy" ON public.attivita_standard_aziendali IS
  'Solo admin e manager possono eliminare attività aziendali';

-- Verifica finale
DO $$
BEGIN
  RAISE NOTICE '✅ RLS abilitata su attivita_standard_aziendali';
  RAISE NOTICE '👁️  SELECT: Tutti gli utenti autenticati';
  RAISE NOTICE '✏️  INSERT/UPDATE/DELETE: Solo admin e manager';
  RAISE NOTICE '🔒 Policies allineate a attivita_standard_clienti';
END $$;
