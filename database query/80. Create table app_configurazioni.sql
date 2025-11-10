-- =============================================
-- Script: 80. Create table app_configurazioni
-- Descrizione: Tabella per configurazioni generali applicazione
-- Data: 2025-11-10
-- Versione: 1.0.0
-- =============================================

CREATE TABLE IF NOT EXISTS public.app_configurazioni (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Chiave configurazione (univoca)
  chiave TEXT NOT NULL UNIQUE,

  -- Valore configurazione (JSON per flessibilità)
  valore JSONB NOT NULL,

  -- Descrizione configurazione
  descrizione TEXT,

  -- Tracking modifiche
  modificato_da_user_id UUID REFERENCES auth.users(id),

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indici
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_config_chiave
  ON public.app_configurazioni(chiave);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_app_configurazioni_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.modificato_da_user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_app_configurazioni_updated_at ON public.app_configurazioni;
CREATE TRIGGER set_app_configurazioni_updated_at
  BEFORE UPDATE ON public.app_configurazioni
  FOR EACH ROW
  EXECUTE FUNCTION update_app_configurazioni_updated_at();

-- RLS Policies
ALTER TABLE public.app_configurazioni ENABLE ROW LEVEL SECURITY;

-- Admin: accesso completo
CREATE POLICY "Admin full access on app_configurazioni"
  ON public.app_configurazioni FOR ALL
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- Manager: solo lettura
CREATE POLICY "Manager read access on app_configurazioni"
  ON public.app_configurazioni FOR SELECT
  USING (public.get_my_role() = 'manager');

-- User/Head: solo lettura
CREATE POLICY "User read access on app_configurazioni"
  ON public.app_configurazioni FOR SELECT
  USING (public.get_my_role() IN ('head', 'user'));

-- Commenti
COMMENT ON TABLE public.app_configurazioni IS 'Configurazioni generali applicazione (solo admin può modificare)';
COMMENT ON COLUMN public.app_configurazioni.chiave IS 'Chiave univoca configurazione (es: responsabile_mezzi)';
COMMENT ON COLUMN public.app_configurazioni.valore IS 'Valore JSON della configurazione';

-- Seed data iniziale
INSERT INTO public.app_configurazioni (chiave, valore, descrizione)
VALUES (
  'responsabile_mezzi',
  '{"profile_id": null, "nome": null}'::jsonb,
  'Manager responsabile della gestione mezzi e scadenze'
)
ON CONFLICT (chiave) DO NOTHING;

INSERT INTO public.app_configurazioni (chiave, valore, descrizione)
VALUES (
  'soglie_alert_mezzi',
  '{"revisione_giorni": 45, "assicurazione_giorni": 30, "bollo_giorni": 30, "manutenzione_giorni": 15}'::jsonb,
  'Soglie in giorni per alert scadenze mezzi'
)
ON CONFLICT (chiave) DO NOTHING;
