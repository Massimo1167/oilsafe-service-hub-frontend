# ⚡ Quick Start - Stati Irreversibili

Guida rapida per l'implementazione completa in **45 minuti**.

---

## 📋 Prerequisiti

- [ ] Backup database effettuato
- [ ] Accesso a Supabase SQL Editor
- [ ] Ambiente di sviluppo Node.js funzionante
- [ ] Git commit di sicurezza fatto

---

## 🚀 ESECUZIONE RAPIDA

### 1️⃣ Script HOTFIX (5 minuti)

```bash
# File: database query/HOTFIX_recupero_foglio_FLE_00000044.sql
```

1. Apri Supabase SQL Editor
2. Copia e incolla TUTTO il contenuto del file
3. Clicca "Run"
4. ✅ Verifica output: "HOTFIX COMPLETATO CON SUCCESSO"

**Test rapido**:
```sql
SELECT numero_foglio, stato_foglio FROM fogli_assistenza WHERE numero_foglio = 'FLE_00000044';
-- Atteso: stato_foglio = 'Aperto'
```

---

### 2️⃣ Script FIX Trigger (10 minuti)

```bash
# File: database query/92. FIX_validate_pianificazione_sync_trigger.sql
```

1. Apri Supabase SQL Editor
2. Copia e incolla TUTTO il contenuto del file
3. Clicca "Run"
4. ✅ Verifica output: "TUTTI I TEST PASSATI ✓"

---

### 3️⃣ Script LOG Modifiche (15 minuti)

```bash
# File: database query/93. Log_modifiche_stato_foglio.sql
```

1. Apri Supabase SQL Editor
2. Copia e incolla TUTTO il contenuto del file
3. Clicca "Run"
4. ✅ Verifica output: "TUTTI I TEST PASSATI ✓"

**Test rapido**:
```sql
-- Cambia uno stato
UPDATE fogli_assistenza
SET stato_foglio = 'In Lavorazione', nota_stato_foglio = 'Test log'
WHERE numero_foglio = 'FLE_00000044';

-- Verifica log creato
SELECT * FROM log_modifiche_stato_foglio
WHERE numero_foglio = 'FLE_00000044'
ORDER BY data_modifica DESC LIMIT 1;
-- Atteso: 1 riga con il cambio appena fatto
```

---

### 4️⃣ Script PERMESSI Admin (15 minuti)

```bash
# File: database query/94. Permessi_admin_senior_rollback.sql
```

1. Apri Supabase SQL Editor
2. Copia e incolla TUTTO il contenuto del file
3. Clicca "Run"
4. ✅ Verifica output: "TUTTI I TEST PASSATI ✓"

---

## 🎨 Frontend Integration

### 5️⃣ Aggiungi Route (5 minuti)

**File**: `src/App.jsx`

Cerca la sezione `<Routes>` e aggiungi:

```javascript
import PermessiSpecialiPage from './pages/PermessiSpecialiPage';

// Nelle routes:
<Route path="/permessi-speciali" element={<PermessiSpecialiPage session={session} />} />
```

### 6️⃣ Aggiungi Link Menu

Nel tuo componente di navigazione, aggiungi (solo per admin):

```javascript
{userRole === 'admin' && (
    <Link to="/permessi-speciali">Permessi Speciali</Link>
)}
```

---

## ✅ TEST FINALE (5 minuti)

### Test 1: Modal Conferma

```bash
npm run dev
```

1. Login come User
2. Apri un foglio in stato "In Lavorazione"
3. Cambia a "Completato"
4. ✅ **Atteso**: Modal di conferma appare

### Test 2: Pagina Permessi

1. Login come Admin
2. Vai su `/permessi-speciali`
3. ✅ **Atteso**: Lista utenti con toggle permessi

### Test 3: Rollback da Database

```sql
-- Crea foglio test
INSERT INTO fogli_assistenza (numero_foglio, data_apertura_foglio, stato_foglio, cliente_id, commessa_id)
SELECT 'TEST_001', CURRENT_DATE, 'Aperto',
    (SELECT id FROM clienti LIMIT 1),
    (SELECT id FROM commesse LIMIT 1);

-- Passa a Completato
UPDATE fogli_assistenza SET stato_foglio = 'Completato' WHERE numero_foglio = 'TEST_001';

-- Torna a Aperto (prima falliva!)
UPDATE fogli_assistenza SET stato_foglio = 'Aperto' WHERE numero_foglio = 'TEST_001';
-- ✅ Atteso: Successo (nessun errore)

-- Cleanup
DELETE FROM fogli_assistenza WHERE numero_foglio = 'TEST_001';
```

---

## 🎯 RISULTATI FINALI

Dopo l'implementazione avrai:

✅ **Hotfix**: Foglio FLE_00000044 recuperato
✅ **Fix Permanente**: Trigger corretto per sempre
✅ **Logging**: Audit trail completo di ogni cambio stato
✅ **Permessi**: Admin senior può forzare rollback in emergenze
✅ **Modal UI**: Conferma per stati irreversibili
✅ **Gestione Permessi**: Pagina admin per assegnare permessi

---

## 📊 Query Rapide Post-Implementazione

### Storico modifiche foglio
```sql
SELECT * FROM get_storico_stato_foglio('<foglio_id>');
```

### Utenti con permessi speciali
```sql
SELECT * FROM get_users_with_special_permissions();
```

### Assegna permesso rollback
```sql
SELECT set_special_permission(
    (SELECT id FROM profiles WHERE email = '<admin_email>' LIMIT 1),
    'force_stato_rollback',
    true
);
```

---

## 🐛 Problemi Comuni

**Script fallisce con errore "null value in column"**
→ Assicurati di avere almeno un admin nel database

**Modal non appare**
→ Verifica import in FoglioAssistenzaFormPage:
```javascript
import ConfirmModal from '../components/ConfirmModal';
```

**Pagina permessi non accessibile**
→ Verifica route aggiunta in App.jsx

---

## 📞 Documentazione Completa

Per maggiori dettagli consulta:
- `ESECUZIONE_SCRIPT_DATABASE.md` - Guida completa con troubleshooting
- `IMPLEMENTAZIONE_STATI_IRREVERSIBILI.md` - Documentazione tecnica dettagliata

---

**Tempo totale**: 45-60 minuti
**Difficoltà**: Media
**Impatto**: Alto (risolve bug critico + aggiunge funzionalità importanti)
