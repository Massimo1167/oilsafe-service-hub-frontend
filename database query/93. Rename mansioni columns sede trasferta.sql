-- ============================================================================
-- File: 93. Rename mansioni columns sede trasferta.sql
-- Descrizione: Rinomina le colonne esistenti da sede/trasferta a oilsafe/cliente
-- Data: 2024-12-04
-- Autore: Sistema
-- ============================================================================

-- Rinomina colonne "sede" → "oilsafe"
ALTER TABLE mansioni
RENAME COLUMN costo_orario_sede TO costo_orario_oilsafe;

ALTER TABLE mansioni
RENAME COLUMN costo_straordinario_sede TO costo_straordinario_oilsafe;

ALTER TABLE mansioni
RENAME COLUMN costo_festivo_sede TO costo_festivo_oilsafe;

ALTER TABLE mansioni
RENAME COLUMN costo_straordinario_festivo_sede TO costo_straordinario_festivo_oilsafe;

-- Rinomina colonne "trasferta" → "cliente"
ALTER TABLE mansioni
RENAME COLUMN costo_orario_trasferta TO costo_orario_cliente;

ALTER TABLE mansioni
RENAME COLUMN costo_straordinario_trasferta TO costo_straordinario_cliente;

ALTER TABLE mansioni
RENAME COLUMN costo_festivo_trasferta TO costo_festivo_cliente;

ALTER TABLE mansioni
RENAME COLUMN costo_straordinario_festivo_trasferta TO costo_straordinario_festivo_cliente;

-- Aggiorna commenti per colonne "oilsafe"
COMMENT ON COLUMN mansioni.costo_orario_oilsafe
  IS 'Costo orario normale per lavoro in sede Oilsafe';
COMMENT ON COLUMN mansioni.costo_straordinario_oilsafe
  IS 'Costo orario straordinario per lavoro in sede Oilsafe';
COMMENT ON COLUMN mansioni.costo_festivo_oilsafe
  IS 'Costo orario festivo per lavoro in sede Oilsafe';
COMMENT ON COLUMN mansioni.costo_straordinario_festivo_oilsafe
  IS 'Costo orario straordinario festivo per lavoro in sede Oilsafe';

-- Aggiorna commenti per colonne "cliente"
COMMENT ON COLUMN mansioni.costo_orario_cliente
  IS 'Costo orario normale per lavoro presso sede cliente';
COMMENT ON COLUMN mansioni.costo_straordinario_cliente
  IS 'Costo orario straordinario per lavoro presso sede cliente';
COMMENT ON COLUMN mansioni.costo_festivo_cliente
  IS 'Costo orario festivo per lavoro presso sede cliente';
COMMENT ON COLUMN mansioni.costo_straordinario_festivo_cliente
  IS 'Costo orario straordinario festivo per lavoro presso sede cliente';

-- Verifica il risultato
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'mansioni'
  AND (column_name LIKE '%oilsafe%' OR column_name LIKE '%cliente%' OR column_name LIKE '%teleassistenza%')
ORDER BY column_name;
