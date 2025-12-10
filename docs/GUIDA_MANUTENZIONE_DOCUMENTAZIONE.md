# Guida Manutenzione Documentazione
## Oilsafe Service Hub

**Versione:** 1.0.0
**Data:** Dicembre 2025
**Destinatari:** Developer, Manager con accesso al codice

---

## Indice

1. [Panoramica Sistema Documentazione](#1-panoramica-sistema-documentazione)
2. [File di Documentazione](#2-file-di-documentazione)
3. [Aggiornare il Manuale PDF](#3-aggiornare-il-manuale-pdf)
4. [Gestire Video Tutorial](#4-gestire-video-tutorial)
5. [Gestire FAQ](#5-gestire-faq)
6. [Aggiornare i Manuali Markdown](#6-aggiornare-i-manuali-markdown)
7. [Workflow Rilascio Nuova Versione](#7-workflow-rilascio-nuova-versione)
8. [Troubleshooting](#8-troubleshooting)

---

## 1. Panoramica Sistema Documentazione

### Struttura

La documentazione di Oilsafe Service Hub è distribuita su 3 livelli:

| Livello | Formato | Posizione | Destinatari |
|---------|---------|-----------|-------------|
| **In-App** | PDF + JSON | `public/docs/`, `src/data/` | Tutti gli utenti |
| **Manuali Markdown** | `.md` | `docs/` | Developer, formazione |
| **Changelog** | `.md` | `CHANGELOG.md` | Developer, utenti Info page |

### File Principali

```
oilsafe-service-hub-frontend/
├── CHANGELOG.md                              # Storico versioni
├── public/
│   ├── CHANGELOG.md                          # Copia per Info page
│   └── docs/
│       └── manuale-utente.pdf                # PDF integrato
├── docs/
│   ├── Manuale_Tecnico_Completo.md          # 17KB, 10 capitoli
│   ├── Manuale_Tecnico_QuickStart.md        # 5KB, guida rapida
│   ├── Manuale_Manager_Completo.md          # 23KB, 10 capitoli
│   ├── Manuale_Manager_QuickStart.md        # 5KB, guida rapida
│   └── GUIDA_MANUTENZIONE_DOCUMENTAZIONE.md # Questa guida
└── src/
    └── data/
        ├── faqData.js                        # FAQ categorie
        └── videoTutorials.js                 # Video YouTube
```

---

## 2. File di Documentazione

### 2.1 Manuali Markdown (`docs/*.md`)

**Formato:** Markdown standard (non Marp)
**Stile:** Informale, diretto (es: "Clicca su...", "Vai a...")
**Audience:** Utenti tecnici e manager

**File:**
- `Manuale_Tecnico_Completo.md`: 10 capitoli per user role
- `Manuale_Tecnico_QuickStart.md`: 6 sezioni procedurali
- `Manuale_Manager_Completo.md`: 10 capitoli per manager/admin
- `Manuale_Manager_QuickStart.md`: 6 sezioni operative

**Struttura tipo Completo:**
```markdown
---
marp: false
---

# OilSafe Service Hub
## Manuale Completo per [Ruolo]

**Versione**: X.X.X | **Ultimo aggiornamento**: Mese Anno

---

## Indice
[Elenco capitoli con link anchor]

---

## 1. Capitolo
### Sezione
Contenuto...
```

**Aggiornamento:**
1. Modificare sezione specifica
2. Aggiornare numero versione nell'header
3. Aggiornare data nell'header
4. Aggiornare indice se nuove sezioni
5. Commit con messaggio descrittivo

### 2.2 Changelog (`CHANGELOG.md`)

**Formato:** [Keep a Changelog](https://keepachangelog.com/it/1.0.0/)

**Struttura:**
```markdown
## [X.X.X] - YYYY-MM-DD

### Added
- Nuova funzionalità 1
- Nuova funzionalità 2

### Changed
- Modifica funzionalità esistente

### Fixed
- Bug risolto

### Removed
- Funzionalità rimossa
```

**Workflow:**
1. Editare `CHANGELOG.md` root
2. Copiare in `public/CHANGELOG.md` (manualmente o con script)
3. Commit entrambi i file

> Lo script copia automaticamente CHANGELOG.md in public/ per l'Info page.

### 2.3 Manuale PDF (`public/docs/manuale-utente.pdf`)

**Generazione:** Manuale (non automatica)
**Viewer:** react-pdf in `InfoPage.jsx`

**Controlli viewer:**
- Zoom: 0.5x - 2.0x
- Navigazione: pagina precedente/successiva
- Download: link diretto al file

**Sostituire PDF:**
1. Generare nuovo PDF da fonte esterna
2. Rinominare come `manuale-utente.pdf`
3. Copiare in `public/docs/`
4. Testare viewer: `npm run dev` → Info → Documentazione
5. Commit nuovo file

> Il PDF non è generato dai Markdown. Richiede editing esterno.

---

## 3. Aggiornare il Manuale PDF

### Processo Completo

**1. Preparazione Contenuto**
- Raccogliere modifiche da ultima versione PDF
- Controllare CHANGELOG per funzionalità non documentate
- Allineare con manuali Markdown

**2. Generazione PDF**

**Opzione A: Da Markdown (Pandoc)**
```bash
# Installare pandoc
# Su Windows: https://pandoc.org/installing.html

# Convertire
pandoc docs/Manuale_Tecnico_Completo.md \
  -o manuale-utente.pdf \
  --pdf-engine=xelatex \
  --toc \
  --variable geometry:margin=2cm
```

**Opzione B: Da Word/LibreOffice**
- Editare manuale in Word/LibreOffice
- Salvare come PDF
- Rinominare `manuale-utente.pdf`

**Opzione C: Tool Online**
- Markdown → HTML → PDF (es: Typora, Marked 2)

**3. Deployment**
```bash
# Sostituire file
cp /percorso/nuovo-pdf.pdf public/docs/manuale-utente.pdf

# Test locale
npm run dev
# Vai su http://localhost:5173 → Info → Documentazione

# Se OK, commit
git add public/docs/manuale-utente.pdf
git commit -m "docs: aggiorna manuale PDF a v1.1.12"
```

**4. Verifica Post-Deploy**
- Controllare zoom funzionante
- Verificare tutte le pagine caricano
- Testare download

### Frequenza Aggiornamento

- **Minor release** (es. 1.1.x → 1.2.0): aggiornare PDF
- **Patch release** (es. 1.1.10 → 1.1.11): opzionale
- **Major release** (es. 1.x → 2.0): sempre aggiornare

---

## 4. Gestire Video Tutorial

### File Sorgente

**Percorso:** `src/data/videoTutorials.js`

**Struttura:**
```javascript
export const videoTutorials = [
  {
    id: 'video-1',                          // Univoco, usato per link FAQ
    title: "Titolo Video",
    description: "Descrizione breve",
    youtubeId: "ABC123XYZ",                 // ID da URL YouTube
    thumbnail: "https://img.youtube.com/vi/ABC123XYZ/mqdefault.jpg",
    duration: "3:45",                       // Formato MM:SS
    category: "Categoria"                   // Es: "Introduzione", "Operazioni Base"
  },
  // ... altri video
];
```

### Aggiungere Nuovo Video

**1. Caricare Video su YouTube**
- Accedere canale YouTube aziendale
- Caricare video
- Configurare: Titolo, descrizione, visibilità
- Copiare URL (es: `https://www.youtube.com/watch?v=ABC123XYZ`)

**2. Estrarre ID Video**
URL: `https://www.youtube.com/watch?v=ABC123XYZ`
ID: `ABC123XYZ` (parte dopo `v=`)

**3. Aggiungere in videoTutorials.js**
```javascript
// In src/data/videoTutorials.js
export const videoTutorials = [
  // ... video esistenti

  {
    id: 'video-nuovo',
    title: "Come Creare un Foglio di Assistenza",
    description: "Tutorial passo-passo per la creazione di nuovi fogli",
    youtubeId: "ABC123XYZ",
    thumbnail: "https://img.youtube.com/vi/ABC123XYZ/mqdefault.jpg",
    duration: "5:30",
    category: "Operazioni Base"
  }
];
```

**4. Compilare e Testare**
```bash
npm run dev
# Vai su Info → Documentazione → Video Tutorial
# Verifica thumbnail e player
```

**5. Commit**
```bash
git add src/data/videoTutorials.js
git commit -m "docs: aggiungi video tutorial 'Creare Foglio Assistenza'"
```

### Modificare Video Esistente

**Cambiare titolo/descrizione:**
```javascript
// Trovare video per id
{
  id: 'video-1',
  title: "Nuovo Titolo Aggiornato",    // <-- Modificare
  description: "Nuova descrizione",    // <-- Modificare
  youtubeId: "qZAHNAKaq50",            // Non cambiare
  // ...
}
```

**Sostituire video YouTube:**
- Caricare nuovo video
- Aggiornare `youtubeId` e `thumbnail`
- Mantenere stesso `id` per preservare link FAQ

### Eliminare Video

**Metodo 1: Rimozione completa**
```javascript
// Eliminare l'intero oggetto dall'array
```

**Metodo 2: Disabilitazione (preferibile)**
```javascript
{
  id: 'video-obsoleto',
  title: "[OBSOLETO] Vecchio Tutorial",
  // ... resto invariato
}
```

> Preferire disabilitazione per non rompere link FAQ.

### Categorie Video

**Categorie suggerite:**
- "Introduzione"
- "Operazioni Base"
- "Funzioni Avanzate"
- "Amministrazione"
- "Troubleshooting"

> Mantenere coerenza con categorie FAQ.

---

## 5. Gestire FAQ

### File Sorgente

**Percorso:** `src/data/faqData.js`

**Struttura:**
```javascript
export const faqCategories = [
  {
    category: "Nome Categoria",
    icon: "❓",                           // Emoji singola
    questions: [
      {
        id: 'faq-1',                      // Univoco
        question: "Domanda?",
        answer: "Risposta dettagliata.",
        relatedVideo: 'video-1'           // Opzionale: id da videoTutorials
      },
      // ... altre domande
    ]
  },
  // ... altre categorie
];
```

### Aggiungere Nuova FAQ

**1. Identificare categoria esistente**
```javascript
// Categorie attuali:
// - Generale
// - Fogli di Assistenza
// - Clienti e Anagrafiche
// - Problemi Tecnici
// - Calendario e Pianificazione
```

**2. Aggiungere domanda**
```javascript
{
  category: "Fogli di Assistenza",
  icon: "📋",
  questions: [
    // ... domande esistenti

    {
      id: 'faq-nuovo',                   // Incrementare numero progressivo
      question: "Come copio un foglio esistente?",
      answer: "Vai su Fogli Assistenza, seleziona il foglio con la checkbox, clicca 'Copia'. Il sistema creerà un nuovo foglio con dati copiati ma numero, stato e firme resettati.",
      relatedVideo: 'video-copia-fogli' // Se esiste video correlato
    }
  ]
}
```

**3. Collegare a Video (opzionale)**
Se esiste video correlato:
```javascript
relatedVideo: 'video-5'  // ID deve esistere in videoTutorials.js
```

**4. Compilare e Testare**
```bash
npm run dev
# Info → Documentazione → FAQ
# Verifica domanda appare nella categoria
# Se relatedVideo, testare link
```

**5. Commit**
```bash
git add src/data/faqData.js
git commit -m "docs: aggiungi FAQ su copia fogli"
```

### Creare Nuova Categoria

```javascript
export const faqCategories = [
  // ... categorie esistenti

  {
    category: "Report e Statistiche",    // Nuova categoria
    icon: "📊",
    questions: [
      {
        id: 'faq-report-1',
        question: "Come esporto i dati in Excel?",
        answer: "Vai su Statistiche, imposta il periodo, clicca 'Esporta Excel'."
      }
    ]
  }
];
```

### Modificare FAQ Esistente

**Trovare per ID:**
```bash
# Cercare id specifico
grep -n "faq-5" src/data/faqData.js
```

**Modificare testo:**
```javascript
{
  id: 'faq-5',
  question: "Domanda aggiornata?",
  answer: "Risposta aggiornata con nuove info versione 1.1.12."
}
```

### Eliminare FAQ

**Rimozione completa:**
```javascript
// Eliminare l'oggetto dal questions array
```

**Disabilitazione (preferibile):**
```javascript
{
  id: 'faq-obsoleta',
  question: "[OBSOLETO] Vecchia domanda?",
  answer: "Questa funzionalità è stata rimossa. Vedi FAQ [nuova].",
  relatedVideo: null
}
```

### Best Practice FAQ

**Stile risposte:**
- Chiare e dirette
- Massimo 2-3 frasi
- Includere path se necessario (es: "Menu → Fogli → Copia")
- Se procedura lunga, linkare video

**ID univoci:**
- Formato: `faq-<numero>` o `faq-<categoria>-<numero>`
- Non riutilizzare ID eliminati

**Collegamento video:**
- Solo se video specifico esiste
- Testare link funziona

---

## 6. Aggiornare i Manuali Markdown

### Workflow Standard

**1. Identificare modifiche necessarie**
- Leggere CHANGELOG nuova versione
- Identificare funzionalità da documentare
- Determinare posizionamento nei manuali

**2. Aprire file da modificare**
```bash
# Completi
code docs/Manuale_Tecnico_Completo.md
code docs/Manuale_Manager_Completo.md

# QuickStart
code docs/Manuale_Tecnico_QuickStart.md
code docs/Manuale_Manager_QuickStart.md
```

**3. Modificare contenuto**
- Mantenere stile informale
- Usare tabelle per confronti
- Includere esempi pratici
- Aggiungere note/avvisi se importante

**4. Aggiornare metadata**
```markdown
**Versione**: 1.1.12 | **Ultimo aggiornamento**: Dicembre 2025
```

**5. Aggiornare indice (se nuove sezioni)**
```markdown
## Indice
1. [Capitolo Esistente](#capitolo-esistente)
2. [Nuovo Capitolo](#nuovo-capitolo)  // <-- Aggiungere
```

**6. Aggiornare sezione "Novità per Versione"**
Aggiungere entry per nuova versione in Cap. 10 (vedi template sotto).

**7. Aggiornare footer**
```markdown
*Manuale Completo OilSafe Service Hub - Versione [Ruolo] v1.1.12*
```

**8. Commit**
```bash
git add docs/Manuale_*.md
git commit -m "docs: aggiorna manuali a v1.1.12 - [breve descrizione]"
```

### Template Nuova Funzionalità

**Per Manuali Completi:**
```markdown
### X.X Titolo Funzionalità

Introduzione: cosa fa la funzionalità e perché è utile.

#### Come Funziona

Spiegazione meccanismo.

#### Procedura Passo-Passo

1. **Passo 1**
   - Dettaglio azione
   - Cosa aspettarsi

2. **Passo 2**
   - Dettaglio azione
   - Cosa aspettarsi

#### Campi/Opzioni

| Campo | Descrizione |
|-------|-------------|
| **Nome campo** | Spiegazione |

#### Limitazioni

- Cosa non si può fare
- Requisiti necessari

> **Suggerimento**: Tips per uso ottimale
```

**Per QuickStart:**
```markdown
### X. Titolo Funzionalità

#### Passi rapidi

1. Azione 1
2. Azione 2
3. Azione 3

> **Novità vX.X.X**: Breve nota su cosa cambia
```

### Integrare Funzionalità in Sezione Esistente

**Posizionamento:**
- **Inizio sezione**: se funzionalità nuova e importante
- **Dopo paragrafo specifico**: se estende funzionalità esistente
- **Fine sezione**: se dettaglio opzionale

**Marker:**
```markdown
#### Nuova Funzionalità (vX.X.X)

Descrizione...

> Questa funzionalità è disponibile dalla versione X.X.X.
```

### Rinumerare Sezioni

Se inserisci nuova sezione intermedia:
```markdown
# Prima
5.3 Sezione A
5.4 Sezione B

# Dopo (inserito 5.4 Nuova)
5.3 Sezione A
5.4 Nuova Sezione  // <-- Inserita
5.5 Sezione B      // <-- Rinumerata
```

**Aggiornare:**
- Numeri sezione nel testo
- Link anchor nell'indice
- Riferimenti incrociati (es: "vedi sezione 5.5")

---

## 7. Workflow Rilascio Nuova Versione

### Checklist Completa

**Pre-Release (Developer)**

- [ ] **Codice completo** e testato
- [ ] **CHANGELOG.md** aggiornato con nuova versione
- [ ] **package.json** `version` incrementata
- [ ] Copiare CHANGELOG in `public/CHANGELOG.md`

**Documentazione (Developer/Manager)**

- [ ] Aggiornare **Manuali Markdown**:
  - [ ] Manuale_Tecnico_Completo.md
  - [ ] Manuale_Tecnico_QuickStart.md
  - [ ] Manuale_Manager_Completo.md
  - [ ] Manuale_Manager_QuickStart.md
- [ ] Aggiungere entry in Cap. 10 "Novità per Versione" (entrambi Completi)
- [ ] Aggiornare **FAQ** se nuove domande comuni
- [ ] Aggiungere **Video Tutorial** se funzionalità complessa
- [ ] Aggiornare **Manuale PDF** (se minor/major release)

**Test Documentazione**

- [ ] `npm run dev`
- [ ] Verificare pagina Info → Changelog mostra nuova versione
- [ ] Verificare tab Documentazione:
  - [ ] PDF carica correttamente
  - [ ] Video tutorial funzionano
  - [ ] FAQ espandono/collassano
- [ ] Controllare manuali Markdown renderizzano bene (con editor Markdown)

**Commit e Tag**

```bash
# Add all docs
git add CHANGELOG.md public/CHANGELOG.md
git add docs/*.md
git add src/data/*.js
git add public/docs/*.pdf
git add package.json

# Commit
git commit -m "chore: release v1.1.12

- Documentazione online integrata
- Aggiornati manuali completi e QuickStart
- Aggiunti video tutorial e FAQ
- Aggiornato manuale PDF

Closes #XXX"

# Tag
git tag -a v1.1.12 -m "Release v1.1.12: Documentazione online"

# Push
git push origin main --tags
```

**Build e Deploy**

```bash
# Build produzione
npm run build

# Deploy (secondo procedura aziendale)
# ...

# Verify deployed
# - Controllare versione in dashboard
# - Testare pagina Info
# - Scaricare PDF da documentazione
```

**Post-Release**

- [ ] Comunicare nuova versione ai team
- [ ] Aggiornare documentazione esterna se necessaria
- [ ] Monitorare feedback utenti su nuova documentazione

---

## 8. Troubleshooting

### Problema: PDF non si carica in Info page

**Sintomi:**
- Spinner infinito
- Errore "Impossibile caricare il manuale"

**Soluzioni:**

**1. Verificare file esiste**
```bash
ls -lh public/docs/manuale-utente.pdf
```

**2. Controllare console browser**
```javascript
// DevTools → Console
// Cercare errori react-pdf o CORS
```

**3. Verificare configurazione worker**
```javascript
// In InfoPage.jsx deve esserci:
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
```

**4. Cache browser**
- Ctrl+Shift+R (hard refresh)
- Svuotare cache completamente

**5. File corrotto**
- Aprire PDF con altro viewer (Adobe, browser)
- Se corrotto, rigenerare

---

### Problema: Video YouTube non si carica

**Sintomi:**
- Thumbnail OK, player non carica
- Errore "Video non disponibile"

**Soluzioni:**

**1. Verificare ID video corretto**
```javascript
// In videoTutorials.js
youtubeId: "ABC123XYZ"  // Controllare sia corretto
```

**2. Controllare visibilità YouTube**
- Video deve essere "Pubblico" o "Non in elenco"
- "Privato" non funziona con embed

**3. Testare URL diretto**
```
https://www.youtube.com/watch?v=ABC123XYZ
```

**4. CORS / Embedding disabilitato**
- YouTube potrebbe bloccare embed
- Controllare impostazioni video su YouTube

---

### Problema: FAQ non appare

**Sintomi:**
- Categoria appare vuota
- Domanda non visibile

**Soluzioni:**

**1. Verificare sintassi JS**
```bash
# Test compile
npm run build
# Cercare errori in src/data/faqData.js
```

**2. Verificare id univoco**
```javascript
// NON duplicare id
{
  id: 'faq-5',  // <-- Controllare non esista già
  // ...
}
```

**3. Verificare struttura**
```javascript
// Deve essere array di oggetti
export const faqCategories = [
  { category: "...", icon: "...", questions: [...] }
];
```

**4. Cache React**
```bash
# Pulire cache e restart
rm -rf node_modules/.vite
npm run dev
```

---

### Problema: Changelog non aggiornato in Info page

**Sintomi:**
- CHANGELOG.md aggiornato ma Info page mostra vecchio

**Soluzioni:**

**1. Verificare copia in public/**
```bash
# Deve esistere
ls public/CHANGELOG.md

# Copiare manualmente se necessario
cp CHANGELOG.md public/CHANGELOG.md
```

**2. Hard refresh browser**
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

**3. Verificare build**
```bash
npm run build
# Verificare che public/CHANGELOG.md sia incluso nel build
```

---

### Problema: Markdown non renderizza correttamente

**Sintomi:**
- File `.md` appare come testo grezzo
- Tabelle non formattate

**Soluzioni:**

**1. Usare editor con preview Markdown**
- VS Code + estensione Markdown Preview
- Typora
- Marked 2 (Mac)

**2. Verificare sintassi**
```markdown
# Intestazione 1
## Intestazione 2

| Colonna | Colonna |
|---------|---------|
| Valore  | Valore  |

- Lista 1
- Lista 2
```

**3. Tool online**
- https://dillinger.io/
- https://stackedit.io/

---

## Appendice A: Reference Rapido

### Comandi Frequenti

```bash
# Dev server
npm run dev

# Build produzione
npm run build

# Test lint
npm run lint
```

### Path Importanti

```
public/docs/manuale-utente.pdf       # PDF integrato
src/data/videoTutorials.js           # Video
src/data/faqData.js                  # FAQ
src/pages/InfoPage.jsx               # Componente Info
docs/                                # Manuali Markdown
CHANGELOG.md                         # Storico versioni
```

### Contatti

**Sviluppatore:** Massimo Centrella
**Azienda:** Oilsafe S.r.l.
**Documentazione React-PDF:** https://github.com/wojtekmaj/react-pdf

---

## Appendice B: Template Entry "Novità per Versione"

### Per Manuali Completi

```markdown
---

### Versione X.X.X (Mese Anno)
#### Titolo Funzionalità [Emoji]

**Cosa è stato aggiunto:**
- Punto 1
- Punto 2

**Dove trovi la funzione:**
Path nell'app

**Perché è utile:**
- Beneficio 1
- Beneficio 2

**⚠️ Attenzione:** (se applicabile)
Note importanti

**Capitolo di riferimento:** X.X (Nome Capitolo)

---
```

### Per QuickStart

```markdown
**Nuova Funzionalità** [Emoji]
- Descrizione brevissima
- Dove trovarla: Path
- Tip: Suggerimento uso rapido
```

---

## Appendice C: Icone/Emoji Consigliate

### Per Funzionalità

| Emoji | Significato |
|-------|-------------|
| 📖 | Documentazione |
| 🖥️ | Desktop |
| 📱 | Mobile |
| 📋 | Fogli/Documenti |
| 💻 | Remote/Teleassistenza |
| ℹ️ | Informazioni |
| ⚠️ | Attenzione importante |
| 🎥 | Video |
| ❓ | FAQ |
| 📊 | Report/Statistiche |
| 📅 | Calendario |
| 🔧 | Manutenzione/Tool |
| ✅ | Completato/OK |
| ❌ | Errore/Non permesso |
| 🚀 | Novità/Release |

### Per Categorie FAQ

| Emoji | Categoria |
|-------|-----------|
| ❓ | Generale |
| 📋 | Fogli Assistenza |
| 👥 | Clienti/Anagrafiche |
| 🔧 | Problemi Tecnici |
| 📅 | Calendario/Pianificazione |
| 📊 | Report |

---

*Guida Manutenzione Documentazione OilSafe Service Hub v1.0.0*
