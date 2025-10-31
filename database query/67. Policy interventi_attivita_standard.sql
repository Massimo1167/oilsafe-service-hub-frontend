-- =====================================================
-- Row Level Security Policies per tabella interventi_attivita_standard
-- =====================================================
-- Creata il: 2025-10-30
-- Descrizione: Policies RLS per gestione accessi alla tabella interventi_attivita_standard
--              - Admin: Full access
--              - Manager: Full access
--              - Head: Read-only
--              - User: CRUD su interventi dei propri fogli o dove è il tecnico assegnato
-- =====================================================

-- Abilita Row Level Security
ALTER TABLE public.interventi_attivita_standard ENABLE ROW LEVEL SECURITY;

-- DROP policies esistenti se presenti
DROP POLICY IF EXISTS "interventi_attivita_select_policy" ON public.interventi_attivita_standard;
DROP POLICY IF EXISTS "interventi_attivita_insert_policy" ON public.interventi_attivita_standard;
DROP POLICY IF EXISTS "interventi_attivita_update_policy" ON public.interventi_attivita_standard;
DROP POLICY IF EXISTS "interventi_attivita_delete_policy" ON public.interventi_attivita_standard;

-- Policy SELECT: Può vedere se può vedere l'intervento collegato
CREATE POLICY "interventi_attivita_select_policy"
  ON public.interventi_attivita_standard
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interventi_assistenza
      WHERE interventi_assistenza.id = interventi_attivita_standard.intervento_assistenza_id
    )
  );

-- Policy INSERT: Admin, Manager, o User che può modificare l'intervento
CREATE POLICY "interventi_attivita_insert_policy"
  ON public.interventi_attivita_standard
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND LOWER(profiles.role) IN ('admin', 'manager')
    )
    OR
    -- User può inserire se può modificare l'intervento collegato
    EXISTS (
      SELECT 1 FROM public.interventi_assistenza ia
      JOIN public.fogli_assistenza fa ON fa.id = ia.foglio_assistenza_id
      JOIN public.tecnici t ON t.id = ia.tecnico_id
      WHERE ia.id = interventi_attivita_standard.intervento_assistenza_id
      AND (
        fa.creato_da_user_id = auth.uid()
        OR fa.assegnato_a_user_id = auth.uid()
        OR t.user_id = auth.uid()
      )
    )
  );

-- Policy UPDATE: Admin, Manager, o User proprietario
CREATE POLICY "interventi_attivita_update_policy"
  ON public.interventi_attivita_standard
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND LOWER(profiles.role) IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.interventi_assistenza ia
      JOIN public.fogli_assistenza fa ON fa.id = ia.foglio_assistenza_id
      JOIN public.tecnici t ON t.id = ia.tecnico_id
      WHERE ia.id = interventi_attivita_standard.intervento_assistenza_id
      AND (
        fa.creato_da_user_id = auth.uid()
        OR fa.assegnato_a_user_id = auth.uid()
        OR t.user_id = auth.uid()
      )
    )
  );

-- Policy DELETE: Admin, Manager, o User proprietario
CREATE POLICY "interventi_attivita_delete_policy"
  ON public.interventi_attivita_standard
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND LOWER(profiles.role) IN ('admin', 'manager')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.interventi_assistenza ia
      JOIN public.fogli_assistenza fa ON fa.id = ia.foglio_assistenza_id
      JOIN public.tecnici t ON t.id = ia.tecnico_id
      WHERE ia.id = interventi_attivita_standard.intervento_assistenza_id
      AND (
        fa.creato_da_user_id = auth.uid()
        OR fa.assegnato_a_user_id = auth.uid()
        OR t.user_id = auth.uid()
      )
    )
  );

-- Verifica
DO $$
BEGIN
  RAISE NOTICE 'Row Level Security abilitata per tabella interventi_attivita_standard';
  RAISE NOTICE 'Policy SELECT: Utenti che possono vedere l''intervento collegato';
  RAISE NOTICE 'Policy INSERT/UPDATE/DELETE: Admin, Manager, o User proprietario dell''intervento';
END $$;
