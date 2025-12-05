# 🚀 Guida Esecuzione Script Database - Stati Irreversibili

**Data**: 2025-12-05
**Versione**: 1.0.0

---

## 📋 Panoramica

Questa guida fornisce l'ordine esatto di esecuzione degli script SQL per implementare il sistema di stati irreversibili, logging e permessi admin senior.

## ⚠️ IMPORTANTE - Prima di Iniziare

1. **Backup**: Esegui un backup completo del database
2. **Ambiente**: Verifica di essere connesso al database corretto
3. **Connessione**: Usa Supabase SQL Editor o un client PostgreSQL (pgAdmin, DBeaver, etc.)
4. **Test**: Se possibile, esegui prima in ambiente di test/staging

---

## 📝 ORDINE DI ESECUZIONE

### ✅ FASE 1: HOTFIX Emergenza (5 minuti)

**Script**: `database query/HOTFIX_recupero_foglio_FLE_00000044.sql`

**Scopo**: Recuperare immediatamente il foglio FLE_00000044 bloccato in stato "Completato"

**Azioni**:
1. Apri Supabase SQL Editor
2. Copia e incolla l'intero contenuto dello script
3. Esegui lo script
4. Verifica l'output: dovresti vedere messaggi di successo e il foglio tornato a "Aperto"

**Verifica manuale**:
```sql
SELECT numero_foglio, stato_foglio, creato_da_user_id
FROM public.fogli_assistenza
WHERE numero_foglio = 'FLE_00000044';
-- Deve mostrare stato_foglio = 'Aperto'
```

**Nota**: Questo script disabilita temporaneamente i trigger, fa le modifiche, e li riabilita. È sicuro.

---

### ✅ FASE 2: Correzione Trigger (10 minuti)

**Script**: `database query/92. FIX_validate_pianificazione_sync_trigger.sql`

**Scopo**: Correggere permanentemente il bug nel trigger di validazione per permettere la transizione Completata → Confermata

**Azioni**:
1. Apri Supabase SQL Editor
2. Copia e incolla l'intero contenuto dello script
3. Esegui lo script
4. Verifica che i test automatici passino (vedrai i messaggi "✓ TEST PASSATO")

**Output atteso**:
```
NOTICE: AVVIO TEST CORREZIONE validate_pianificazione
NOTICE: Foglio test creato: TEST_FIX_... (ID: ...)
NOTICE: ✓ TEST 1 PASSATO: Pianificazione aggiornata a Completata
NOTICE: ✓ TEST 2 PASSATO: Pianificazione riportata a Confermata
NOTICE: ✓ TEST 3 PASSATO: Ciclo completo funziona correttamente
NOTICE: TUTTI I TEST PASSATI ✓
```

**Cosa fa lo script**:
- Ricrea la funzione `validate_pianificazione()` con logica corretta
- Aggiunge SKIP VALIDAZIONE 2 per permettere Completata → Confermata
- Esegue test automatici per verificare la correzione
- Cleanup automatico dei dati di test

---

### ✅ FASE 3: Sistema di Logging (15 minuti)

**Script**: `database query/93. Log_modifiche_stato_foglio.sql`

**Scopo**: Creare sistema di logging automatico per tutte le modifiche di stato con audit trail completo

**Azioni**:
1. Apri Supabase SQL Editor
2. Copia e incolla l'intero contenuto dello script
3. Esegui lo script
4. Verifica che i test automatici passino

**Output atteso**:
```
NOTICE: AVVIO TEST SISTEMA LOG MODIFICHE STATO
NOTICE: Foglio test creato: TEST_LOG_...
NOTICE: ✓ TEST PASSATO: 3 record di log creati correttamente
NOTICE: ✓ Funzione get_storico_stato_foglio funziona correttamente
NOTICE: TUTTI I TEST PASSATI ✓
```

**Cosa crea lo script**:
- Tabella `log_modifiche_stato_foglio` con trigger automatico
- Funzione trigger `log_cambio_stato_foglio()` che si attiva ad ogni cambio stato
- RLS policies per accesso controllato
- Funzioni utility: `get_storico_stato_foglio()`, `report_modifiche_stato()`

**Verifica post-esecuzione**:
```sql
-- Modifica uno stato per test
UPDATE public.fogli_assistenza
SET
    stato_foglio = 'In Lavorazione',
    nota_stato_foglio = 'Test logging manuale'
WHERE numero_foglio = 'FLE_00000044';

-- Verifica log creato
SELECT
    data_modifica,
    stato_precedente,
    stato_nuovo,
    motivo_modifica
FROM public.log_modifiche_stato_foglio
WHERE numero_foglio = 'FLE_00000044'
ORDER BY data_modifica DESC
LIMIT 1;
-- Deve mostrare il log appena creato
```

---

### ✅ FASE 4: Permessi Admin Senior (15 minuti)

**Script**: `database query/94. Permessi_admin_senior_rollback.sql`

**Scopo**: Creare sistema di permessi granulari per admin senior con possibilità di forzare rollback

**Azioni**:
1. Apri Supabase SQL Editor
2. Copia e incolla l'intero contenuto dello script
3. Esegui lo script
4. Verifica che i test automatici passino

**Output atteso**:
```
NOTICE: AVVIO TEST SISTEMA PERMESSI ADMIN SENIOR
NOTICE: ✓ TEST 1 PASSATO: Permesso force_stato_rollback impostato
NOTICE: ✓ TEST 2 PASSATO: Struttura permessi corretta
NOTICE: ✓ TEST 3 PASSATO: Funzione get_users_with_special_permissions funziona
NOTICE: TUTTI I TEST PASSATI ✓
```

**Cosa crea lo script**:
- Campo `permessi_speciali` (JSONB) in tabella profiles
- Tabella `log_operazioni_critiche` per tracciare utilizzo permessi
- Funzioni: `has_special_permission()`, `set_special_permission()`
- Modifica trigger `sync_pianificazione_stato_foglio()` per verificare permesso rollback
- RLS policies per log operazioni critiche

**Verifica post-esecuzione**:
```sql
-- Lista utenti (nessuno dovrebbe avere permessi speciali ora)
SELECT * FROM get_users_with_special_permissions();
-- Risultato atteso: 0 righe
```

---

## 🎨 FRONTEND - Integrazione UI (NON SQL)

Dopo aver eseguito tutti gli script SQL, devi integrare i componenti frontend.

### 1. Verifica File React Esistenti

I seguenti file sono già stati creati:
- ✅ `src/components/ConfirmModal.jsx`
- ✅ `src/components/ConfirmModal.css`
- ✅ `src/pages/FoglioAssistenzaFormPage.jsx` (modificato con modal)
- ✅ `src/pages/PermessiSpecialiPage.jsx`
- ✅ `src/pages/PermessiSpecialiPage.css`

### 2. Aggiungi Route in App.jsx

**File**: [src/App.jsx](src/App.jsx)

Cerca la sezione delle route e aggiungi:

```javascript
import PermessiSpecialiPage from './pages/PermessiSpecialiPage';

// Nella sezione <Routes>:
<Route
    path="/permessi-speciali"
    element={<PermessiSpecialiPage session={session} />}
/>
```

### 3. Aggiungi Link nel Menu (solo per Admin)

Nel componente di navigazione/menu, aggiungi:

```javascript
{userRole === 'admin' && (
    <Link to="/permessi-speciali">
        Permessi Speciali
    </Link>
)}
```

### 4. Test Frontend in Sviluppo

```bash
npm run dev
```

Testa:
1. ✅ Modal appare quando User passa a "Completato"
2. ✅ Modal appare quando Admin passa a "Consuntivato"
3. ✅ NO modal per movimento indietro
4. ✅ Pagina `/permessi-speciali` accessibile solo ad admin
5. ✅ Toggle permessi funziona correttamente

---

## 🧪 TEST COMPLETO POST-IMPLEMENTAZIONE

### Test 1: Verifica Correzione Trigger

```sql
-- Crea foglio test
INSERT INTO public.fogli_assistenza (
    numero_foglio,
    data_apertura_foglio,
    stato_foglio,
    cliente_id,
    commessa_id
)
SELECT
    'TEST_MANUALE_001',
    CURRENT_DATE,
    'Aperto',
    (SELECT id FROM public.clienti LIMIT 1),
    (SELECT id FROM public.commesse LIMIT 1);

-- Passa a Completato
UPDATE public.fogli_assistenza
SET stato_foglio = 'Completato'
WHERE numero_foglio = 'TEST_MANUALE_001';
-- Atteso: Successo

-- Torna a Aperto (prima falliva!)
UPDATE public.fogli_assistenza
SET stato_foglio = 'Aperto'
WHERE numero_foglio = 'TEST_MANUALE_001';
-- Atteso: Successo (nessun errore)

-- Verifica pianificazioni (se esistono)
SELECT stato_pianificazione
FROM public.pianificazioni
WHERE foglio_assistenza_id = (
    SELECT id FROM public.fogli_assistenza WHERE numero_foglio = 'TEST_MANUALE_001'
);
-- Atteso: stato_pianificazione = 'Confermata'

-- Cleanup
DELETE FROM public.fogli_assistenza WHERE numero_foglio = 'TEST_MANUALE_001';
```

### Test 2: Verifica Sistema Logging

```sql
-- Cambia stato foglio
UPDATE public.fogli_assistenza
SET
    stato_foglio = 'Completato',
    nota_stato_foglio = 'Test verifica logging'
WHERE numero_foglio = 'FLE_00000044';

-- Verifica log creato
SELECT
    data_modifica,
    stato_precedente,
    stato_nuovo,
    motivo_modifica
FROM public.log_modifiche_stato_foglio
WHERE numero_foglio = 'FLE_00000044'
ORDER BY data_modifica DESC
LIMIT 1;
-- Atteso: 1 riga con il cambio appena effettuato

-- Test funzione storico
SELECT * FROM get_storico_stato_foglio(
    (SELECT id FROM public.fogli_assistenza WHERE numero_foglio = 'FLE_00000044')
);
-- Atteso: Lista completa di tutti i cambi di stato del foglio
```

### Test 3: Verifica Permessi Admin Senior

```sql
-- 1. Assegna permesso a un admin (sostituisci <admin_email>)
SELECT set_special_permission(
    (SELECT id FROM public.profiles WHERE email = '<admin_email>' LIMIT 1),
    'force_stato_rollback',
    true
);

-- 2. Verifica permesso assegnato
SELECT
    email,
    permessi_speciali->>'force_stato_rollback' as has_rollback_permission
FROM public.profiles
WHERE email = '<admin_email>';
-- Atteso: has_rollback_permission = 'true'

-- 3. Test rollback forzato (SOLO se autenticato come admin con permesso!)
-- Crea foglio in stato avanzato
INSERT INTO public.fogli_assistenza (
    numero_foglio,
    data_apertura_foglio,
    stato_foglio,
    cliente_id,
    commessa_id
)
SELECT
    'TEST_ROLLBACK_001',
    CURRENT_DATE,
    'Fatturato',
    (SELECT id FROM public.clienti LIMIT 1),
    (SELECT id FROM public.commesse LIMIT 1);

-- Tenta rollback (richiede permesso force_stato_rollback)
UPDATE public.fogli_assistenza
SET stato_foglio = 'Aperto'
WHERE numero_foglio = 'TEST_ROLLBACK_001';
-- Se NON hai permesso → ERRORE "PERMESSO NEGATO"
-- Se HAI permesso → Successo + log in log_operazioni_critiche

-- Verifica log operazione critica
SELECT * FROM public.log_operazioni_critiche
WHERE tipo_operazione = 'FORCE_ROLLBACK_STATO'
ORDER BY created_at DESC
LIMIT 1;

-- Cleanup
DELETE FROM public.fogli_assistenza WHERE numero_foglio = 'TEST_ROLLBACK_001';
```

---

## 📊 QUERY UTILI PER AMMINISTRATORI

### Storico Modifiche Stato Foglio

```sql
-- Storico completo per un foglio specifico
SELECT * FROM get_storico_stato_foglio('<foglio_id>');

-- Report modifiche ultimo mese
SELECT * FROM report_modifiche_stato(CURRENT_DATE - 30, CURRENT_DATE);

-- Fogli che sono tornati indietro da stati avanzati
SELECT
    numero_foglio,
    stato_precedente,
    stato_nuovo,
    motivo_modifica,
    data_modifica
FROM public.log_modifiche_stato_foglio
WHERE stato_precedente IN ('Completato', 'Consuntivato', 'Fatturato')
  AND stato_nuovo IN ('Aperto', 'In Lavorazione')
ORDER BY data_modifica DESC;

-- Conta modifiche stato per utente (ultimi 30 giorni)
SELECT
    p.full_name,
    au.email,
    COUNT(*) as num_modifiche,
    COUNT(DISTINCT l.foglio_assistenza_id) as num_fogli_unici
FROM public.log_modifiche_stato_foglio l
JOIN public.profiles p ON l.modificato_da_user_id = p.id
LEFT JOIN auth.users au ON p.id = au.id
WHERE l.data_modifica > now() - interval '30 days'
GROUP BY p.id, p.full_name, au.email
ORDER BY num_modifiche DESC;
```

### Gestione Permessi Speciali

```sql
-- Lista utenti con permessi speciali
SELECT * FROM get_users_with_special_permissions();

-- Report utilizzo permessi speciali ultimo mese
SELECT * FROM report_utilizzo_permessi_speciali(CURRENT_DATE - 30, CURRENT_DATE);

-- Utenti con permesso rollback attivo
SELECT
    au.email,
    p.full_name,
    p.role,
    (p.permessi_speciali->>'force_stato_rollback')::boolean as can_force_rollback,
    au.created_at
FROM public.profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE (p.permessi_speciali->>'force_stato_rollback')::boolean = true
ORDER BY au.email;

-- Storia utilizzi rollback forzato (ultimi 30 giorni)
SELECT
    l.created_at,
    au.email as admin_email,
    p.full_name as admin_name,
    fa.numero_foglio,
    l.dettagli
FROM public.log_operazioni_critiche l
JOIN public.profiles p ON l.user_id = p.id
LEFT JOIN auth.users au ON p.id = au.id
LEFT JOIN public.fogli_assistenza fa ON l.foglio_assistenza_id = fa.id
WHERE l.tipo_operazione = 'FORCE_ROLLBACK_STATO'
  AND l.created_at > now() - interval '30 days'
ORDER BY l.created_at DESC;
```

---

## 🐛 TROUBLESHOOTING

### Errore: "syntax error at or near 'RAISE'"

**Causa**: `RAISE NOTICE` usato fuori da blocchi `DO $$`
**Soluzione**: Lo script è già corretto, assicurati di copiarlo completamente

### Errore: "column 'updated_at' does not exist"

**Causa**: Versione vecchia dello script
**Soluzione**: Usa gli script forniti (già corretti)

### Errore: "null value in column 'modificato_da_user_id'"

**Causa**: Esecuzione in contesto senza autenticazione
**Soluzione**: Lo script è già corretto con COALESCE e creato_da_user_id da admin esistente

### Errore: "PERMESSO NEGATO" su rollback forzato

**Causa**: Utente non ha permesso `force_stato_rollback`
**Soluzione**:
1. Vai su `/permessi-speciali` come admin
2. Attiva il toggle per l'utente
3. Riprova l'operazione

### Test automatici falliscono

**Causa**: Dati mancanti (clienti, commesse, tecnici)
**Soluzione**: Verifica presenza dati:
```sql
SELECT
    (SELECT COUNT(*) FROM public.clienti) as num_clienti,
    (SELECT COUNT(*) FROM public.commesse) as num_commesse,
    (SELECT COUNT(*) FROM public.tecnici) as num_tecnici,
    (SELECT COUNT(*) FROM public.profiles WHERE role = 'admin') as num_admin;
-- Tutti devono essere > 0
```

---

## ✅ CHECKLIST POST-IMPLEMENTAZIONE

### Database
- [ ] ✅ Script HOTFIX eseguito con successo
- [ ] ✅ Foglio FLE_00000044 tornato a "Aperto"
- [ ] ✅ Script 92 FIX eseguito - test passati
- [ ] ✅ Script 93 LOG eseguito - test passati
- [ ] ✅ Script 94 PERMESSI eseguito - test passati
- [ ] ✅ Verifica manuale trigger funziona (test 1)
- [ ] ✅ Verifica manuale logging funziona (test 2)
- [ ] ✅ Verifica manuale permessi funziona (test 3)

### Frontend
- [ ] Route `/permessi-speciali` aggiunta in App.jsx
- [ ] Link menu "Permessi Speciali" aggiunto (solo admin)
- [ ] Test modal User → Completato
- [ ] Test modal Admin → Consuntivato
- [ ] Test NO modal movimento indietro
- [ ] Test pagina permessi accessibile solo ad admin
- [ ] Test toggle permessi funziona
- [ ] Test responsive mobile/tablet

### Operativo
- [ ] Assegnato permesso rollback ad almeno un admin senior di fiducia
- [ ] Team informato delle nuove funzionalità
- [ ] Documentazione aggiornata e disponibile

---

## 📞 SUPPORTO

Per problemi o domande:
1. Consulta la sezione Troubleshooting
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
**Autore**: Sistema Claude Code
