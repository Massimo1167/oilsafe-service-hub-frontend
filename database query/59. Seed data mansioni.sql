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
--                    oilsafe < teleassistenza < cliente (maggiorazione ~10% teleassistenza, ~20-30% cliente)

-- =====================================================
-- 1. OPERAIO GENERICO
-- =====================================================
INSERT INTO public.mansioni (
  ruolo,
  descrizione,
  livello,
  categoria,
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Operaio Generico',
  'Operaio generico per attività di supporto e manutenzione ordinaria',
  'generico',
  'operaio',
  25.00,   -- normale oilsafe
  30.00,   -- normale cliente
  27.50,   -- normale teleassistenza
  32.50,   -- straordinario oilsafe
  39.00,   -- straordinario cliente
  35.75,   -- straordinario teleassistenza
  37.50,   -- festivo oilsafe
  45.00,   -- festivo cliente
  41.25,   -- festivo teleassistenza
  43.75,   -- straordinario festivo oilsafe
  52.50,   -- straordinario festivo cliente
  48.13,   -- straordinario festivo teleassistenza
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
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Carpentiere Junior',
  'Carpentiere con esperienza fino a 3 anni',
  'junior',
  'carpentiere',
  30.00,
  36.00,
  33.00,
  39.00,
  46.80,
  42.90,
  45.00,
  54.00,
  49.50,
  52.50,
  63.00,
  57.75,
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
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Carpentiere Senior',
  'Carpentiere esperto con oltre 5 anni di esperienza',
  'senior',
  'carpentiere',
  40.00,
  48.00,
  44.00,
  52.00,
  62.40,
  57.20,
  60.00,
  72.00,
  66.00,
  70.00,
  84.00,
  77.00,
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
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Oleodinamico Junior',
  'Tecnico oleodinamico con esperienza fino a 3 anni',
  'junior',
  'oleodinamico',
  32.00,
  38.40,
  35.20,
  41.60,
  49.92,
  45.76,
  48.00,
  57.60,
  52.80,
  56.00,
  67.20,
  61.60,
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
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Oleodinamico Senior',
  'Tecnico oleodinamico esperto con oltre 5 anni di esperienza',
  'senior',
  'oleodinamico',
  42.00,
  50.40,
  46.20,
  54.60,
  65.52,
  60.06,
  63.00,
  75.60,
  69.30,
  73.50,
  88.20,
  80.85,
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
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Meccanico Junior',
  'Meccanico con esperienza fino a 3 anni',
  'junior',
  'meccanico',
  30.00,
  36.00,
  33.00,
  39.00,
  46.80,
  42.90,
  45.00,
  54.00,
  49.50,
  52.50,
  63.00,
  57.75,
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
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Meccanico Senior',
  'Meccanico esperto con oltre 5 anni di esperienza',
  'senior',
  'meccanico',
  40.00,
  48.00,
  44.00,
  52.00,
  62.40,
  57.20,
  60.00,
  72.00,
  66.00,
  70.00,
  84.00,
  77.00,
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
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Elettricista Junior',
  'Elettricista con esperienza fino a 3 anni',
  'junior',
  'elettricista',
  32.00,
  38.40,
  35.20,
  41.60,
  49.92,
  45.76,
  48.00,
  57.60,
  52.80,
  56.00,
  67.20,
  61.60,
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
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Elettricista Senior',
  'Elettricista esperto con oltre 5 anni di esperienza',
  'senior',
  'elettricista',
  42.00,
  50.40,
  46.20,
  54.60,
  65.52,
  60.06,
  63.00,
  75.60,
  69.30,
  73.50,
  88.20,
  80.85,
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
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Softwarista Junior',
  'Sviluppatore software e programmatore PLC con esperienza fino a 3 anni',
  'junior',
  'softwarista',
  35.00,
  42.00,
  38.50,
  45.50,
  54.60,
  50.05,
  52.50,
  63.00,
  57.75,
  61.25,
  73.50,
  67.38,
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
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Softwarista Senior',
  'Sviluppatore software e programmatore PLC esperto con oltre 5 anni di esperienza',
  'senior',
  'softwarista',
  45.00,
  54.00,
  49.50,
  58.50,
  70.20,
  64.35,
  67.50,
  81.00,
  74.25,
  78.75,
  94.50,
  86.63,
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
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Progettista Junior',
  'Progettista meccanico/elettrico con esperienza fino a 3 anni',
  'junior',
  'progettista',
  38.00,
  45.60,
  41.80,
  49.40,
  59.28,
  54.34,
  57.00,
  68.40,
  62.70,
  66.50,
  79.80,
  73.15,
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
  costo_orario_oilsafe,
  costo_orario_cliente,
  costo_orario_teleassistenza,
  costo_straordinario_oilsafe,
  costo_straordinario_cliente,
  costo_straordinario_teleassistenza,
  costo_festivo_oilsafe,
  costo_festivo_cliente,
  costo_festivo_teleassistenza,
  costo_straordinario_festivo_oilsafe,
  costo_straordinario_festivo_cliente,
  costo_straordinario_festivo_teleassistenza,
  attivo
) VALUES (
  'Progettista Senior',
  'Progettista meccanico/elettrico esperto con oltre 5 anni di esperienza',
  'senior',
  'progettista',
  50.00,
  60.00,
  55.00,
  65.00,
  78.00,
  71.50,
  75.00,
  90.00,
  82.50,
  87.50,
  105.00,
  96.25,
  true
) ON CONFLICT (ruolo) DO NOTHING;

-- =====================================================
-- Verifica inserimento
-- =====================================================
-- Esegui questa query per verificare che tutte le 13 mansioni siano state inserite
-- SELECT ruolo, categoria, livello, costo_orario_oilsafe, costo_orario_cliente, costo_orario_teleassistenza
-- FROM public.mansioni
-- ORDER BY categoria, livello;
