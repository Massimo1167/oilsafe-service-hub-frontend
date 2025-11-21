# OilSafe Service Hub
## Presentazione alla Direzione Aziendale

**Versione**: 1.1.3
**Data**: Novembre 2025
**Durata presentazione**: 45 minuti

---

## AGENDA

1. Introduzione (5 min)
2. Analisi Situazione Attuale (10 min)
3. La Soluzione: OilSafe Service Hub (15 min)
4. Benefici di Business (10 min)
5. Prossimi Passi (5 min)

---

# PARTE 1: INTRODUZIONE

## Obiettivo della Presentazione

Presentare **OilSafe Service Hub**, la nuova piattaforma digitale per la gestione dei fogli di assistenza tecnica e della pianificazione delle attività sul campo.

### Perché questo progetto?

- Eliminare la gestione cartacea dei fogli di lavoro
- Superare i limiti della pianificazione su Excel
- Digitalizzare e centralizzare tutte le informazioni operative
- Migliorare efficienza, tracciabilità e velocità di fatturazione

---

# PARTE 2: ANALISI SITUAZIONE ATTUALE

## I Numeri Attuali

| Metrica | Valore |
|---------|--------|
| Fogli di lavoro settimanali | 10-15 |
| Tecnici in campo | 10 |
| Tempo compilazione foglio cartaceo | 15-20 minuti |
| Frequenza aggiornamento pianificazione | 1-2 volte/settimana |

---

## Problemi della Gestione Cartacea

### 1. Ritardi nella Consegna
- I fogli vengono consegnati in ritardo
- Spesso sono incompleti
- A volte si perdono completamente

### 2. Processo di Archiviazione Inefficiente
- Ogni foglio deve essere fotocopiato
- Archiviazione manuale sul server
- Tempo sprecato in attività non produttive

### 3. Errori e Perdita di Informazioni
- Errori di trascrizione frequenti
- Calligrafia illeggibile
- Dati mancanti o incompleti

### 4. Ritardi nella Fatturazione
- Fogli non archiviati = fatture in ritardo
- Difficoltà nel recuperare informazioni
- Impatto sul cash flow aziendale

### 5. Difficoltà nel Reperimento Storico
- "Quando abbiamo fatto l'ultimo intervento per il cliente X?"
- Ricerca manuale negli archivi cartacei
- Informazioni disperse e non correlate

---

## Problemi della Pianificazione su Excel

### Processo Attuale

```
Excel → Export PDF → Invio WhatsApp → Tecnici
```

### Criticità Riscontrate

| Problema | Impatto |
|----------|---------|
| **Versioni non aggiornate** | Tecnici lavorano su informazioni obsolete |
| **Distribuzione manuale** | Tempo perso per export e invio |
| **Nessuna notifica modifiche** | Tecnici non vedono i cambiamenti |
| **Impossibilità di verifica** | Non si sa chi ha letto cosa |
| **Conflitti risorse** | Sovrapposizioni non rilevate |

---

# PARTE 3: LA SOLUZIONE

## OilSafe Service Hub

Una piattaforma web completa per la gestione digitale di:
- **Fogli di assistenza tecnica**
- **Pianificazione risorse**
- **Anagrafiche operative**
- **Reportistica e statistiche**

---

## Architettura Tecnica

### Stack Tecnologico

| Componente | Tecnologia | Vantaggi |
|------------|------------|----------|
| **Frontend** | React 19 | Interfaccia moderna e reattiva |
| **Backend** | Supabase (PostgreSQL) | Database enterprise-grade |
| **Hosting** | Cloud | Accessibile ovunque, sempre |
| **Sicurezza** | Row Level Security | Dati protetti per ruolo |

### Caratteristiche Chiave

- **Accesso Multi-dispositivo**: PC, tablet, smartphone
- **Aggiornamenti Real-time**: Modifiche visibili immediatamente
- **Backup Automatico**: Nessun rischio di perdita dati
- **Offline-ready**: Funziona anche senza connessione (con sync)

---

## Controllo Accessi per Ruolo

### Tre Livelli di Autorizzazione

| Ruolo | Accesso |
|-------|---------|
| **Tecnico (User)** | Visualizza pianificazione, compila fogli propri, registra interventi |
| **Manager** | Gestisce pianificazione, tutte le anagrafiche, statistiche, tutti i fogli |
| **Admin** | Accesso completo + configurazione sistema |

---

## DEMO: Funzionalità Principali

### 1. Dashboard Personalizzata

**[SCREENSHOT: Dashboard con statistiche]**

- Vista immediata dello stato dei fogli
- Conteggi per stato (Aperto, In Lavorazione, Completato, etc.)
- Statistiche mese corrente vs precedente
- Accesso rapido alle funzioni principali

---

### 2. Gestione Fogli di Assistenza

**[SCREENSHOT: Lista fogli assistenza]**

#### Elenco e Ricerca Avanzata
- Filtri per: data, cliente, tecnico, commessa, stato
- Ordinamento per qualsiasi colonna
- Paginazione configurabile
- Selezione multipla per operazioni batch

#### Operazioni Disponibili
- Stampa multipla PDF
- Export Excel
- Copia fogli esistenti
- Anteprima prima della stampa

---

### 3. Creazione Foglio Assistenza

**[SCREENSHOT: Form nuovo foglio]**

#### Semplificazioni vs Cartaceo
- **Selezione cliente** con ricerca automatica
- **Indirizzo** precompilato dall'anagrafica
- **Commessa e ordine** collegati automaticamente
- **Bozza automatica** salvata localmente (nessuna perdita dati)

---

### 4. Registrazione Interventi

**[SCREENSHOT: Form intervento]**

#### Campi Principali
- Data e tecnico assegnato
- Ore lavorate e tipo intervento
- Descrizione attività (con **input vocale**)
- Km percorsi e ore viaggio
- Rimborsi (pasto, pedaggio, pernotto)
- Attività standard con quantità

#### Input Vocale
- Pulsante microfono per dettatura
- Trascrizione automatica in italiano
- Ideale per compilazione rapida in campo

---

### 5. Workflow Stati del Foglio

**[DIAGRAMMA: Flusso stati]**

```
Aperto → In Lavorazione → Attesa Firma → Completato
    → Consuntivato → Inviato → In attesa accettazione
    → Fatturato → Chiuso
```

#### Vantaggi del Workflow
- Tracciabilità completa del processo
- Note obbligatorie per passaggi critici
- Blocco modifiche dopo completamento
- Audit trail per conformità

---

### 6. Firma Digitale

**[SCREENSHOT: Area firma]**

#### Caratteristiche
- Firma touch su tablet/smartphone
- Due aree: Cliente e Tecnico
- Immagini salvate nel cloud
- Incorporate automaticamente nel PDF
- Validità legale della firma elettronica

---

### 7. Generazione PDF Automatica

**[SCREENSHOT: PDF generato]**

#### Contenuti del PDF
- Logo Oilsafe e dati aziendali
- Dati cliente e commessa
- Elenco completo interventi
- Dettaglio ore, km, attività
- Firme cliente e tecnico
- Formattazione professionale

#### Vantaggi
- Generato in un click
- Nessuna trascrizione manuale
- Pronto per invio al cliente
- Archiviazione automatica

---

### 8. Pianificazione Settimanale

**[SCREENSHOT: Programmazione settimanale]**

#### Vista "Stile Excel"
- Righe: Tecnici
- Colonne: Giorni della settimana
- Celle: Pianificazioni assegnate
- Colori: Per commessa

#### Funzionalità
- Filtro per reparto/dipartimento
- Click per creare nuova pianificazione
- Navigazione settimana per settimana
- Vista immediata disponibilità risorse

---

### 9. Calendario Pianificazioni

**[SCREENSHOT: Calendario mensile]**

#### Viste Disponibili
- **Mese**: Panoramica completa
- **Settimana**: Dettaglio giornaliero
- **Giorno**: Singola giornata
- **Agenda**: Lista eventi
- **Timeline**: Vista orizzontale

#### Interazioni
- Drag & drop per spostare eventi
- Click per dettagli/modifica
- Filtri per tecnico, veicolo, stato
- Legenda colori dinamica

---

### 10. Gestione Anagrafiche

**[SCREENSHOT: Pagina anagrafiche]**

#### 9 Anagrafiche Complete

| Anagrafica | Contenuto |
|------------|-----------|
| **Clienti** | Ragione sociale, indirizzi multipli, listini costi |
| **Tecnici** | Nome, mansione, reparto, email |
| **Reparti** | Codice, descrizione (nuovo!) |
| **Commesse** | Codice, cliente, stato, date |
| **Ordini Cliente** | Numero ordine, commessa collegata |
| **Mansioni** | Categoria, livello, costo orario |
| **Unità di Misura** | Per calcolo costi attività |
| **Attività Standard** | Codice, costo unitario, listini cliente |
| **Mezzi Trasporto** | Targa, scadenze manutenzione |

---

### 11. Gestione Scadenze Mezzi

**[SCREENSHOT: Scadenze mezzi]**

#### Monitoraggio Automatico
- Revisione veicoli
- Assicurazione
- Bollo
- Manutenzione programmata

#### Alert Configurabili
- Soglie personalizzabili (giorni prima)
- Indicatori visivi: OK / Warning / Scaduto
- Responsabile designato per notifiche

---

### 12. Statistiche e Report

**[SCREENSHOT: Pagina statistiche]**

#### Analisi Disponibili
- Fogli per stato
- Trend temporali
- Top clienti (per volume)
- Top tecnici (per volume)

#### Export Completo
- Excel con fogli multipli
- Dati periodo selezionato
- Grafici esportabili
- Report per contabilità

---

# PARTE 4: BENEFICI DI BUSINESS

## Risparmio Tempo

### Compilazione Foglio

| Metodo | Tempo | Risparmio |
|--------|-------|-----------|
| Cartaceo | 15-20 min | - |
| Digitale | 5-10 min | **50-65%** |

### Calcolo Risparmio Mensile

```
10-15 fogli/settimana × 4 settimane = 40-60 fogli/mese
Risparmio per foglio = 10 minuti
Risparmio totale = 400-600 minuti/mese = 7-10 ore/mese
```

### Eliminazione Attività Non Produttive
- Zero fotocopie
- Zero archiviazione manuale
- Zero ricerca in archivi cartacei
- Zero trascrizione dati

---

## Efficienza Operativa

### Prima vs Dopo

| Aspetto | Prima | Dopo |
|---------|-------|------|
| Documenti persi | Frequente | **Zero** |
| Tracciabilità | Parziale | **Completa** |
| Ricerca storico | Minuti/ore | **Secondi** |
| Aggiornamento pianificazione | 1-2 giorni | **Real-time** |
| Distribuzione info | WhatsApp manuale | **Automatica** |

### Vantaggi Tangibili
- Ogni informazione è sempre reperibile
- Storico completo per ogni cliente
- Nessun conflitto di versioni
- Tutti vedono gli stessi dati aggiornati

---

## Velocità Fatturazione

### Impatto sul Cash Flow

| Fase | Prima | Dopo |
|------|-------|------|
| Completamento foglio | Giorni di ritardo | **Immediato** |
| Disponibilità dati | Dopo archiviazione | **Real-time** |
| Preparazione fattura | Ricerca manuale | **Export automatico** |

### Report per Contabilità
- Export Excel pronto per elaborazione
- Dati strutturati e completi
- Nessuna trascrizione necessaria
- Filtri per periodo, cliente, commessa

---

## Conformità Normativa

### Garanzie del Sistema

| Requisito | Implementazione |
|-----------|-----------------|
| **Firma elettronica** | Canvas digitale con salvataggio sicuro |
| **Audit trail** | Storico completo modifiche e stati |
| **Backup dati** | Automatico su cloud Supabase |
| **Controllo accessi** | Row Level Security per ruolo |
| **Integrità dati** | Database PostgreSQL enterprise |

### Tracciabilità Completa
- Chi ha creato/modificato cosa e quando
- Storico transizioni di stato
- Note obbligatorie per passaggi critici
- Impossibilità di modifiche post-chiusura

---

## Riepilogo ROI

### Benefici Quantificabili

| Voce | Stima Mensile |
|------|---------------|
| Ore risparmiate compilazione | 7-10 ore |
| Ore risparmiate archiviazione | 3-5 ore |
| Ore risparmiate ricerche | 2-4 ore |
| Riduzione errori fatturazione | -80% |
| **Totale ore risparmiate** | **12-19 ore/mese** |

### Benefici Non Quantificabili
- Migliore immagine verso il cliente (PDF professionali)
- Soddisfazione tecnici (strumento moderno)
- Decisioni basate su dati reali
- Scalabilità per crescita aziendale

---

# PARTE 5: PROSSIMI PASSI

## Piano di Implementazione

### Fase 1: Formazione (Settimana 1-2)
- Sessione per Manager/Admin (2 ore)
- Sessione per Tecnici (1 ora)
- Distribuzione manuali utente
- Periodo di affiancamento

### Fase 2: Go-Live Graduale (Settimana 3-4)
- Partenza con gruppo pilota (3-4 tecnici)
- Doppia gestione carta/digitale
- Raccolta feedback e aggiustamenti

### Fase 3: Rollout Completo (Settimana 5+)
- Estensione a tutti i tecnici
- Abbandono gestione cartacea
- Monitoraggio e ottimizzazione

---

## Supporto e Manutenzione

### Supporto Utenti
- Manuali Quick Start per operatività immediata
- Manuali completi per funzionalità avanzate
- Canale dedicato per segnalazioni

### Evoluzione Sistema
- Aggiornamenti regolari
- Nuove funzionalità su richiesta
- Backup e sicurezza garantiti

---

## Domande?

### Contatti

**OilSafe Service Hub**
Versione 1.1.3

Per informazioni tecniche o demo:
[Inserire contatto responsabile IT]

---

## Appendice: Screenshot da Inserire

Per completare la presentazione, inserire screenshot dalle seguenti sezioni:

1. **Dashboard** - `/` (login come admin)
2. **Lista Fogli Assistenza** - `/fogli-assistenza`
3. **Form Nuovo Foglio** - `/fogli-assistenza/nuovo`
4. **Dettaglio Foglio con Interventi** - `/fogli-assistenza/{id}`
5. **Form Intervento** con pulsante vocale
6. **Area Firma Digitale**
7. **PDF Generato** (anteprima)
8. **Programmazione Settimanale** - `/programmazione-settimanale`
9. **Calendario Pianificazioni** - `/calendario-pianificazioni`
10. **Pagina Anagrafiche** - `/anagrafiche`
11. **Scadenze Mezzi** - `/scadenze-mezzi`
12. **Statistiche** - `/statistiche`

---

*Documento generato per la presentazione alla Direzione Aziendale - Novembre 2025*
