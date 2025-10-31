-- Tabella per l'anagrafica delle unità di misura
-- Unità di misura globali condivise tra tutti i clienti per le attività standard
-- Gestibile da admin e manager

-- Crea funzione per trigger updated_at (se non esiste già)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.unita_misura (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codice TEXT NOT NULL UNIQUE,
    descrizione TEXT,
    attivo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Commenti
COMMENT ON TABLE public.unita_misura IS 'Anagrafica unità di misura per attività standard';
COMMENT ON COLUMN public.unita_misura.codice IS 'Codice unità di misura univoco (es: €/h, €/prova, €/consegna)';
COMMENT ON COLUMN public.unita_misura.descrizione IS 'Descrizione estesa dell''unità di misura (opzionale)';
COMMENT ON COLUMN public.unita_misura.attivo IS 'Flag per disabilitare UM senza eliminarla';

-- Trigger per updated_at
CREATE OR REPLACE TRIGGER set_updated_at_unita_misura
BEFORE UPDATE ON public.unita_misura
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data iniziale
INSERT INTO public.unita_misura (codice, descrizione, attivo) VALUES
    ('€/h', 'Euro per ora', true),
    ('€/prova', 'Euro per prova', true),
    ('€/consegna', 'Euro per consegna', true),
    ('€/giorno', 'Euro per giorno', true),
    ('€/ritiro', 'Euro per ritiro', true),
    ('€/pezzo', 'Euro per pezzo', true),
    ('€*mc/giorno', 'Euro per metro cubo al giorno', true)
ON CONFLICT (codice) DO NOTHING;
