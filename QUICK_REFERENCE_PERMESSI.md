# ⚡ Quick Reference - Permessi Admin Senior

**Query SQL Pronte all'Uso** - Copia e Incolla!

---

## 🚀 Assegna Permesso

```sql
-- SOSTITUISCI: 'TUA_EMAIL@example.com' con l'email dell'utente
SELECT set_special_permission(
    (SELECT p.id
     FROM profiles p
     JOIN auth.users au ON p.id = au.id
     WHERE au.email = 'TUA_EMAIL@example.com'),
    'force_stato_rollback',
    true
);
```

**Output atteso**: `set_special_permission` (vuoto = successo)

---

## ❌ Rimuovi Permesso

```sql
-- SOSTITUISCI: 'TUA_EMAIL@example.com' con l'email dell'utente
SELECT set_special_permission(
    (SELECT p.id
     FROM profiles p
     JOIN auth.users au ON p.id = au.id
     WHERE au.email = 'TUA_EMAIL@example.com'),
    'force_stato_rollback',
    false
);
```

---

## 👥 Lista Tutti gli Utenti (per trovare le email)

```sql
-- Mostra tutti gli utenti con email e ruolo
SELECT au.email, p.full_name, p.role
FROM profiles p
JOIN auth.users au ON p.id = au.id
ORDER BY p.role, au.email;
```

---

## ✅ Verifica Chi Ha Permessi

```sql
-- Lista utenti con permessi speciali attivi
SELECT * FROM get_users_with_special_permissions();
```

---

## 🔍 Verifica Permesso di UN Utente

```sql
-- SOSTITUISCI: 'TUA_EMAIL@example.com' con l'email da verificare
SELECT
    au.email,
    p.full_name,
    p.role,
    (p.permessi_speciali->>'force_stato_rollback')::boolean as ha_permesso_rollback
FROM profiles p
LEFT JOIN auth.users au ON p.id = au.id
WHERE au.email = 'TUA_EMAIL@example.com';
```

---

## 📊 Report Utilizzo Permessi (ultimo mese)

```sql
SELECT * FROM report_utilizzo_permessi_speciali(CURRENT_DATE - 30, CURRENT_DATE);
```

---

## 🧪 Test Permesso (Esempio Completo)

```sql
-- 1. Trova un admin
SELECT au.email, p.full_name
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE p.role = 'admin'
LIMIT 5;

-- 2. Assegna permesso (usa email dal step 1)
SELECT set_special_permission(
    (SELECT p.id
     FROM profiles p
     JOIN auth.users au ON p.id = au.id
     WHERE au.email = 'admin@example.com'),
    'force_stato_rollback',
    true
);

-- 3. Verifica
SELECT * FROM get_users_with_special_permissions();

-- 4. (Opzionale) Rimuovi per cleanup
SELECT set_special_permission(
    (SELECT p.id
     FROM profiles p
     JOIN auth.users au ON p.id = au.id
     WHERE au.email = 'admin@example.com'),
    'force_stato_rollback',
    false
);
```

---

## 🎯 Esempio Reale

**Obiettivo**: Dare permesso rollback a `luca.rossi@oilsafe.it`

```sql
-- 1. Verifica che esista
SELECT au.email, p.full_name, p.role
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = 'luca.rossi@oilsafe.it';

-- 2. Assegna permesso
SELECT set_special_permission(
    (SELECT p.id
     FROM profiles p
     JOIN auth.users au ON p.id = au.id
     WHERE au.email = 'luca.rossi@oilsafe.it'),
    'force_stato_rollback',
    true
);

-- 3. Conferma
SELECT * FROM get_users_with_special_permissions()
WHERE email = 'luca.rossi@oilsafe.it';
```

**Output Step 3**:
```
user_id | email                    | full_name | role  | force_stato_rollback | created_at
--------|--------------------------|-----------|-------|----------------------|------------
abc123  | luca.rossi@oilsafe.it    | Luca R.   | admin | true                 | 2024-01-15
```

---

## ⚠️ Nota Importante

**L'email è in `auth.users`, NON in `profiles`!**

❌ **SBAGLIATO**:
```sql
SELECT id FROM profiles WHERE email = '...'  -- ERRORE: colonna non esiste!
```

✅ **CORRETTO**:
```sql
SELECT p.id
FROM profiles p
JOIN auth.users au ON p.id = au.id
WHERE au.email = '...'
```

---

## 📖 Documentazione Completa

Per maggiori dettagli, consulta:
- **[GUIDA_PERMESSI_ADMIN_SENIOR.md](GUIDA_PERMESSI_ADMIN_SENIOR.md)** - Guida completa con UI web
- **[ESECUZIONE_SCRIPT_DATABASE.md](ESECUZIONE_SCRIPT_DATABASE.md)** - Query utili database

---

**Data**: 2025-12-05 | **Versione**: 1.0.0
