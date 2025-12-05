# 🔐 Guida Gestione Permessi Admin Senior

**Data**: 2025-12-05
**Versione**: 1.0.0

---

## 📋 Panoramica

I **permessi admin senior** permettono operazioni critiche come forzare il rollback di fogli da stati avanzati (Consuntivato, Fatturato, etc.) a stati precedenti.

---

## 🎯 DUE METODI DI GESTIONE

### Metodo 1: UI Web (Consigliato) 👍
### Metodo 2: SQL Diretto (Per emergenze)

---

## 📱 METODO 1: Tramite UI Web

### Step 1: Aggiungi Import in App.jsx

**File**: `src/App.jsx`

Cerca la sezione degli import delle pagine (intorno alla riga 10-27) e aggiungi:

```javascript
import PermessiSpecialiPage from './pages/PermessiSpecialiPage';
```

**Esempio completo**:
```javascript
// Importa Pagine
import DashboardPage from './pages/DashboardPage';
import InfoPage from './pages/InfoPage';
import LoginPage from './pages/LoginPage';
// ... altre pagine ...
import PermessiSpecialiPage from './pages/PermessiSpecialiPage';  // ← AGGIUNGI QUESTA
```

---

### Step 2: Aggiungi Route

Cerca la sezione `<Routes>` in `App.jsx` (probabilmente intorno alla riga 300-400) e aggiungi:

```javascript
<Route
  path="/permessi-speciali"
  element={<PermessiSpecialiPage session={session} />}
/>
```

**Cerca questo pattern** nel codice:
```javascript
<Routes>
  <Route path="/" element={<ProtectedRoute session={session} />}>
    <Route index element={<DashboardPage ... />} />
    <Route path="fogli-assistenza" element={...} />
    {/* ... altre route ... */}

    {/* AGGIUNGI QUI: */}
    <Route
      path="permessi-speciali"
      element={<PermessiSpecialiPage session={session} />}
    />
  </Route>
</Routes>
```

---

### Step 3: Aggiungi Link nel Menu (Opzionale)

Se vuoi un link nel menu di navigazione visibile solo agli admin, cerca il componente menu/navbar e aggiungi:

```javascript
{userRole === 'admin' && (
  <Link to="/permessi-speciali" className="nav-link">
    🔐 Permessi Speciali
  </Link>
)}
```

**Nota**: Il link è opzionale. Puoi accedere direttamente digitando l'URL `/permessi-speciali`.

---

### Step 4: Avvia l'App

```bash
npm run dev
```

---

### Step 5: Accedi alla Pagina Permessi

1. **Login come Admin**
2. Vai su: `http://localhost:5173/permessi-speciali` (o il tuo URL)
3. Vedrai la lista di tutti gli utenti con toggle per i permessi

**Screenshot della UI**:
```
┌─────────────────────────────────────────────────────────┐
│ Gestione Permessi Speciali              [← Torna]      │
├─────────────────────────────────────────────────────────┤
│ ℹ️ Informazioni sui Permessi Speciali                   │
│ • force_stato_rollback: Permette rollback da stati     │
│   avanzati (Fatturato, Consuntivato, etc.)             │
├─────────────────────────────────────────────────────────┤
│ Email              | Nome      | Ruolo  | Force Rollback│
│────────────────────┼───────────┼────────┼───────────────│
│ admin@example.com  | Mario R.  | admin  | [OFF] 🔘     │
│ senior@example.com | Luca B.   | admin  | [ON]  🟢     │
│ manager@test.com   | Anna V.   | manager| [OFF] 🔘     │
└─────────────────────────────────────────────────────────┘
```

---

### Step 6: Assegna/Rimuovi Permessi

1. **Trova l'utente** a cui vuoi assegnare il permesso
2. **Clicca sul toggle** "Force Rollback Stato"
   - Toggle OFF (grigio) → Nessun permesso
   - Toggle ON (verde) → Permesso attivo
3. Vedrai un **messaggio di conferma**: "Permesso assegnato a..."

**Nota**: L'operazione è immediata, nessun pulsante "Salva" da cliccare!

---

## 💾 METODO 2: Tramite SQL Diretto

### Quando Usare SQL Diretto?
- Quando la UI non è disponibile
- Per assegnazioni massive
- Per script di automazione
- In fase di setup iniziale

---

### Query SQL per Gestire Permessi

#### 1. Assegna Permesso a un Utente

```sql
-- Metodo A: Usando la funzione dedicata (CONSIGLIATO)
SELECT set_special_permission(
    (SELECT p.id
     FROM profiles p
     JOIN auth.users au ON p.id = au.id
     WHERE au.email = 'admin.senior@example.com'
     LIMIT 1),
    'force_stato_rollback',
    true
);
```

**Oppure** con UPDATE diretto:
```sql
-- Metodo B: UPDATE manuale
UPDATE public.profiles
SET permessi_speciali = jsonb_set(
    COALESCE(permessi_speciali, '{}'::jsonb),
    '{force_stato_rollback}',
    'true'::jsonb
)
WHERE id = (
    SELECT p.id
    FROM profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE au.email = 'admin.senior@example.com'
);
```

---

#### 2. Rimuovi Permesso da un Utente

```sql
-- Metodo A: Usando la funzione
SELECT set_special_permission(
    (SELECT p.id
     FROM profiles p
     JOIN auth.users au ON p.id = au.id
     WHERE au.email = 'admin.senior@example.com'
     LIMIT 1),
    'force_stato_rollback',
    false
);
```

**Oppure**:
```sql
-- Metodo B: UPDATE manuale (rimuove completamente il permesso)
UPDATE public.profiles
SET permessi_speciali = permessi_speciali - 'force_stato_rollback'
WHERE id = (
    SELECT p.id
    FROM profiles p
    JOIN auth.users au ON p.id = au.id
    WHERE au.email = 'admin.senior@example.com'
);
```

---

#### 3. Verifica Chi Ha Permessi

```sql
-- Lista utenti con permessi speciali
SELECT * FROM get_users_with_special_permissions();
```

**Output atteso**:
```
user_id              | email                  | full_name | role  | force_stato_rollback | created_at
─────────────────────┼────────────────────────┼───────────┼───────┼──────────────────────┼────────────
abc123...            | senior@example.com     | Luca B.   | admin | true                 | 2024-01-15
def456...            | admin@example.com      | Mario R.  | admin | false                | 2024-01-10
```

---

#### 4. Verifica Permesso di un Utente Specifico

```sql
SELECT
    au.email,
    p.full_name,
    p.role,
    (p.permessi_speciali->>'force_stato_rollback')::boolean as ha_permesso_rollback,
    p.permessi_speciali as tutti_permessi
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.email = 'admin.senior@example.com';
```

---

#### 5. Assegna Permesso a Tutti gli Admin

```sql
-- ATTENZIONE: Operazione massiva!
UPDATE public.profiles
SET permessi_speciali = jsonb_set(
    COALESCE(permessi_speciali, '{}'::jsonb),
    '{force_stato_rollback}',
    'true'::jsonb
)
WHERE role = 'admin';

-- Verifica quanti admin sono stati aggiornati
SELECT COUNT(*) FROM profiles WHERE role = 'admin';
```

---

## 🔍 Query di Verifica e Monitoraggio

### Storico Utilizzo Permessi

```sql
-- Report utilizzo permessi ultimi 30 giorni
SELECT * FROM report_utilizzo_permessi_speciali(
    CURRENT_DATE - 30,
    CURRENT_DATE
);
```

**Output**:
```
data_operazione      | tipo_operazione         | user_email         | dettagli
─────────────────────┼─────────────────────────┼────────────────────┼──────────────────
2025-12-05 10:30:00  | FORCE_ROLLBACK_STATO    | senior@example.com | Rollback foglio...
2025-12-04 15:20:00  | MODIFICA_PERMESSO_...   | admin@example.com  | Utente abc...
```

---

### Log Rollback Forzati

```sql
-- Storia rollback forzati ultimi 30 giorni
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

### Conta Utenti con Permessi

```sql
-- Quanti utenti hanno almeno un permesso speciale?
SELECT COUNT(*) as utenti_con_permessi
FROM profiles
WHERE permessi_speciali IS NOT NULL
  AND permessi_speciali != '{}'::jsonb;

-- Quanti hanno il permesso rollback?
SELECT COUNT(*) as utenti_con_rollback
FROM profiles
WHERE (permessi_speciali->>'force_stato_rollback')::boolean = true;
```

---

## ⚙️ Come Funziona il Permesso

### Quando Serve il Permesso?

Il permesso `force_stato_rollback` è richiesto quando:

| Da Stato | A Stato | Richiede Permesso? |
|----------|---------|-------------------|
| Completato | Aperto | ❌ NO (sempre permesso) |
| Completato | In Lavorazione | ❌ NO |
| **Consuntivato** | Aperto | ✅ **SÌ** |
| **Fatturato** | Completato | ✅ **SÌ** |
| **Chiuso** | Consuntivato | ✅ **SÌ** |
| Inviato | In Lavorazione | ✅ **SÌ** |

**Regola**: Rollback **DA stati >= Consuntivato** richiede permesso speciale.

---

### Cosa Succede Senza Permesso?

Se un utente tenta un rollback da stato avanzato **senza permesso**:

```
❌ ERRORE: PERMESSO NEGATO
Non hai il permesso di forzare il rollback dello stato da "Fatturato" a "Aperto".
Questa operazione è riservata agli amministratori senior.
Contatta un amministratore se è necessario correggere un errore.
```

---

### Tracciamento Automatico

Ogni volta che un admin senior usa il permesso:
1. ✅ Operazione registrata in `log_operazioni_critiche`
2. ✅ Timestamp preciso
3. ✅ User che ha eseguito l'operazione
4. ✅ Dettagli: numero foglio, stato precedente → nuovo

**Nessuna operazione critica passa inosservata!** 🕵️

---

## 🎯 Workflow Completo: Assegnazione Permesso

### Scenario: Assegnare permesso a "luca.bianchi@oilsafe.it"

#### Via UI:
1. Login come admin principale
2. Vai su `/permessi-speciali`
3. Cerca "luca.bianchi@oilsafe.it"
4. Attiva toggle "Force Rollback Stato"
5. ✅ Fatto! Messaggio: "Permesso assegnato a luca.bianchi@oilsafe.it"

#### Via SQL:
```sql
-- 1. Verifica che l'utente esista
SELECT au.email, p.full_name, p.role
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.email = 'luca.bianchi@oilsafe.it';

-- 2. Assegna permesso
SELECT set_special_permission(
    (SELECT id FROM profiles p
     JOIN auth.users au ON p.id = au.id
     WHERE au.email = 'luca.bianchi@oilsafe.it'
     LIMIT 1),
    'force_stato_rollback',
    true
);

-- 3. Verifica permesso assegnato
SELECT * FROM get_users_with_special_permissions()
WHERE email = 'luca.bianchi@oilsafe.it';
```

**Output atteso Step 3**:
```
email                    | full_name | role  | force_stato_rollback
─────────────────────────┼───────────┼───────┼─────────────────────
luca.bianchi@oilsafe.it  | Luca B.   | admin | true
```

---

## 🧪 Test del Permesso

### Test 1: Senza Permesso (Deve Fallire)

```sql
-- Login come admin SENZA permesso
-- Prova a fare rollback da Fatturato a Aperto

UPDATE fogli_assistenza
SET stato_foglio = 'Aperto'
WHERE numero_foglio = 'FLE_00000001'
  AND stato_foglio = 'Fatturato';

-- Atteso: ERRORE "PERMESSO NEGATO"
```

---

### Test 2: Con Permesso (Deve Funzionare)

```sql
-- 1. Assegna permesso (come admin principale)
SELECT set_special_permission(
    (SELECT id FROM profiles WHERE email = (SELECT email FROM auth.users WHERE email = 'test@admin.it')),
    'force_stato_rollback',
    true
);

-- 2. Login come test@admin.it e prova rollback
UPDATE fogli_assistenza
SET stato_foglio = 'Aperto',
    nota_stato_foglio = 'Rollback forzato per correzione errore'
WHERE numero_foglio = 'FLE_00000001'
  AND stato_foglio = 'Fatturato';

-- Atteso: SUCCESS + log in log_operazioni_critiche
```

---

### Test 3: Verifica Log

```sql
-- Verifica che il rollback sia stato loggato
SELECT * FROM log_operazioni_critiche
WHERE tipo_operazione = 'FORCE_ROLLBACK_STATO'
ORDER BY created_at DESC
LIMIT 1;
```

---

## ⚠️ Best Practices

### ✅ DA FARE:
- Assegna il permesso **solo ad admin senior di massima fiducia**
- Documenta perché è stato assegnato un permesso
- Controlla regolarmente i log di utilizzo
- Rimuovi il permesso quando non più necessario

### ❌ NON FARE:
- Assegnare il permesso a tutti gli admin
- Lasciare permessi attivi indefinitamente
- Ignorare i log di utilizzo
- Usare il permesso per operazioni di routine

---

## 📞 Troubleshooting

### Problema: Pagina Permessi non accessibile

**Causa**: Route non aggiunta o import mancante
**Soluzione**: Verifica Step 1 e 2 sopra

---

### Problema: Toggle non funziona

**Causa**: Errore JavaScript o problemi di connessione
**Soluzione**:
1. Apri console browser (F12)
2. Cerca errori
3. Verifica connessione database
4. Prova con SQL diretto (Metodo 2)

---

### Problema: Permesso non si applica

**Causa**: Cache o sessione non aggiornata
**Soluzione**:
1. Logout e rilogin
2. Verifica con query SQL che il permesso sia salvato
3. Controlla che l'utente sia autenticato correttamente

---

### Problema: Query SQL ritorna 0 righe

**Causa**: Email errata o utente non esiste
**Soluzione**:
```sql
-- Lista TUTTE le email disponibili
SELECT au.email, p.role
FROM profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY au.email;
```

---

## 📚 Riferimenti

- **Documentazione completa**: [IMPLEMENTAZIONE_STATI_IRREVERSIBILI.md](IMPLEMENTAZIONE_STATI_IRREVERSIBILI.md)
- **Script database**: `database query/94. Permessi_admin_senior_rollback.sql`
- **Componente UI**: `src/pages/PermessiSpecialiPage.jsx`
- **Query utili**: [ESECUZIONE_SCRIPT_DATABASE.md](ESECUZIONE_SCRIPT_DATABASE.md)

---

## 🎓 Riepilogo Comandi Rapidi

```sql
-- Assegna permesso (sostituisci l'email)
SELECT set_special_permission(
    (SELECT p.id FROM profiles p JOIN auth.users au ON p.id = au.id WHERE au.email = 'TUA_EMAIL@example.com'),
    'force_stato_rollback',
    true
);

-- Rimuovi permesso (sostituisci l'email)
SELECT set_special_permission(
    (SELECT p.id FROM profiles p JOIN auth.users au ON p.id = au.id WHERE au.email = 'TUA_EMAIL@example.com'),
    'force_stato_rollback',
    false
);

-- Lista utenti con permessi
SELECT * FROM get_users_with_special_permissions();

-- Report utilizzo
SELECT * FROM report_utilizzo_permessi_speciali(CURRENT_DATE - 30, CURRENT_DATE);
```

---

**Data ultima modifica**: 2025-12-05
**Versione**: 1.0.0
**Autore**: Sistema Claude Code
