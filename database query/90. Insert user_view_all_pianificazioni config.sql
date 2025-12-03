-- =====================================================
-- Configurazione Visibilità Pianificazioni per User
-- =====================================================
-- Aggiunge una nuova configurazione globale che controlla
-- se gli utenti con ruolo 'user' possono vedere tutte
-- le pianificazioni o solo quelle dove sono assegnati.
--
-- Valori possibili:
--   {"abilitato": true}  - User vedono TUTTE le pianificazioni
--   {"abilitato": false} - User vedono SOLO le proprie pianificazioni
--
-- Default: true (user vedono tutte le pianificazioni)
-- =====================================================

-- Inserimento nuova configurazione per visibilità pianificazioni user
INSERT INTO public.app_configurazioni (chiave, valore, descrizione)
VALUES (
  'user_visualizza_tutte_pianificazioni',
  '{"abilitato": true}'::jsonb,
  'Se true, gli utenti con ruolo user possono vedere tutte le pianificazioni. Se false, vedono solo le proprie (filtro automatico per tecnico_id)'
)
ON CONFLICT (chiave) DO UPDATE
  SET valore = EXCLUDED.valore,
      descrizione = EXCLUDED.descrizione,
      updated_at = now();

-- Verifica inserimento
SELECT chiave, valore, descrizione, created_at, updated_at
FROM public.app_configurazioni
WHERE chiave = 'user_visualizza_tutte_pianificazioni';
