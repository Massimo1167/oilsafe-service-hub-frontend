-- =====================================================
-- Seed Data per tabella mansioni
-- =====================================================
-- Creata il: 2025-10-24
-- Descrizione: Dati iniziali per 13 mansioni/qualifiche predefinite
--              con costi orari differenziati per tipo orario e ubicazione.
--              I costi sono indicativi e devono essere adattati alla realtà aziendale.
-- =====================================================

-- NOTA: I valori dei costi qui riportati sono puramente indicativi.
-- Devono essere sostituiti con i valori reali del listino aziendale.
-- Convenzione costi: normale < straordinario < festivo < straordinario festivo
--                    sede < trasferta (maggiorazione ~20-30%)

-- =====================================================
-- 1. OPERAIO GENERICO
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Operaio Generico',
  'Operaio generico per attività di supporto e manutenzione ordinaria',
  'generico',
  'operaio',
  25.00,   -- normale sede
  30.00,   -- normale trasferta
  32.50,   -- straordinario sede
  39.00,   -- straordinario trasferta
  37.50,   -- festivo sede
  45.00,   -- festivo trasferta
  43.75,   -- straordinario festivo sede
  52.50,   -- straordinario festivo trasferta
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- 2. CARPENTIERE JUNIOR
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Carpentiere Junior',
  'Carpentiere con esperienza fino a 3 anni',
  'junior',
  'carpentiere',
  30.00,
  36.00,
  39.00,
  46.80,
  45.00,
  54.00,
  52.50,
  63.00,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- 3. CARPENTIERE SENIOR
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Carpentiere Senior',
  'Carpentiere esperto con oltre 5 anni di esperienza',
  'senior',
  'carpentiere',
  40.00,
  48.00,
  52.00,
  62.40,
  60.00,
  72.00,
  70.00,
  84.00,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- 4. OLEODINAMICO JUNIOR
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Oleodinamico Junior',
  'Tecnico oleodinamico con esperienza fino a 3 anni',
  'junior',
  'oleodinamico',
  32.00,
  38.40,
  41.60,
  49.92,
  48.00,
  57.60,
  56.00,
  67.20,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- 5. OLEODINAMICO SENIOR
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Oleodinamico Senior',
  'Tecnico oleodinamico esperto con oltre 5 anni di esperienza',
  'senior',
  'oleodinamico',
  42.00,
  50.40,
  54.60,
  65.52,
  63.00,
  75.60,
  73.50,
  88.20,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- 6. MECCANICO JUNIOR
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Meccanico Junior',
  'Meccanico con esperienza fino a 3 anni',
  'junior',
  'meccanico',
  30.00,
  36.00,
  39.00,
  46.80,
  45.00,
  54.00,
  52.50,
  63.00,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- 7. MECCANICO SENIOR
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Meccanico Senior',
  'Meccanico esperto con oltre 5 anni di esperienza',
  'senior',
  'meccanico',
  40.00,
  48.00,
  52.00,
  62.40,
  60.00,
  72.00,
  70.00,
  84.00,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- 8. ELETTRICISTA JUNIOR
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Elettricista Junior',
  'Elettricista con esperienza fino a 3 anni',
  'junior',
  'elettricista',
  32.00,
  38.40,
  41.60,
  49.92,
  48.00,
  57.60,
  56.00,
  67.20,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- 9. ELETTRICISTA SENIOR
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Elettricista Senior',
  'Elettricista esperto con oltre 5 anni di esperienza',
  'senior',
  'elettricista',
  42.00,
  50.40,
  54.60,
  65.52,
  63.00,
  75.60,
  73.50,
  88.20,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- 10. SOFTWARISTA JUNIOR
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Softwarista Junior',
  'Sviluppatore software e programmatore PLC con esperienza fino a 3 anni',
  'junior',
  'softwarista',
  35.00,
  42.00,
  45.50,
  54.60,
  52.50,
  63.00,
  61.25,
  73.50,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- 11. SOFTWARISTA SENIOR
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Softwarista Senior',
  'Sviluppatore software e programmatore PLC esperto con oltre 5 anni di esperienza',
  'senior',
  'softwarista',
  45.00,
  54.00,
  58.50,
  70.20,
  67.50,
  81.00,
  78.75,
  94.50,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- 12. PROGETTISTA JUNIOR
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Progettista Junior',
  'Progettista meccanico/elettrico con esperienza fino a 3 anni',
  'junior',
  'progettista',
  38.00,
  45.60,
  49.40,
  59.28,
  57.00,
  68.40,
  66.50,
  79.80,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- 13. PROGETTISTA SENIOR
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_sede,
  costo_orario_trasferta,
  costo_straordinario_sede,
  costo_straordinario_trasferta,
  costo_festivo_sede,
  costo_festivo_trasferta,
  costo_straordinario_festivo_sede,
  costo_straordinario_festivo_trasferta,
  attivo
) VALUES (
  'Progettista Senior',
  'Progettista meccanico/elettrico esperto con oltre 5 anni di esperienza',
  'senior',
  'progettista',
  50.00,
  60.00,
  65.00,
  78.00,
  75.00,
  90.00,
  87.50,
  105.00,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- Verifica inserimento
-- =====================================================
-- Esegui questa query per verificare che tutte le 13 mansioni siano state inserite
-- SELECT ruolo, categoria, livello, costo_orario_sede
-- FROM public.mansioni
-- ORDER BY categoria, livello;
