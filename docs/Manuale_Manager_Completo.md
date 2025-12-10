---
marp: false
---

# OilSafe Service Hub
## Manuale Completo per Manager e Admin

**Versione**: 1.1.12 | **Ultimo aggiornamento**: Dicembre 2025

---

## Indice

1. [Introduzione e Ruoli](#1-introduzione-e-ruoli)
2. [Dashboard e Statistiche Globali](#2-dashboard-e-statistiche-globali)
3. [Gestione Fogli di Assistenza](#3-gestione-fogli-di-assistenza)
4. [Pianificazione e Programmazione](#4-pianificazione-e-programmazione)
5. [Anagrafiche](#5-anagrafiche)
6. [Statistiche e Report](#6-statistiche-e-report)
7. [Gestione Mezzi e Scadenze](#7-gestione-mezzi-e-scadenze)
8. [Configurazione Sistema](#8-configurazione-sistema)
9. [Domande Frequenti](#9-domande-frequenti)
10. [Novità per Versione](#10-novità-per-versione)

---

## 1. Introduzione e Ruoli

### Panoramica

OilSafe Service Hub è la piattaforma completa per la gestione dei servizi di assistenza tecnica. Come Manager o Admin hai accesso a tutte le funzionalità avanzate del sistema.

### Differenze tra i Ruoli

| Funzionalità | Manager | Admin |
|--------------|---------|-------|
| Dashboard statistiche globali | ✓ | ✓ |
| Gestione completa fogli | ✓ | ✓ |
| Pianificazione e calendari | ✓ | ✓ |
| Tutte le anagrafiche | ✓ | ✓ |
| Statistiche e report | ✓ | ✓ |
| Gestione scadenze mezzi | ✓ | ✓ |
| **Configurazione sistema** | ✗ | ✓ |
| **Eliminazione anagrafiche** | ✗ | ✓ |

### Accesso al Sistema

1. Apri il browser all'indirizzo dell'applicazione
2. Inserisci email e password
3. Dopo il login vedrai il menu completo con tutte le funzionalità

### Utilizzo Multi-Dispositivo

OilSafe Service Hub è progettato per funzionare perfettamente su qualsiasi dispositivo:

**Responsive Design:**
- **Desktop**: interfaccia completa, ideale per gestione anagrafiche e statistiche
- **Tablet**: ottimizzato per pianificazione e consultazione
- **Mobile**: layout semplificato per accesso rapido ai dati

**Ottimizzazioni specifiche (v1.1.8e):**
- Rilevamento automatico schermo piccolo (< 768px)
- Font adattati alla leggibilità touch
- Layout responsive per tutte le pagine
- Performance ottimizzate per connessioni mobili

**Consiglio d'uso:**
- Desktop per lavori di back-office
- Tablet per pianificazione e modifiche fogli
- Mobile per consultazione rapida e dashboard

---

## 2. Dashboard e Statistiche Globali

### Cosa Visualizzi

A differenza dei tecnici che vedono solo i propri dati, come Manager/Admin vedi le **statistiche globali** di tutti i fogli aziendali.

### Riquadri Statistiche

| Stato | Colore | Descrizione |
|-------|--------|-------------|
| Aperto | Azzurro | Fogli creati, lavoro non iniziato |
| In Lavorazione | Giallo | Lavori in corso |
| Attesa Firma | Arancione | Pronti per firma cliente |
| Completato | Verde | Lavoro finito, da consuntivare |
| Consuntivato | Blu chiaro | Pronti per invio/fatturazione |
| Inviato | Viola | Inviati al cliente |
| In attesa accettazione | Rosa | Attesa conferma cliente |
| Fatturato | Grigio | Fatturati |

### Elementi Dashboard

- **Logo e versione app**
- **Indicatore database**: blu = produzione, rosso = debug
- **Changelog**: ultime modifiche al sistema

---

## 3. Gestione Fogli di Assistenza

### 3.1 Lista Fogli - Ricerca Avanzata

#### Accesso

Menu → **Fogli Assistenza**

#### Filtri Disponibili

| Filtro | Descrizione |
|--------|-------------|
| **Da data / A data** | Periodo di creazione |
| **Cliente** | Ricerca per nome azienda |
| **Tecnico** | Filtra per tecnico assegnato |
| **Commessa** | Filtra per codice commessa |
| **Ordine** | Filtra per ordine cliente |
| **Stato** | Uno o più stati |

Dopo aver impostato i filtri, clicca **Cerca**. Per pulire tutto clicca **Reset**.

#### Paginazione

- Seleziona righe per pagina (default 50)
- Naviga tra le pagine
- Vedi totale risultati

#### Ordinamento

Clicca sull'intestazione di una colonna per ordinare:
- Data
- Numero foglio
- Cliente
- Commessa
- Stato

---

### 3.2 Operazioni sui Fogli

#### Azioni Singole

Per ogni foglio nella lista:

| Icona | Azione | Descrizione |
|-------|--------|-------------|
| 👁️ | Visualizza | Apre dettaglio completo |
| ✏️ | Modifica | Apre form di modifica |
| 🖨️ | Stampa | Genera PDF singolo |
| 📋 | Copia | Duplica il foglio |

#### Operazioni Batch

1. Seleziona più fogli con le checkbox (colonna sinistra)
2. Usa i pulsanti in alto:

| Pulsante | Funzione |
|----------|----------|
| **Stampa Selezione** | Genera PDF di tutti i fogli selezionati |
| **Esporta Excel** | Scarica dati in formato Excel |
| **Anteprima** | Visualizza PDF prima di stampare |

---

### 3.3 Creare un Nuovo Foglio

#### Processo

1. Clicca **+ Nuovo Foglio**
2. Compila i campi:
   - **Cliente**: cerca e seleziona
   - **Indirizzo**: seleziona tra quelli del cliente
   - **Commessa**: collega a commessa esistente (**OBBLIGATORIO** ⚠️)
   - **Ordine Interno**: seleziona dall'elenco filtrato per commessa (**OBBLIGATORIO** ⚠️)
   - **Note**: informazioni aggiuntive
3. Clicca **Salva**

> **IMPORTANTE**: Commessa e Ordine Interno sono campi obbligatori. Il sistema bloccherà il salvataggio se mancanti.

#### Da Pianificazione

Puoi creare un foglio anche partendo da una pianificazione esistente. I dati (cliente, commessa) vengono precompilati.

#### Tracciabilità e Conformità ISO 9001

L'obbligatorietà di **Commessa** e **Ordine Interno** garantisce la tracciabilità completa secondo le procedure di qualità:

**Flusso completo**:
```
Cliente → Commessa → Ordine Interno (gestionale) → Foglio di Lavoro
```

**Vantaggi organizzativi**:
- ✅ **Tracciabilità totale**: ogni intervento è collegato a un ordine specifico del gestionale
- ✅ **Riduzione errori**: eliminazione errori di fatturazione per mancanza riferimenti
- ✅ **Conformità ISO 9001**: rispetto delle procedure di qualità aziendali
- ✅ **Storico completo**: consultazione rapida di tutti gli interventi per ordine/commessa
- ✅ **Reportistica accurata**: statistiche e report più precisi

**Gestione ordini interni**:
Gli ordini interni contengono:
- Numero ordine del gestionale Oilsafe
- Data ordine interno
- Descrizione
- Opzionalmente: dati dell'ordine cliente effettivo (codice, data, data conferma)

**Filtri automatici**: Quando selezioni una commessa, gli ordini interni disponibili vengono automaticamente filtrati per mostrare solo quelli collegati a quella specifica commessa.

> **Nota per fogli esistenti**: L'obbligatorietà si applica solo ai nuovi fogli creati da ora in avanti e alle modifiche di fogli esistenti. I fogli già presenti senza questi dati rimangono validi e consultabili.

---

### 3.4 Modifica Stati Avanzata

Come Manager/Admin puoi modificare lo stato dei fogli anche dopo il completamento, cosa non permessa ai tecnici.

#### Workflow Completo

```
Aperto → In Lavorazione → Attesa Firma → Completato
→ Consuntivato → Inviato → In attesa accettazione
→ Fatturato → Chiuso
```

#### Note di Stato

Alcuni passaggi richiedono note obbligatorie:
- Da "Attesa Firma" in poi: note facoltative
- A "Consuntivato": note obbligatorie

#### Sbloccare un Foglio

Se un foglio è bloccato e serve una correzione:
1. Apri il foglio
2. Riporta lo stato a uno precedente (es. da Completato a In Lavorazione)
3. Fai le correzioni
4. Riporta allo stato corretto

---

### 3.5 Gestione Interventi

#### Visualizzare Interventi

Nel dettaglio foglio, la sezione **Interventi** mostra tutti gli interventi registrati con:
- Data e tecnico
- Descrizione
- Ore e km
- Rimborsi
- Attività standard

#### Aggiungere/Modificare

1. Clicca **+ Aggiungi Intervento** o **Modifica** su uno esistente
2. Compila/modifica i campi
3. Salva

#### Operazioni Avanzate

| Funzione | Come fare |
|----------|-----------|
| **Copia intervento** | Seleziona → Copia → Incolla in altro foglio |
| **Elimina multipli** | Seleziona più interventi → Elimina |
| **Riordina** | Gli interventi si ordinano per data |

---

### 3.6 Export Excel Fogli

#### Contenuto Export

Il file Excel contiene:
- Numero foglio e data
- Cliente e indirizzo
- Commessa e ordine
- Stato
- Tecnici assegnati
- Riepilogo ore e km
- Rimborsi

#### Come Esportare

1. Filtra i fogli desiderati
2. Seleziona con checkbox (o seleziona tutti)
3. Clicca **Esporta Excel**
4. Il file si scarica automaticamente

---

## 4. Pianificazione e Programmazione

### 4.1 Panoramica Sistema Pianificazione

Il sistema offre tre viste per la pianificazione:

| Vista | Accesso | Funzione |
|-------|---------|----------|
| **Calendario Pianificazioni** | Manager/Admin | Gestione completa drag & drop |
| **Programmazione Settimanale** | Manager/Admin | Vista griglia stile Excel |
| **Calendario Operatori** | Tutti | Sola visualizzazione |

---

### 4.2 Calendario Pianificazioni (Gestione)

#### Accesso

Menu → Pianificazioni → **Gestione Pianificazioni**

#### Viste Disponibili

- **Mese**: panoramica mensile
- **Settimana**: dettaglio settimanale
- **Giorno**: singola giornata
- **Agenda**: lista eventi
- **Timeline**: vista orizzontale

#### Creare una Pianificazione

1. Clicca **+ Nuova Pianificazione**
2. Compila il form:

| Campo | Descrizione |
|-------|-------------|
| **Commessa** | Obbligatorio - seleziona dal menu |
| **Foglio Assistenza** | Opzionale - collega a foglio esistente |
| **Data inizio** | Quando inizia l'intervento |
| **Data fine** | Quando termina |
| **Tutto il giorno** | Spunta se non servono orari specifici |
| **Tecnici** | Seleziona uno o più tecnici |
| **Veicolo principale** | Mezzo assegnato |
| **Veicoli secondari** | Altri mezzi se necessari |
| **Stato** | Pianificata, Confermata, In Corso, etc. |
| **Descrizione** | Note e dettagli |

3. Clicca **Salva**

#### Drag & Drop

Per spostare una pianificazione:
1. Clicca e tieni premuto sull'evento
2. Trascina nella nuova posizione (giorno/ora)
3. Rilascia

Il sistema aggiorna automaticamente date e orari.

#### Modificare una Pianificazione

1. Clicca sull'evento
2. Si apre il modal con i dettagli
3. Clicca **Modifica**
4. Fai le modifiche
5. Clicca **Salva**

#### Eliminare una Pianificazione

1. Clicca sull'evento
2. Nel modal clicca **Elimina**
3. Conferma l'eliminazione

#### Filtri

Usa i filtri in alto per visualizzare solo:
- Specifico tecnico
- Specifico veicolo
- Specifico stato
- Specifica commessa
- Periodo date

---

### 4.3 Programmazione Settimanale

#### Accesso

Menu → Pianificazioni → **Programmazione Settimanale**

#### La Griglia

| Elemento | Descrizione |
|----------|-------------|
| **Righe** | Un tecnico per riga |
| **Colonne** | Giorni da Lunedì a Domenica |
| **Celle** | Pianificazioni assegnate |
| **Colori** | Identificano le commesse |

#### Filtro per Reparto

La funzionalità più potente della vista settimanale:

1. In alto trovi il menu **Filtra per Reparto**
2. Seleziona un reparto specifico
3. La griglia mostra solo i tecnici di quel reparto
4. Vedrai anche il conteggio: "X tecnici visualizzati"

Questo è utilissimo quando hai molti tecnici e vuoi pianificare per dipartimento.

#### Navigazione

- **◀ Settimana Precedente**: vai indietro
- **Oggi**: torna alla settimana corrente
- **Settimana Successiva ▶**: vai avanti

#### Creare Pianificazione dalla Griglia

1. Clicca su una cella vuota
2. Si apre il form precompilato con:
   - Tecnico (dalla riga)
   - Data (dalla colonna)
3. Compila gli altri campi
4. Salva

---

### 4.4 Pianificazioni Ricorrenti

Per lavori che si ripetono regolarmente:

1. Crea una nuova pianificazione
2. Attiva l'opzione **Ricorrente**
3. Configura:
   - **Giorni della settimana**: Lun, Mar, Mer...
   - **Escludi weekend**: salta Sab/Dom
   - **Data fine ricorrenza**: fino a quando ripetere
4. Salva

Il sistema crea automaticamente tutte le occorrenze.

---

### 4.5 Colori e Legenda

#### Per Commessa

Ogni commessa ha un colore assegnato automaticamente. Questo permette di vedere a colpo d'occhio come sono distribuiti i lavori.

#### Legenda

In fondo al calendario trovi la legenda con:
- Colore
- Codice commessa
- Descrizione

---

## 5. Anagrafiche

### 5.1 Accesso

Menu → **Anagrafiche**

Vedrai 9 card per le diverse sezioni. Clicca su una per accedere.

---

### 5.2 Clienti

#### Informazioni Gestite

| Campo | Descrizione |
|-------|-------------|
| **Ragione sociale** | Nome azienda |
| **Partita IVA** | Identificativo fiscale |
| **Codice fiscale** | CF azienda |
| **Email** | Contatto principale |
| **Telefono** | Recapito |
| **Note** | Informazioni aggiuntive |

#### Indirizzi Multipli

Ogni cliente può avere più sedi/indirizzi:
1. Apri il dettaglio cliente
2. Sezione **Indirizzi**
3. Clicca **+ Aggiungi Indirizzo**
4. Compila: via, città, CAP, provincia

#### Listini Costo

Puoi configurare:
- **Listino unico**: stesso prezzo per tutte le sedi
- **Listino per sede**: prezzi diversi per indirizzo

---

### 5.3 Tecnici

#### Informazioni Gestite

| Campo | Descrizione |
|-------|-------------|
| **Nome/Cognome** | Dati anagrafici |
| **Email** | Contatto |
| **Profilo utente** | Collegamento account login |
| **Mansione** | Qualifica per calcolo costi |
| **Reparto** | Dipartimento di appartenenza |

#### Collegamento Utente

Per permettere al tecnico di accedere al sistema:
1. L'utente deve prima registrarsi (o essere creato)
2. Nella scheda tecnico, seleziona il **Profilo utente** corrispondente

#### Assegnazione Reparto

Il reparto serve per:
- Organizzare i tecnici per dipartimento
- Filtrare nella programmazione settimanale
- Report per reparto

---

### 5.4 Reparti

#### Campi

| Campo | Descrizione |
|-------|-------------|
| **Codice** | Identificativo breve (es. "PROD", "MANUT") |
| **Descrizione** | Nome completo reparto |
| **Attivo** | Se il reparto è in uso |
| **Note** | Informazioni aggiuntive |

#### Uso

Dopo aver creato i reparti:
1. Assegna ogni tecnico al suo reparto
2. Nella programmazione settimanale, filtra per reparto

---

### 5.5 Commesse

#### Informazioni Gestite

| Campo | Descrizione |
|-------|-------------|
| **Codice** | Identificativo univoco |
| **Descrizione** | Descrizione lavoro |
| **Cliente** | Cliente associato |
| **Stato** | Aperta, In Lavorazione, Completata, Chiusa |
| **Data inizio** | Inizio lavori |
| **Data fine** | Fine prevista |
| **Note** | Dettagli aggiuntivi |

#### Ciclo di Vita

1. **Aperta**: nuova commessa
2. **In Lavorazione**: lavori in corso
3. **Completata**: lavori finiti
4. **Chiusa**: archiviata

---

### 5.6 Ordini Cliente

#### Campi

| Campo | Descrizione |
|-------|-------------|
| **Numero ordine** | Riferimento cliente |
| **Cliente** | Chi ha emesso l'ordine |
| **Commessa** | Collegamento a commessa |
| **Descrizione** | Dettagli ordine |

L'ordine permette di tracciare il riferimento del cliente per la fatturazione.

---

### 5.7 Mansioni

#### Campi

| Campo | Descrizione |
|-------|-------------|
| **Categoria** | Gruppo (es. "Tecnico", "Specialista") |
| **Livello** | Grado (es. "Junior", "Senior") |
| **Ruolo** | Nome completo |
| **Costo orario** | Tariffa standard |

#### Uso per Calcolo Costi

Quando si registra un intervento:
1. Si seleziona la mansione del tecnico
2. Il sistema usa il costo orario per i calcoli
3. Il cliente può avere costi personalizzati

---

### 5.8 Attività Standard

#### Struttura

Le attività standard sono servizi predefiniti con:
- **Codice** e **Descrizione**
- **Unità di misura** (ore, pezzi, etc.)
- **Costo unitario** base

#### Listini per Cliente

Per ogni cliente puoi configurare:
1. Quali attività sono disponibili
2. Costo personalizzato (override del base)
3. Se sono obbligatorie o opzionali

#### Listini per Sede

Se il cliente ha listino "per sede":
1. Apri l'indirizzo specifico
2. Configura le attività per quella sede
3. Prezzi diversi per location diverse

---

### 5.9 Mezzi di Trasporto

#### Campi

| Campo | Descrizione |
|-------|-------------|
| **Targa** | Identificativo veicolo |
| **Descrizione** | Marca/modello |
| **Attivo** | Se il mezzo è in uso |

#### Scadenze

Per ogni mezzo puoi tracciare:
- **Revisione**: data scadenza
- **Assicurazione**: data scadenza
- **Bollo**: data scadenza
- **Manutenzione**: prossimo tagliando

Vedi la sezione [Gestione Mezzi e Scadenze](#7-gestione-mezzi-e-scadenze) per i dettagli.

---

### 5.10 Operazioni Comuni Anagrafiche

#### Ricerca

1. Usa i filtri in alto (nome, codice, etc.)
2. Clicca **Cerca**
3. I risultati si filtrano

#### Aggiungere Nuovo

1. Clicca **+ Nuovo** / **+ Aggiungi**
2. Compila il form
3. Clicca **Salva**

#### Modificare

1. Trova il record
2. Clicca **Modifica** (matita)
3. Fai le modifiche
4. **Salva**

#### Eliminare (Solo Admin)

1. Trova il record
2. Clicca **Elimina** (cestino)
3. Conferma

> Attenzione: alcuni record non possono essere eliminati se hanno relazioni (es. cliente con fogli).

#### Attiva/Disattiva

Molte anagrafiche hanno il flag "Attivo":
- **Disattivare** invece di eliminare mantiene lo storico
- I record disattivi non appaiono nei menu di selezione
- Puoi filtrare per vedere anche i disattivi

#### Import/Export

Alcune anagrafiche supportano:
- **Import da Excel/CSV**: caricamento massivo
- **Export**: scaricamento dati

---

## 6. Statistiche e Report

### 6.1 Accesso

Menu → **Statistiche**

### 6.2 Selezione Periodo

#### Periodi Predefiniti

| Opzione | Periodo |
|---------|---------|
| Settimana corrente | Da lunedì a oggi |
| Settimana precedente | Settimana scorsa |
| Mese corrente | Da inizio mese |
| Mese precedente | Mese scorso |
| Anno corrente | Da gennaio |
| Personalizzato | Scegli le date |

Dopo aver scelto, clicca **Aggiorna**.

### 6.3 Grafici Disponibili

#### Fogli per Stato

Grafico a barre/torta che mostra la distribuzione dei fogli nei vari stati.

#### Trend Temporale

Grafico lineare che mostra l'andamento nel tempo (giornaliero/settimanale/mensile).

#### Top Clienti

Classifica dei clienti per numero di fogli/interventi nel periodo.

#### Top Tecnici

Classifica dei tecnici per numero di interventi/ore nel periodo.

### 6.4 Toggle Vista

Puoi alternare tra:
- **Grafici**: visualizzazione grafica
- **Tabelle**: dati numerici dettagliati

### 6.5 Export Excel Completo

Clicca **Esporta Excel** per scaricare un file con fogli multipli:

| Foglio Excel | Contenuto |
|--------------|-----------|
| Statistiche Periodo | Conteggi per stato |
| Top Clienti | Classifica clienti |
| Top Tecnici | Classifica tecnici |
| Trend | Dati andamento temporale |
| Report Completo | Tutti i dati insieme |

Questo export è ideale per la contabilità e i report direzionali.

---

## 7. Gestione Mezzi e Scadenze

### 7.1 Pagina Scadenze Mezzi

#### Accesso

Menu → **Scadenze Mezzi** (o da Anagrafiche → Mezzi)

#### Cosa Visualizzi

Tabella con tutti i veicoli e le loro scadenze:
- Targa
- Descrizione
- Revisione (data e stato)
- Assicurazione (data e stato)
- Bollo (data e stato)
- Manutenzione (data e stato)

#### Stati Indicatori

| Indicatore | Significato |
|------------|-------------|
| 🟢 **OK** | Scadenza lontana |
| 🟡 **Warning** | Scadenza vicina (entro soglia) |
| 🔴 **Scaduto** | Data superata |

### 7.2 Calendario Scadenze

Menu → Mezzi → **Calendario Scadenze**

Vista calendario con tutte le scadenze dei mezzi, utile per pianificare manutenzioni.

### 7.3 Configurazione Alert

Solo Admin può configurare:
- Giorni prima per alert revisione
- Giorni prima per alert assicurazione
- Giorni prima per alert bollo
- Giorni prima per alert manutenzione

Vedi sezione [Configurazione Sistema](#8-configurazione-sistema).

---

## 8. Configurazione Sistema

### Solo Admin

Questa sezione è accessibile solo con ruolo Admin.

### Accesso

Menu → **Configurazione**

### Impostazioni Disponibili

#### Responsabile Scadenze Mezzi

Seleziona il manager che riceverà le notifiche per le scadenze dei veicoli.

#### Soglie Alert Scadenze

| Impostazione | Default | Descrizione |
|--------------|---------|-------------|
| Giorni alert revisione | 30 | Giorni prima per warning |
| Giorni alert assicurazione | 30 | Giorni prima per warning |
| Giorni alert bollo | 30 | Giorni prima per warning |
| Giorni alert manutenzione | 15 | Giorni prima per warning |

### Salvare Configurazione

Dopo le modifiche, clicca **Salva Configurazione**.

---

## 9. Domande Frequenti

### Pianificazione

**D: Come faccio a vedere solo i tecnici del mio reparto?**
R: Nella Programmazione Settimanale usa il filtro "Reparto" in alto.

**D: Posso spostare una pianificazione trascinandola?**
R: Sì, nella Gestione Pianificazioni puoi fare drag & drop degli eventi.

**D: Come creo pianificazioni ricorrenti?**
R: Nel form pianificazione attiva "Ricorrente", scegli i giorni e la data fine.

---

### Fogli di Assistenza

**D: Un tecnico ha sbagliato un foglio completato, come correggo?**
R: Apri il foglio, riporta lo stato a "In Lavorazione", fai le correzioni, poi ricompletalo.

**D: Come esporto i dati per la contabilità?**
R: Da Statistiche → Esporta Excel ottieni un report completo con tutti i dati.

**D: Posso stampare più fogli insieme?**
R: Sì, seleziona i fogli con le checkbox e clicca "Stampa Selezione".

---

### Anagrafiche

**D: Ho cancellato per errore un cliente, posso recuperarlo?**
R: No, l'eliminazione è definitiva. Per questo è meglio disattivare invece di eliminare.

**D: Come imposto prezzi diversi per sedi diverse dello stesso cliente?**
R: Nel cliente, imposta "Listino per sede", poi configura le attività standard per ogni indirizzo.

**D: Il tecnico non riesce ad accedere, cosa controllo?**
R: Verifica che il tecnico abbia un "Profilo utente" collegato nella sua anagrafica.

---

### Statistiche

**D: Come vedo l'andamento mese per mese?**
R: In Statistiche seleziona "Personalizzato", imposta l'intervallo desiderato, e guarda il grafico Trend.

**D: L'export Excel è vuoto, perché?**
R: Controlla i filtri del periodo, potresti aver selezionato un intervallo senza dati.

---

### Sistema

**D: Il sistema è lento, cosa faccio?**
R: Controlla la connessione internet. Se il problema persiste, svuota la cache del browser.

**D: Ho dimenticato la password admin, come la recupero?**
R: Contatta il supporto tecnico per il reset.

---

## 10. Novità per Versione

Riepilogo funzionalità aggiunte dalla versione 1.1.3 alla versione corrente 1.1.12, con focus sulle implicazioni per Manager e Admin.

---

### Versione 1.1.12 (Dicembre 2025)
#### Documentazione Online Integrata 📖

**Novità:**
- Tab Documentazione in pagina Info con 3 sezioni
- Manuale PDF con viewer, zoom, download
- Video tutorial YouTube con player integrato
- FAQ interattive categorizzate

**Impatto Gestionale:**
- Formazione tecnici più rapida (video + FAQ)
- Riduzione chiamate supporto
- Manuale sempre aggiornato con app

**Manutenzione:**
- File PDF in `public/docs/manuale-utente.pdf`
- Video configurati in `src/data/videoTutorials.js`
- FAQ in `src/data/faqData.js`
- Modifiche richiedono ricompilazione app

**Capitolo di riferimento:** 2 (Dashboard e Statistiche Globali)

---

### Versione 1.1.11 (Dicembre 2025)
#### Visualizzazione Desktop Ottimizzata 🖥️

**Novità:**
- Toggle espandi/collassa per sezioni interventi lunghe
- Pulsante "Espandi/Collassa Tutto"
- Solo su desktop (> 1024px)

**Impatto Gestionale:**
- Migliore leggibilità fogli con molti interventi
- Verifica rapida su monitor ufficio
- Nessuna configurazione richiesta

**Capitolo di riferimento:** 3.5 (Gestione Interventi)

---

### Versione 1.1.10 (Dicembre 2025)
#### Copia Fogli con Reset Campi 📋

**Novità:**
- Funzione copia fogli multipli
- Reset automatico: numero, stato, firme, date
- Preserva: cliente, commessa, tutti gli interventi

**Impatto Gestionale:**
- Velocizza creazione fogli ricorrenti
- Ideale per contratti manutenzione programmata
- Template riutilizzabili

**Best Practice:**
- Creare fogli template per clienti con attività standard
- Copiare e adattare invece di creare da zero
- Verificare sempre i dati dopo copia

**Capitolo di riferimento:** 3.2 (Operazioni sui Fogli)

---

### Versione 1.1.9 (Dicembre 2025)
#### Controllo Avanzamento Foglio ⚠️ **IMPORTANTE**

**Novità:**
- Workflow a 9 stati (Aperto → Chiuso)
- Stato "Completato" irreversibile per tecnici
- Verifica obbligatoria prima completamento
- Solo Manager/Admin possono fare rollback

**Impatto Gestionale - CRITICO:**

**Workflow completo:**
```
Aperto → In Lavorazione → Attesa Firma → Completato
  ↓
Consuntivato → Inviato → In attesa accettazione → Fatturato → Chiuso
```

**Privilegi Manager/Admin:**
- Unici a poter modificare fogli completati
- Unici a proseguire verso stati contabili
- Responsabilità sblocco per correzioni

**Note obbligatorie:**
- A "Consuntivato": OBBLIGATORIE (es. riferimento fattura)
- Ad altri stati: facoltative ma consigliate

**Comunicazione ai Tecnici:**
Importante comunicare che "Completato" è irreversibile. Devono verificare tutto prima di completare.

**Capitolo di riferimento:** 3.4 (Modifica Stati Avanzata) - AGGIORNATO

---

### Versione 1.1.8e (Dicembre 2025)
#### Ottimizzazione Mobile/Tablet 📱

**Novità:**
- Responsive design automatico (< 768px)
- Font adattati, zoom dinamico
- Layout touch-friendly

**Impatto Gestionale:**
- Tecnici possono lavorare comodamente da smartphone
- Manager possono verificare dati anche in mobilità
- Nessuna configurazione utente richiesta

**Raccomandazioni:**
- Desktop per lavori back-office (anagrafiche, statistiche)
- Tablet per pianificazione e modifiche fogli
- Mobile per consultazioni rapide

**Capitolo di riferimento:** 1 (Introduzione e Ruoli)

---

### Versione 1.1.7f (Dicembre 2025)
#### Pagina Info ℹ️

**Novità:**
- Pagina Info con 4 tab (Changelog, Sistema, Credits, Documentazione)
- Accessibile a tutti i ruoli dal menu

**Impatto Gestionale:**
- Verifica versione prima segnalare bug
- Changelog per comunicare novità ai tecnici
- Info sistema per troubleshooting

**Capitolo di riferimento:** 2 (Dashboard e Statistiche Globali)

---

### Versione 1.1.7e (Dicembre 2025)
#### Tipo Intervento: Teleassistenza 💻

**Novità:**
- Distinzione "Sede Cliente" vs "Teleassistenza"
- Campi viaggio non richiesti per teleassistenza
- Costi mansioni specifici

**Impatto Gestionale:**
- Report separati per tipo intervento
- Analisi costi fisici vs remoti
- Tracciabilità migliore per fatturazione

**Statistiche:**
- Possibile filtrare per tipo intervento
- KPI separati (es. % teleassistenza)

**Capitolo di riferimento:** 3.5 (Gestione Interventi)

---

### Roadmap Documentazione

**Versioni future:**
Questa sezione sarà aggiornata ad ogni release con le nuove funzionalità.

**Formato entry:**
- Versione e data
- Descrizione funzionalità
- Impatto gestionale
- Best practice (se applicabili)
- Capitolo riferimento

**Consultazione consigliata:**
Prima di ogni riunione con i tecnici, consulta questa sezione per verificare le novità da comunicare.

---

*Per implementazione tecnica e manutenzione, consulta `docs/GUIDA_MANUTENZIONE_DOCUMENTAZIONE.md`*

---

## Appendice: Scorciatoie e Tips

### Navigazione Rapida

| Azione | Come fare |
|--------|-----------|
| Tornare alla dashboard | Clicca logo Oilsafe |
| Ricaricare dati | F5 o tira giù su mobile |
| Aprire in nuova tab | Ctrl+Click (o Cmd+Click su Mac) |

### Tips Produttività

1. **Usa i filtri**: invece di scorrere liste lunghe, filtra sempre
2. **Seleziona multipli**: per operazioni batch usa le checkbox
3. **Drag & drop**: sposta eventi nel calendario invece di modificarli
4. **Export regolari**: scarica Excel periodicamente per backup

### Browser Consigliati

- **Chrome**: migliore compatibilità
- **Firefox**: ottimo supporto
- **Safari**: buono su Mac/iOS
- **Edge**: funziona bene

Evita Internet Explorer (non supportato).

---

*Manuale Completo OilSafe Service Hub - Versione Manager/Admin v1.1.12*
