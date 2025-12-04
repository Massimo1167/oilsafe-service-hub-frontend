-- ============================================================================
-- File: 92. Alter mansioni add teleassistenza.sql
-- Descrizione: Aggiunge 4 nuove colonne per i costi della teleassistenza
-- Data: 2024-12-04
-- Autore: Sistema
-- ============================================================================

-- Aggiungi 4 nuove colonne per Teleassistenza
ALTER TABLE mansioni
ADD COLUMN costo_orario_teleassistenza DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN costo_straordinario_teleassistenza DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN costo_festivo_teleassistenza DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN costo_straordinario_festivo_teleassistenza DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Aggiungi check constraints per valori positivi
ALTER TABLE mansioni
ADD CONSTRAINT check_costo_orario_teleassistenza_positive
  CHECK (costo_orario_teleassistenza >= 0),
ADD CONSTRAINT check_costo_straordinario_teleassistenza_positive
  CHECK (costo_straordinario_teleassistenza >= 0),
ADD CONSTRAINT check_costo_festivo_teleassistenza_positive
  CHECK (costo_festivo_teleassistenza >= 0),
ADD CONSTRAINT check_costo_straordinario_festivo_teleassistenza_positive
  CHECK (costo_straordinario_festivo_teleassistenza >= 0);

-- Aggiungi commenti descrittivi
COMMENT ON COLUMN mansioni.costo_orario_teleassistenza
  IS 'Costo orario normale per interventi in teleassistenza';
COMMENT ON COLUMN mansioni.costo_straordinario_teleassistenza
  IS 'Costo orario straordinario per interventi in teleassistenza';
COMMENT ON COLUMN mansioni.costo_festivo_teleassistenza
  IS 'Costo orario festivo per interventi in teleassistenza';
COMMENT ON COLUMN mansioni.costo_straordinario_festivo_teleassistenza
  IS 'Costo orario straordinario festivo per interventi in teleassistenza';

-- Verifica il risultato
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'mansioni'
  AND column_name LIKE '%teleassistenza%'
ORDER BY column_name;
