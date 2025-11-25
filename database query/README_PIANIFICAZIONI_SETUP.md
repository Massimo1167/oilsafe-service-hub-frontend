---
marp: true
---

# Setup Database - Sistema Pianificazione Interventi

## Panoramica

Questo documento descrive la procedura di setup del database per il nuovo **Sistema di Pianificazione Interventi**. Il sistema permette ai Manager di pianificare interventi futuri su un calendario, assegnando tecnici e mezzi di trasporto.

## Prerequisiti

- Accesso amministrativo al database Supabase del progetto
- SQL Editor di Supabase o client PostgreSQL

## Schema Database - Nuove Tabelle

Il sistema aggiunge 4 nuove tabelle al database esistente:

1. **`mezzi_trasporto`** - Anagrafica mezzi di trasporto aziendali
2. **`pianificazioni`** - Pianificazione interventi futuri per fogli di assistenza
3. **`pianificazioni_mezzi`** - Calendario separato per mezzi (manutenzione, altro)
4. **`festivita`** - Elenco festività italiane per calcolo giorni lavorativi

## Ordine di Esecuzione Script SQL

⚠️ **IMPORTANTE**: Gli script devono essere eseguiti nell'ordine indicato per rispettare le dipendenze tra tabelle.

### Step 1: Creazione Tabella Mezzi di Trasporto
```bash
Script: 73. Create table mezzi_trasporto.sql
```

**Cosa fa:**
- Crea tabella `mezzi_trasporto` con campi: targa (UNIQUE), tipo_mezzo, modello, marca, anno, note, attivo
- Aggiunge RLS policies (Admin/Manager full access, User/Head read-only)
- Crea indici per performance
- Aggiunge trigger per `updated_at`
- Aggiunge constraint di validazione (targa non vuota, anno valido)

**Risultato atteso:**
- Tabella creata con successo
- Nessun errore di constraint o policy

---

### Step 2: Creazione Tabella Pianificazioni
```bash
Script: 74. Create table pianificazioni.sql
```

**Cosa fa:**
- Crea tabella `pianificazioni` con campi per scheduling interventi
- Collegamenti: `foglio_assistenza_id` (FK REQUIRED)
- Risorse: array `tecnici_assegnati`, `mezzo_principale_id`, array `mezzi_secondari_ids`
- Stati: Pianificata, Confermata, In Corso, Completata, Cancellata
- Aggiunge RLS policies (Manager/Admin full access, User read assigned)
- Crea indici GIN per ricerca in array
- Aggiunge funzioni helper: `is_tecnico_disponibile()`, `is_mezzo_disponibile()`
- Validazioni: date coerenti, stato valido, almeno un tecnico

**Risultato atteso:**
- Tabella creata con tutte le foreign keys risolte
- Funzioni helper create
- Policies attive

---

### Step 3: Creazione Tabella Pianificazioni Mezzi
```bash
Script: 75. Create table pianificazioni_mezzi.sql
```

**Cosa fa:**
- Crea tabella `pianificazioni_mezzi` per calendario mezzi separato
- Collegamenti opzionali: `foglio_assistenza_id`, `pianificazione_id`, `commessa_id`
- Tipo utilizzo: Lavoro, Manutenzione, Revisione, Altro
- Aggiunge RLS policies
- Validazioni date/orari

**Risultato atteso:**
- Tabella creata correttamente
- Collegamenti opzionali funzionanti

---

### Step 4: Creazione Tabella Festività
```bash
Script: 76. Create table festivita.sql
```

**Cosa fa:**
- Crea tabella `festivita` con festività italiane
- Inserisce festività canoniche (Capodanno, Epifania, 25 Aprile, ecc.)
- Inserisce festività mobili (Pasqua, Pasquetta) per anni 2025, 2026, 2027
- Crea funzioni helper:
  - `is_festivo(date)` - Verifica se una data è festiva
  - `is_weekend(date)` - Verifica se è weekend
  - `conta_giorni_lavorativi(...)` - Conta giorni lavorativi tra due date
  - `aggiungi_giorni_lavorativi(...)` - Aggiunge giorni lavorativi a una data
- RLS: tutti possono leggere, solo Admin può modificare

**Risultato atteso:**
- Tabella creata con festività inserite
- Funzioni helper disponibili
- Test: `SELECT is_festivo('2025-01-01');` deve ritornare `true`

---

### Step 5: Trigger Sincronizzazione Stati
```bash
Script: 77. Trigger sync stato foglio pianificazione.sql
```

**Cosa fa:**
- Crea trigger che sincronizza stato pianificazione quando cambia stato foglio
- Quando foglio → "Completato": pianificazioni → "Completata"
- Quando foglio torna indietro: pianificazioni → "Confermata"
- Validazione transizioni stati pianificazione (flusso Pianificata → Confermata → In Corso → Completata)
- Validazione: solo fogli in stato "Aperto", "In Lavorazione", "Attesa Firma" sono pianificabili
- Impedisce eliminazione foglio con pianificazioni attive

**Risultato atteso:**
- Trigger creati su `fogli_assistenza` e `pianificazioni`
- Funzioni di validazione attive

---

## Verifica Setup

Dopo aver eseguito tutti gli script, verificare che:

### 1. Tabelle Create
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('mezzi_trasporto', 'pianificazioni', 'pianificazioni_mezzi', 'festivita');
```

**Output atteso:** 4 righe

### 2. Festività Inserite
```sql
SELECT COUNT(*) FROM public.festivita;
```

**Output atteso:** >= 10 (festività ricorrenti) + festività mobili anni 2025-2027

### 3. Funzioni Helper
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'is_festivo',
    'is_weekend',
    'conta_giorni_lavorativi',
    'aggiungi_giorni_lavorativi',
    'is_tecnico_disponibile',
    'is_mezzo_disponibile'
  );
```

**Output atteso:** 6 funzioni

### 4. Test Funzioni
```sql
-- Test is_festivo
SELECT is_festivo('2025-01-01'); -- deve essere TRUE (Capodanno)
SELECT is_festivo('2025-01-15'); -- deve essere FALSE (giorno normale)

-- Test is_weekend
SELECT is_weekend('2025-01-11'); -- deve essere TRUE (sabato)
SELECT is_weekend('2025-01-13'); -- deve essere FALSE (lunedì)

-- Test conta_giorni_lavorativi
SELECT conta_giorni_lavorativi('2025-01-06'::DATE, '2025-01-10'::DATE, false, true, false);
-- Dovrebbe contare 5 giorni (lunedì-venerdì), escludendo domenica

-- Test aggiungi_giorni_lavorativi
SELECT aggiungi_giorni_lavorativi('2025-01-06'::DATE, 5, false, true, false);
-- Dovrebbe aggiungere 5 giorni lavorativi a partire dal 6 gennaio
```

### 5. RLS Policies Attive
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('mezzi_trasporto', 'pianificazioni', 'pianificazioni_mezzi', 'festivita');
```

**Output atteso:** Almeno 2-3 policy per tabella

---

## Dati di Test (Opzionale)

### Mezzi di Trasporto
```sql
INSERT INTO public.mezzi_trasporto (targa, tipo_mezzo, modello, marca, anno_immatricolazione, attivo)
VALUES
    ('AB123CD', 'Furgone', 'Ducato', 'Fiat', 2020, true),
    ('EF456GH', 'Auto', 'Doblo', 'Fiat', 2019, true),
    ('IJ789KL', 'Camion', 'Daily', 'Iveco', 2018, true),
    ('MN012OP', 'Auto', 'Punto', 'Fiat', 2017, false); -- Mezzo non attivo
```

---

## Aggiornamento Festività Annuali

Le festività mobili (Pasqua, Pasquetta) devono essere aggiornate manualmente ogni anno.

**Esempio per anno 2028:**
```sql
INSERT INTO public.festivita (data, descrizione, ricorrente, anno) VALUES
    ('2028-04-16', 'Pasqua', false, 2028),
    ('2028-04-17', 'Lunedì dell''Angelo (Pasquetta)', false, 2028)
ON CONFLICT (data, anno) DO NOTHING;
```

Siti per calcolare la Pasqua: https://www.calendario-365.it/festa/pasqua.html

---

## Rollback (in caso di errori)

Se necessario fare rollback, eseguire in ordine inverso:

```sql
-- Rimuovi trigger e funzioni
DROP TRIGGER IF EXISTS sync_pianificazione_on_foglio_update ON public.fogli_assistenza;
DROP TRIGGER IF EXISTS validate_pianificazione_trigger ON public.pianificazioni;
DROP TRIGGER IF EXISTS prevent_delete_foglio_with_pianificazioni ON public.fogli_assistenza;
DROP FUNCTION IF EXISTS sync_pianificazione_stato_foglio();
DROP FUNCTION IF EXISTS validate_pianificazione();
DROP FUNCTION IF EXISTS prevent_delete_foglio_with_active_pianificazioni();

-- Rimuovi funzioni helper festivita
DROP FUNCTION IF EXISTS is_festivo(DATE);
DROP FUNCTION IF EXISTS is_weekend(DATE);
DROP FUNCTION IF EXISTS conta_giorni_lavorativi(DATE, DATE, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS aggiungi_giorni_lavorativi(DATE, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN);

-- Rimuovi funzioni helper pianificazioni
DROP FUNCTION IF EXISTS is_tecnico_disponibile(UUID, DATE, DATE, TIME, TIME, UUID);
DROP FUNCTION IF EXISTS is_mezzo_disponibile(UUID, DATE, DATE, UUID);

-- Rimuovi tabelle (in ordine inverso per rispettare FK)
DROP TABLE IF EXISTS public.pianificazioni_mezzi CASCADE;
DROP TABLE IF EXISTS public.pianificazioni CASCADE;
DROP TABLE IF EXISTS public.festivita CASCADE;
DROP TABLE IF EXISTS public.mezzi_trasporto CASCADE;
```

---

## Prossimi Passi

Una volta completato il setup del database, procedere con:

1. ✅ Frontend: Creazione `MezziTrasportoManager` component
2. ✅ Frontend: Aggiunta route e navigation per Mezzi
3. ✅ Frontend: Test anagrafica mezzi (CRUD, import/export)
4. ⏭️ Frontend: Creazione calendario pianificazioni (Fase 3-4 del piano)

---

## Supporto

Per problemi o domande sul setup:
- Verificare log errori Supabase SQL Editor
- Controllare che tutte le tabelle dipendenti esistano (fogli_assistenza, tecnici, commesse, ecc.)
- Verificare permessi utente database

---

**Data creazione**: 2025-01-07
**Versione**: 1.0.0
**Autore**: Sistema Pianificazione Interventi - Oilsafe Service Hub
