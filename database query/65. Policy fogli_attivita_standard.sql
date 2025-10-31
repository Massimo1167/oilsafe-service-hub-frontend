-- =====================================================
-- Row Level Security Policies per tabella fogli_attivita_standard
-- =====================================================
-- Creata il: 2025-10-30
-- Descrizione: Policies RLS per gestione accessi alla tabella fogli_attivita_standard
--              - Admin/Manager: Full access (possono gestire selezioni nel foglio header)
--              - Head: Read-only
--              - User: Read-only (vedono quali attività sono disponibili per l'intervento)
-- =====================================================

-- Abilita Row Level Security
ALTER TABLE public.fogli_attivita_standard ENABLE ROW LEVEL SECURITY;

-- DROP policies esistenti se presenti
DROP POLICY IF EXISTS "fogli_attivita_select_policy" ON public.fogli_attivita_standard;
DROP POLICY IF EXISTS "fogli_attivita_insert_policy" ON public.fogli_attivita_standard;
DROP POLICY IF EXISTS "fogli_attivita_update_policy" ON public.fogli_attivita_standard;
DROP POLICY IF EXISTS "fogli_attivita_delete_policy" ON public.fogli_attivita_standard;

-- Policy SELECT: Gli utenti possono vedere le attività standard dei fogli che possono vedere
CREATE POLICY "fogli_attivita_select_policy"
  ON public.fogli_attivita_standard
  FOR SELECT
  TO authenticated
  USING (
    -- Può vedere se può vedere il foglio di assistenza collegato
    EXISTS (
      SELECT 1 FROM public.fogli_assistenza
      WHERE fogli_assistenza.id = fogli_attivita_standard.foglio_assistenza_id
    )
  );

-- Policy INSERT: Solo admin e manager possono aggiungere attività ai fogli
CREATE POLICY "fogli_attivita_insert_policy"
  ON public.fogli_attivita_standard
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND LOWER(profiles.role) IN ('admin', 'manager')
    )
  );

-- Policy UPDATE: Solo admin e manager possono modificare (es: cambiare flag obbligatoria)
CREATE POLICY "fogli_attivita_update_policy"
  ON public.fogli_attivita_standard
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND LOWER(profiles.role) IN ('admin', 'manager')
    )
  );

-- Policy DELETE: Solo admin e manager possono rimuovere attività dai fogli
CREATE POLICY "fogli_attivita_delete_policy"
  ON public.fogli_attivita_standard
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND LOWER(profiles.role) IN ('admin', 'manager')
    )
  );

-- Verifica
DO $$
BEGIN
  RAISE NOTICE 'Row Level Security abilitata per tabella fogli_attivita_standard';
  RAISE NOTICE 'Policy SELECT: Utenti che possono vedere il foglio collegato';
  RAISE NOTICE 'Policy INSERT/UPDATE/DELETE: Solo admin e manager';
END $$;
