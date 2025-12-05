# Implementazione Stati Irreversibili e Sistema Log

Guida completa per l'implementazione delle funzionalità di gestione stati irreversibili, logging e permessi admin senior.

## 📋 Panoramica

Questa implementazione risolve due problemi critici:
1. **Bug trigger database**: Impossibilità di riportare fogli da stati avanzati a stati precedenti
2. **Prevenzione errori futuri**: Modal di conferma per stati irreversibili + audit trail completo

## 🚀 Ordine di Esecuzione

### Fase 1: EMERGENZA - Recupero Foglio FLE_00000044 (5-10 minuti)

**File**: `database query/HOTFIX_recupero_foglio_FLE_00000044.sql`

Questo script disabilita temporaneamente i trigger per riportare il foglio bloccato a stato "Aperto".

```bash
# Esegui nel client Supabase SQL Editor o pgAdmin
psql -U <user> -d <database> -f "database query/HOTFIX_recupero_foglio_FLE_00000044.sql"
```

**Verifica risultato**:
```sql
SELECT numero_foglio, stato_foglio, updated_at
FROM public.fogli_assistenza
WHERE numero_foglio = 'FLE_00000044';
-- Deve mostrare stato_foglio = 'Aperto'
```

---

### Fase 2: CORREZIONE PERMANENTE - Fix Trigger (10-15 minuti)

**File**: `database query/92. FIX_validate_pianificazione_sync_trigger.sql`

Corregge la funzione `validate_pianificazione()` per permettere transizione Completata → Confermata.

```bash
# Esegui nel client Supabase SQL Editor
psql -U <user> -d <database> -f "database query/92. FIX_validate_pianificazione_sync_trigger.sql"
```

**Lo script include test automatici** che verificano:
- ✓ Foglio Aperto → Completato (pianificazione diventa Completata)
- ✓ Foglio Completato → Aperto (pianificazione torna a Confermata)
- ✓ Ciclo completo multiple transizioni

**Verifica manuale**:
```sql
-- Crea un foglio test e verifica transizioni
INSERT INTO fogli_assistenza (numero_foglio, stato_foglio, cliente_id, commessa_id, data_apertura_foglio)
VALUES ('TEST_001', 'Aperto', <cliente_id>, <commessa_id>, CURRENT_DATE);

-- Passa a Completato
UPDATE fogli_assistenza SET stato_foglio = 'Completato' WHERE numero_foglio = 'TEST_001';

-- Torna a Aperto (prima falliva, ora deve funzionare)
UPDATE fogli_assistenza SET stato_foglio = 'Aperto' WHERE numero_foglio = 'TEST_001';

-- Cleanup
DELETE FROM fogli_assistenza WHERE numero_foglio = 'TEST_001';
```

---

### Fase 3: LOG MODIFICHE STATO (15-20 minuti)

**File**: `database query/93. Log_modifiche_stato_foglio.sql`

Crea sistema di logging automatico per tutte le modifiche di stato con audit trail.

```bash
# Esegui nel client Supabase SQL Editor
psql -U <user> -d <database> -f "database query/93. Log_modifiche_stato_foglio.sql"
```

**Funzionalità**:
- Tabella `log_modifiche_stato_foglio` con trigger automatico
- Registra: stato precedente, stato nuovo, user, motivo, timestamp
- RLS policies per accesso controllato (Admin/Manager vedono tutto, User solo propri fogli)
- Funzioni utility: `get_storico_stato_foglio()`, `report_modifiche_stato()`

**Verifica**:
```sql
-- Modifica stato di un foglio
UPDATE fogli_assistenza
SET stato_foglio = 'Completato', nota_stato_foglio = 'Test logging'
WHERE numero_foglio = '<qualsiasi_foglio>';

-- Verifica log creato
SELECT * FROM log_modifiche_stato_foglio
ORDER BY data_modifica DESC
LIMIT 5;

-- Test funzione storico
SELECT * FROM get_storico_stato_foglio('<foglio_id>');
```

---

### Fase 4: PERMESSI ADMIN SENIOR (15-20 minuti)

**File**: `database query/94. Permessi_admin_senior_rollback.sql`

Sistema di permessi granulari per operazioni critiche con tracciamento completo.

```bash
# Esegui nel client Supabase SQL Editor
psql -U <user> -d <database> -f "database query/94. Permessi_admin_senior_rollback.sql"
```

**Funzionalità**:
- Campo `permessi_speciali` (JSONB) su tabella profiles
- Tabella `log_operazioni_critiche` per audit trail utilizzi
- Funzioni: `has_special_permission()`, `set_special_permission()`
- Modifica trigger `sync_pianificazione_stato_foglio()` per verificare permesso rollback

**Verifica**:
```sql
-- Lista utenti con permessi
SELECT * FROM get_users_with_special_permissions();

-- Assegna permesso a un admin senior (sostituisci <admin_user_id>)
SELECT set_special_permission('<admin_user_id>', 'force_stato_rollback', true);

-- Verifica permesso
SELECT permessi_speciali FROM profiles WHERE id = '<admin_user_id>';
-- Deve mostrare: {"force_stato_rollback": true}
```

**Test rollback forzato** (solo con permesso):
```sql
-- Crea foglio test
INSERT INTO fogli_assistenza (numero_foglio, stato_foglio, cliente_id, commessa_id, data_apertura_foglio)
VALUES ('TEST_ROLLBACK', 'Fatturato', <cliente_id>, <commessa_id>, CURRENT_DATE);

-- Tenta rollback (richiede permesso force_stato_rollback)
UPDATE fogli_assistenza SET stato_foglio = 'Aperto' WHERE numero_foglio = 'TEST_ROLLBACK';
-- Se non hai permesso → ERRORE
-- Se hai permesso → OK + log in log_operazioni_critiche

-- Verifica log
SELECT * FROM log_operazioni_critiche WHERE tipo_operazione = 'FORCE_ROLLBACK_STATO';

-- Cleanup
DELETE FROM fogli_assistenza WHERE numero_foglio = 'TEST_ROLLBACK';
```

---

### Fase 5: FRONTEND - Modal Conferma (NO ESECUZIONE SQL)

Sono già stati creati i file React:
- ✅ `src/components/ConfirmModal.jsx`
- ✅ `src/components/ConfirmModal.css`
- ✅ `src/pages/FoglioAssistenzaFormPage.jsx` (modificato)
- ✅ `src/pages/PermessiSpecialiPage.jsx`
- ✅ `src/pages/PermessiSpecialiPage.css`

**IMPORTANTE**: Devi aggiungere la route per la pagina permessi!

**File da modificare**: `src/App.jsx` (o dove hai le route)

Aggiungi:
```javascript
import PermessiSpecialiPage from './pages/PermessiSpecialiPage';

// Nella sezione routes:
<Route path="/permessi-speciali" element={<PermessiSpecialiPage session={session} />} />
```

**Aggiungi link nel menu di navigazione** (solo per admin):
```javascript
{userRole === 'admin' && (
  <Link to="/permessi-speciali">Permessi Speciali</Link>
)}
```

---

## 🧪 Test Completo End-to-End

### 1. Test Modal Conferma Stati Irreversibili

#### Test come USER:
1. Accedi come user
2. Vai su un foglio in stato "In Lavorazione"
3. Cambia stato a "Completato"
4. **Atteso**: Modal di conferma appare
5. Clicca "Annulla" → stato rimane "In Lavorazione"
6. Cambia di nuovo a "Completato" e clicca "Sì, Procedi"
7. **Atteso**: Stato cambia a "Completato"
8. Verifica log: `SELECT * FROM log_modifiche_stato_foglio WHERE foglio_assistenza_id = '<id>'`

#### Test come ADMIN:
1. Accedi come admin
2. Vai su un foglio in stato "Completato"
3. Cambia stato a "Consuntivato"
4. **Atteso**: Modal di conferma appare
5. Conferma → stato cambia
6. Verifica log

#### Test movimento indietro (NO modal):
1. Vai su foglio "Completato"
2. Cambia a "In Lavorazione"
3. **Atteso**: NESSUN modal (movimento indietro sempre permesso)
4. Stato cambia immediatamente

---

### 2. Test Permessi Admin Senior

#### Assegna permesso:
1. Accedi come admin
2. Vai su `/permessi-speciali`
3. Trova un admin di fiducia
4. Attiva toggle "Force Rollback Stato"
5. **Atteso**: Messaggio di successo

#### Test rollback forzato:
1. Accedi come admin senior (con permesso)
2. Crea foglio e portalo a "Fatturato"
3. Nel database, esegui: `UPDATE fogli_assistenza SET stato_foglio = 'Aperto' WHERE id = '<id>'`
4. **Atteso**: Operazione riesce
5. Verifica log: `SELECT * FROM log_operazioni_critiche WHERE tipo_operazione = 'FORCE_ROLLBACK_STATO'`

#### Test senza permesso:
1. Accedi come admin normale (senza permesso)
2. Tenta stesso rollback
3. **Atteso**: Errore "PERMESSO NEGATO"

---

### 3. Test Regressione

Verifica che le funzionalità esistenti continuino a funzionare:

- ✅ Creazione nuovo foglio
- ✅ Modifica foglio esistente (senza cambio stato)
- ✅ Lista fogli si carica
- ✅ Dettaglio foglio si carica
- ✅ Interventi funzionano
- ✅ PDF generation funziona

---

## 📊 Query Utili per Amministratori

### Storico modifiche stato per un foglio
```sql
SELECT * FROM get_storico_stato_foglio('<foglio_id>');
```

### Report modifiche ultimo mese
```sql
SELECT * FROM report_modifiche_stato(CURRENT_DATE - 30, CURRENT_DATE);
```

### Fogli che sono tornati indietro da stati avanzati
```sql
SELECT
    numero_foglio,
    stato_precedente,
    stato_nuovo,
    motivo_modifica,
    data_modifica
FROM log_modifiche_stato_foglio
WHERE stato_precedente IN ('Completato', 'Consuntivato', 'Fatturato')
  AND stato_nuovo IN ('Aperto', 'In Lavorazione')
ORDER BY data_modifica DESC;
```

### Utenti con permessi speciali
```sql
SELECT * FROM get_users_with_special_permissions();
```

### Report utilizzo permessi speciali
```sql
SELECT * FROM report_utilizzo_permessi_speciali(CURRENT_DATE - 30, CURRENT_DATE);
```

### Conta modifiche stato per utente (ultimi 30 giorni)
```sql
SELECT
    p.full_name,
    au.email,
    COUNT(*) as num_modifiche,
    COUNT(DISTINCT l.foglio_assistenza_id) as num_fogli_unici
FROM log_modifiche_stato_foglio l
JOIN profiles p ON l.modificato_da_user_id = p.id
LEFT JOIN auth.users au ON p.id = au.id
WHERE l.data_modifica > now() - interval '30 days'
GROUP BY p.id, p.full_name, au.email
ORDER BY num_modifiche DESC;
```

---

## 🔒 Note di Sicurezza

### RLS Policies
Le seguenti tabelle hanno Row Level Security abilitato:
- `log_modifiche_stato_foglio`: Admin/Manager vedono tutto, User solo propri fogli
- `log_operazioni_critiche`: Solo Admin possono vedere

### Permessi Speciali
- Solo Admin possono assegnare/rimuovere permessi speciali
- Ogni assegnazione è tracciata in `log_operazioni_critiche`
- Ogni utilizzo del permesso è tracciato

### Audit Trail
- Tutte le modifiche di stato sono registrate con timestamp, user, motivo
- Log immutabili (INSERT only, no UPDATE/DELETE per compliance)
- Permessi RLS impediscono bypass via API diretta

---

## 📝 Checklist Post-Implementazione

### Database
- [ ] Eseguito HOTFIX recupero foglio FLE_00000044
- [ ] Eseguito FIX correzione trigger
- [ ] Test automatici passati (output dello script 92)
- [ ] Eseguito script Log Modifiche
- [ ] Eseguito script Permessi Admin Senior
- [ ] Verificato RLS policies attive

### Frontend
- [ ] Route `/permessi-speciali` aggiunta in App.jsx
- [ ] Link "Permessi Speciali" aggiunto nel menu (solo admin)
- [ ] Test modal conferma user → Completato
- [ ] Test modal conferma admin → Consuntivato
- [ ] Test NO modal per movimento indietro
- [ ] Test responsive mobile/tablet

### Permessi
- [ ] Assegnato permesso `force_stato_rollback` ad almeno un admin senior
- [ ] Testato rollback forzato con permesso
- [ ] Testato rollback senza permesso (deve fallire)
- [ ] Verificato log operazioni critiche

### Documentazione
- [ ] README aggiornato (questo file copiato in docs/)
- [ ] Team informato delle nuove funzionalità
- [ ] Procedure operative aggiornate

---

## 🐛 Troubleshooting

### Problema: Modal non appare
**Causa**: Import ConfirmModal mancante o path errato
**Soluzione**: Verifica import in `FoglioAssistenzaFormPage.jsx`:
```javascript
import ConfirmModal from '../components/ConfirmModal';
```

### Problema: Errore "PERMESSO NEGATO" su rollback
**Causa**: Utente non ha permesso `force_stato_rollback`
**Soluzione**:
1. Vai su `/permessi-speciali` come admin
2. Attiva permesso per l'utente
3. Riprova operazione

### Problema: Log non viene creato
**Causa**: Trigger non attivo o campo `nota_stato_foglio` vuoto
**Soluzione**:
```sql
-- Verifica trigger attivo
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = 'log_stato_foglio_trigger';
-- tgenabled deve essere 'O' (enabled)

-- Se disabilitato, riabilita:
ALTER TABLE fogli_assistenza ENABLE TRIGGER log_stato_foglio_trigger;
```

### Problema: Test automatici falliscono
**Causa**: Dati mancanti (clienti, commesse, tecnici)
**Soluzione**: Verifica che ci siano dati nelle tabelle master:
```sql
SELECT COUNT(*) FROM clienti;
SELECT COUNT(*) FROM commesse;
SELECT COUNT(*) FROM tecnici;
```

---

## 📞 Supporto

Per problemi o domande:
1. Consulta questo README
2. Controlla i log del database per errori
3. Verifica i log browser console (F12) per errori React
4. Contatta il team di sviluppo con:
   - Screenshot dell'errore
   - ID foglio coinvolto
   - User che ha riscontrato il problema
   - Timestamp dell'operazione

---

**Data ultima modifica**: 2025-12-05
**Versione**: 1.0.0
