-- =============================================
-- Script: 76. Create table festivita
-- Descrizione: Crea la tabella per la gestione delle festività italiane
--              e funzioni helper per il calcolo giorni lavorativi
-- Data: 2025-01-07
-- Versione: 1.0.0
-- =============================================

-- Creazione tabella festivita
CREATE TABLE IF NOT EXISTS public.festivita (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Data festività
    data DATE NOT NULL,

    -- Descrizione festività
    descrizione TEXT NOT NULL,

    -- Se ricorrente, viene ripetuta ogni anno
    ricorrente BOOLEAN NOT NULL DEFAULT true,

    -- Anno specifico (NULL se ricorrente ogni anno)
    anno INTEGER,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indice su data per ricerca rapida
CREATE UNIQUE INDEX IF NOT EXISTS idx_festivita_data_anno
    ON public.festivita(data, anno);

CREATE INDEX IF NOT EXISTS idx_festivita_ricorrente
    ON public.festivita(ricorrente);

-- =============================================
-- COMMENTI
-- =============================================

COMMENT ON TABLE public.festivita IS 'Elenco festività italiane (ricorrenti e specifiche per anno)';
COMMENT ON COLUMN public.festivita.ricorrente IS 'Se true, la festività si ripete ogni anno';
COMMENT ON COLUMN public.festivita.anno IS 'Anno specifico (NULL per festività ricorrenti annuali)';

-- =============================================
-- INSERIMENTO FESTIVITÀ ITALIANE CANONICHE
-- =============================================

-- Festività ricorrenti italiane (giorno e mese fissi ogni anno)
INSERT INTO public.festivita (data, descrizione, ricorrente, anno) VALUES
    ('2025-01-01', 'Capodanno', true, NULL),
    ('2025-01-06', 'Epifania', true, NULL),
    ('2025-04-25', 'Festa della Liberazione', true, NULL),
    ('2025-05-01', 'Festa del Lavoro', true, NULL),
    ('2025-06-02', 'Festa della Repubblica', true, NULL),
    ('2025-08-15', 'Ferragosto (Assunzione di Maria)', true, NULL),
    ('2025-11-01', 'Ognissanti', true, NULL),
    ('2025-12-08', 'Immacolata Concezione', true, NULL),
    ('2025-12-25', 'Natale', true, NULL),
    ('2025-12-26', 'Santo Stefano', true, NULL)
ON CONFLICT (data, anno) DO NOTHING;

-- =============================================
-- FESTIVITÀ MOBILI (vanno aggiunte manualmente per ogni anno)
-- =============================================

-- Pasqua e Lunedì dell'Angelo (cambiano ogni anno)
-- Questi valori vanno aggiornati annualmente

-- Anno 2025
INSERT INTO public.festivita (data, descrizione, ricorrente, anno) VALUES
    ('2025-04-20', 'Pasqua', false, 2025),
    ('2025-04-21', 'Lunedì dell''Angelo (Pasquetta)', false, 2025)
ON CONFLICT (data, anno) DO NOTHING;

-- Anno 2026 (esempio - da aggiornare)
INSERT INTO public.festivita (data, descrizione, ricorrente, anno) VALUES
    ('2026-04-05', 'Pasqua', false, 2026),
    ('2026-04-06', 'Lunedì dell''Angelo (Pasquetta)', false, 2026)
ON CONFLICT (data, anno) DO NOTHING;

-- Anno 2027 (esempio - da aggiornare)
INSERT INTO public.festivita (data, descrizione, ricorrente, anno) VALUES
    ('2027-03-28', 'Pasqua', false, 2027),
    ('2027-03-29', 'Lunedì dell''Angelo (Pasquetta)', false, 2027)
ON CONFLICT (data, anno) DO NOTHING;

-- =============================================
-- FUNZIONE HELPER: Verifica se una data è festiva
-- =============================================

CREATE OR REPLACE FUNCTION is_festivo(p_data DATE)
RETURNS BOOLEAN AS $$
DECLARE
    v_count INTEGER;
    v_anno INTEGER;
BEGIN
    v_anno := EXTRACT(YEAR FROM p_data);

    -- Cerca festività ricorrenti (stesso giorno/mese) o festività specifiche per quell'anno
    SELECT COUNT(*)
    INTO v_count
    FROM public.festivita
    WHERE (
        -- Festività ricorrente: stesso giorno e mese
        (ricorrente = true AND EXTRACT(MONTH FROM data) = EXTRACT(MONTH FROM p_data)
                           AND EXTRACT(DAY FROM data) = EXTRACT(DAY FROM p_data))
        OR
        -- Festività specifica per quell'anno
        (ricorrente = false AND data = p_data AND anno = v_anno)
    );

    RETURN (v_count > 0);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_festivo IS 'Verifica se una data è una festività italiana';

-- =============================================
-- FUNZIONE HELPER: Verifica se una data è weekend
-- =============================================

CREATE OR REPLACE FUNCTION is_weekend(p_data DATE)
RETURNS BOOLEAN AS $$
BEGIN
    -- 0 = Domenica, 6 = Sabato in extract(dow)
    RETURN EXTRACT(DOW FROM p_data) IN (0, 6);
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_weekend IS 'Verifica se una data cade in un weekend (sabato o domenica)';

-- =============================================
-- FUNZIONE HELPER: Conta giorni lavorativi tra due date
-- =============================================

CREATE OR REPLACE FUNCTION conta_giorni_lavorativi(
    p_data_inizio DATE,
    p_data_fine DATE,
    p_salta_sabato BOOLEAN DEFAULT false,
    p_salta_domenica BOOLEAN DEFAULT true,
    p_salta_festivi BOOLEAN DEFAULT true
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_current_date DATE;
    v_dow INTEGER;
BEGIN
    -- Itera attraverso tutti i giorni nel range
    v_current_date := p_data_inizio;

    WHILE v_current_date <= p_data_fine LOOP
        v_dow := EXTRACT(DOW FROM v_current_date);

        -- Verifica se il giorno è lavorativo
        IF (
            -- Non è sabato (se deve saltare sabato)
            (NOT p_salta_sabato OR v_dow != 6) AND
            -- Non è domenica (se deve saltare domenica)
            (NOT p_salta_domenica OR v_dow != 0) AND
            -- Non è festivo (se deve saltare festivi)
            (NOT p_salta_festivi OR NOT is_festivo(v_current_date))
        ) THEN
            v_count := v_count + 1;
        END IF;

        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION conta_giorni_lavorativi IS 'Conta i giorni lavorativi tra due date, escludendo opzionalmente sabato, domenica e festivi';

-- =============================================
-- FUNZIONE HELPER: Aggiunge giorni lavorativi a una data
-- =============================================

CREATE OR REPLACE FUNCTION aggiungi_giorni_lavorativi(
    p_data_inizio DATE,
    p_giorni_da_aggiungere INTEGER,
    p_salta_sabato BOOLEAN DEFAULT false,
    p_salta_domenica BOOLEAN DEFAULT true,
    p_salta_festivi BOOLEAN DEFAULT true
)
RETURNS DATE AS $$
DECLARE
    v_current_date DATE;
    v_giorni_aggiunti INTEGER := 0;
    v_dow INTEGER;
BEGIN
    v_current_date := p_data_inizio;

    WHILE v_giorni_aggiunti < p_giorni_da_aggiungere LOOP
        v_current_date := v_current_date + INTERVAL '1 day';
        v_dow := EXTRACT(DOW FROM v_current_date);

        -- Conta solo giorni lavorativi
        IF (
            (NOT p_salta_sabato OR v_dow != 6) AND
            (NOT p_salta_domenica OR v_dow != 0) AND
            (NOT p_salta_festivi OR NOT is_festivo(v_current_date))
        ) THEN
            v_giorni_aggiunti := v_giorni_aggiunti + 1;
        END IF;
    END LOOP;

    RETURN v_current_date;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION aggiungi_giorni_lavorativi IS 'Aggiunge un numero di giorni lavorativi a una data, escludendo opzionalmente sabato, domenica e festivi';

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

ALTER TABLE public.festivita ENABLE ROW LEVEL SECURITY;

-- Tutti possono leggere le festività
DROP POLICY IF EXISTS "Everyone can read festivita" ON public.festivita;
CREATE POLICY "Everyone can read festivita"
    ON public.festivita
    FOR SELECT
    USING (true);

-- Solo Admin può modificare festività
DROP POLICY IF EXISTS "Admin can manage festivita" ON public.festivita;
CREATE POLICY "Admin can manage festivita"
    ON public.festivita
    FOR ALL
    USING (public.get_my_role() = 'admin')
    WITH CHECK (public.get_my_role() = 'admin');

-- =============================================
-- FINE SCRIPT
-- =============================================
