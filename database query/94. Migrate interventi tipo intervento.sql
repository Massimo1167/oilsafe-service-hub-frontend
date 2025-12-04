-- ============================================================================
-- File: 94. Migrate interventi tipo intervento.sql
-- Descrizione: Migra i dati esistenti di tipo_intervento ai nuovi valori
-- Data: 2024-12-04
-- Autore: Sistema
-- ============================================================================

-- IMPORTANTE: Eseguire questo script DOPO aver applicato le modifiche alle colonne mansioni
-- (file 92 e 93) per garantire la compatibilità con i calcoli dei costi

-- Verifica i valori correnti prima della migrazione
SELECT
  tipo_intervento,
  COUNT(*) as count
FROM interventi_assistenza
GROUP BY tipo_intervento
ORDER BY tipo_intervento;

-- Migra "In Loco" e "In loco" (varianti case-insensitive) → "Sede Cliente"
UPDATE interventi_assistenza
SET tipo_intervento = 'Sede Cliente'
WHERE tipo_intervento IN ('In Loco', 'In loco', 'in loco', 'IN LOCO');

-- Migra "Remoto" → "Sede Oilsafe"
UPDATE interventi_assistenza
SET tipo_intervento = 'Sede Oilsafe'
WHERE tipo_intervento IN ('Remoto', 'remoto', 'REMOTO');

-- Verifica il risultato della migrazione
SELECT
  tipo_intervento,
  COUNT(*) as count
FROM interventi_assistenza
GROUP BY tipo_intervento
ORDER BY tipo_intervento;

-- Verifica che non ci siano valori inattesi
SELECT DISTINCT tipo_intervento
FROM interventi_assistenza
WHERE tipo_intervento NOT IN ('Sede Cliente', 'Sede Oilsafe', 'Teleassistenza')
ORDER BY tipo_intervento;

-- Se la query sopra restituisce risultati, significa che ci sono valori non previsti
-- che richiedono attenzione manuale
