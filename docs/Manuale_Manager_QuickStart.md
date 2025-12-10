---
marp: false
---

# OilSafe Service Hub
## Guida Rapida per Manager e Admin

**Versione**: 1.1.12 | **Ultimo aggiornamento**: Dicembre 2025

---

## Come Accedere

1. Apri il browser (Chrome consigliato)
2. Vai all'indirizzo: **[inserire URL applicazione]**
3. Inserisci email e password
4. Clicca **Accedi**

> **Funziona su tutti i dispositivi**: PC, tablet e smartphone si adattano automaticamente!

---

## La Tua Dashboard

Come Manager/Admin vedi statistiche globali di tutti i fogli:
- Conteggi per ogni stato (Aperto, In Lavorazione, Completato, etc.)
- Visione complessiva del lavoro aziendale

> **Documentazione integrata (v1.1.12)**: Clicca su "Info" → "Documentazione" per manuale PDF, video tutorial e FAQ!

---

## 1. Creare una Pianificazione

### Metodo rapido

1. Dal menu vai a **Pianificazioni** → **Programmazione Settimanale**
2. Clicca su una cella vuota (incrocio tecnico/giorno)
3. Si apre il form di creazione

### Oppure dal Calendario

1. Vai a **Pianificazioni** → **Gestione Pianificazioni**
2. Clicca **+ Nuova Pianificazione**
3. Compila:
   - **Commessa**: seleziona dal menu
   - **Data inizio/fine**: periodo intervento
   - **Tecnici**: seleziona uno o più
   - **Veicolo**: assegna mezzo
   - **Descrizione**: note aggiuntive
4. Clicca **Salva**

> Puoi anche trascinare (drag & drop) gli eventi per spostarli!

---

## 2. Programmazione Settimanale (Vista Excel)

### Come usarla

1. Vai a **Pianificazioni** → **Programmazione Settimanale**
2. Vedrai una griglia:
   - Righe = Tecnici
   - Colonne = Giorni (Lun-Dom)
   - Celle = Pianificazioni

### Funzionalità

- **Filtro Reparto**: filtra tecnici per dipartimento
- **Navigazione settimana**: frecce ◀ ▶
- **Click cella**: crea nuova pianificazione
- **Click evento**: vedi dettagli

---

## 3. Visualizzare Statistiche

### Accesso

1. Dal menu clicca **Statistiche**
2. Seleziona il periodo:
   - Settimana/mese corrente
   - Periodi precedenti
   - Date personalizzate
3. Clicca **Aggiorna**

### Cosa vedi

- **Grafici**: fogli per stato, trend temporali
- **Top Clienti**: classifica per volume
- **Top Tecnici**: classifica per volume
- **Toggle Vista**: grafici ↔ tabelle

### Export

Clicca **Esporta Excel** per scaricare i dati con tutti i dettagli.

---

## 4. Gestire Anagrafiche Base

### Accesso

1. Dal menu clicca **Anagrafiche**
2. Scegli la sezione (Clienti, Tecnici, Commesse, etc.)

### Operazioni comuni

#### Aggiungere un nuovo record

1. Clicca **+ Nuovo** (o **+ Aggiungi**)
2. Compila i campi richiesti
3. Clicca **Salva**

#### Modificare

1. Trova il record nell'elenco
2. Clicca **Modifica** (matita)
3. Fai le modifiche
4. Clicca **Salva**

#### Cercare

Usa i filtri in alto per cercare per nome, codice, etc.

---

## 5. Gestire Fogli di Assistenza

### Ricerca avanzata

1. Vai a **Fogli Assistenza**
2. Usa i filtri:
   - Periodo (da - a)
   - Cliente
   - Tecnico
   - Commessa
   - Stato
3. Clicca **Cerca**

### Operazioni batch

1. Seleziona più fogli con le checkbox
2. Usa i pulsanti in alto:
   - **Stampa**: genera PDF multipli
   - **Excel**: esporta selezione
   - **Copia**: duplica fogli selezionati (reset automatico numero, stato, firme)

> **Novità v1.1.7e**: Gli interventi ora distinguono tra "Sede Cliente" e "Teleassistenza" per una migliore tracciabilità dei costi.

### ⚠️ Novità: Controllo Avanzamento Fogli

Da v1.1.9, lo stato "Completato" è irreversibile per i tecnici. Come Manager/Admin puoi:
- Sbloccare fogli completati riportandoli a "In Lavorazione"
- Proseguire verso stati contabili (Consuntivato → Fatturato → Chiuso)
- Solo tu puoi fare rollback per correzioni

Alcuni passaggi richiedono **note obbligatorie** (es. a "Consuntivato").

### ⚠️ Nuova Regola: Campi Obbligatori

Da ora in avanti, **tutti i fogli** (nuovi o modificati) richiedono obbligatoriamente:
- **Commessa**
- **Ordine Interno**

**Perché?** Per garantire la tracciabilità completa del flusso di lavoro secondo le procedure ISO 9001:
- Cliente → Commessa → Ordine Interno → Foglio Lavoro

**Benefici**:
- ✅ Tracciabilità totale
- ✅ Riduzione errori fatturazione
- ✅ Conformità procedure qualità

> **Nota**: I fogli già esistenti senza questi dati rimangono validi e consultabili.

---

## 6. Export e Report

### Excel da Fogli Assistenza

1. Seleziona i fogli da esportare
2. Clicca **Esporta Excel**
3. Si scarica un file con tutti i dettagli

### Excel da Statistiche

1. Vai in Statistiche
2. Imposta il periodo
3. Clicca **Esporta Excel**
4. Ottieni report completo con:
   - Statistiche periodo
   - Top clienti
   - Top tecnici
   - Trend

---

## Riferimento Rapido: Menu Manager

| Voce Menu | Funzione |
|-----------|----------|
| Dashboard | Statistiche globali |
| Fogli Assistenza | Gestione completa fogli |
| Pianificazioni | Hub pianificazione |
| → Calendario | Gestione drag & drop |
| → Settimanale | Vista griglia Excel |
| → Operatori | Vista solo lettura |
| Anagrafiche | Dati master |
| Statistiche | Report e analisi |
| Scadenze Mezzi | Manutenzioni veicoli |

---

## Novità Versione 1.1.12

### 🆕 Ultime Funzionalità

**Documentazione Online** 📖
- Menu → Info → Documentazione:
  - Manuale PDF integrato
  - Video tutorial
  - FAQ categorizzate
- Utile per formazione rapida tecnici

**Copia Fogli Multipli** 📋
- Seleziona fogli → Copia
- Reset automatico numero, stato, firme
- Ideale per contratti ricorrenti

**⚠️ Controllo Avanzamento (v1.1.9)**
- 9 stati completi (Aperto → Chiuso)
- "Completato" irreversibile per tecnici
- Solo Manager/Admin possono sbloccare
- Note obbligatorie per "Consuntivato"

**Privilegi Manager:**
- Sblocchi fogli completati per correzioni
- Prosegui verso stati contabili
- Gestisci workflow completo

**Teleassistenza** 💻
- Interventi remoti senza campi viaggio
- Report separati per tipo

**Mobile/Tablet Ottimizzato** 📱
- App responsive su tutti i dispositivi
- Desktop per back-office, mobile per consultazioni

---

### 📚 Prossimi Passi

1. Esplora la nuova pagina Documentazione (Info → Docs)
2. Comunica ai tecnici il cambio su stato "Completato"
3. Crea template fogli per clienti ricorrenti (usa Copia)
4. Consulta FAQ prima di chiamare supporto

---

## Hai Bisogno di Più Dettagli?

Consulta il **Manuale Completo per Manager/Admin** per:
- Gestione completa di tutte le anagrafiche
- Configurazione avanzata
- Pianificazioni ricorrenti
- Gestione costi e listini
- E molto altro

---

*Guida rapida OilSafe Service Hub - Versione Manager/Admin v1.1.12*
