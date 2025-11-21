-- =============================================
-- 85. Alter fogli_assistenza add print tracking
-- =============================================
-- Aggiunge campi per tracciare lo stato di stampa/archiviazione dei fogli
-- - ultima_data_stampa: aggiornata dopo stampa PDF riuscita
-- - ultima_data_modifica: aggiornata ad ogni modifica (escluso cambio stato)
-- - richiesta_nuova_stampa: flag TRUE se serve ristampa, FALSE dopo stampa

-- Aggiungi colonne per tracciamento stampa
ALTER TABLE public.fogli_assistenza
ADD COLUMN IF NOT EXISTS ultima_data_stampa TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ultima_data_modifica TIMESTAMPTZ DEFAULT now(),
ADD COLUMN IF NOT EXISTS richiesta_nuova_stampa BOOLEAN DEFAULT true;

-- Commenti sulle colonne
COMMENT ON COLUMN public.fogli_assistenza.ultima_data_stampa IS 'Data e ora ultima stampa PDF riuscita';
COMMENT ON COLUMN public.fogli_assistenza.ultima_data_modifica IS 'Data e ora ultima modifica contenuto (escluso cambio stato)';
COMMENT ON COLUMN public.fogli_assistenza.richiesta_nuova_stampa IS 'TRUE se il foglio necessita nuova stampa per archiviazione';

-- Indice per query filtrate sui fogli da stampare
CREATE INDEX IF NOT EXISTS idx_fogli_richiesta_stampa
ON public.fogli_assistenza(richiesta_nuova_stampa)
WHERE richiesta_nuova_stampa = true;

-- Inizializza i fogli esistenti:
-- - ultima_data_modifica = created_at esistente o now()
-- - richiesta_nuova_stampa = true (tutti i fogli esistenti da considerare da stampare)
UPDATE public.fogli_assistenza
SET
    ultima_data_modifica = COALESCE(created_at, now()),
    richiesta_nuova_stampa = true
WHERE ultima_data_modifica IS NULL;
