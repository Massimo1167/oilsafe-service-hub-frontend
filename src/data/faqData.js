/**
 * FAQ - Domande Frequenti
 *
 * Organizzate per categoria con possibilità di collegare video tutorial
 *
 * Per aggiungere una nuova FAQ:
 * 1. Scegli la categoria appropriata o creane una nuova
 * 2. Aggiungi un oggetto question con id univoco, domanda e risposta
 * 3. Opzionale: aggiungi relatedVideo con l'id del video tutorial correlato
 */

export const faqCategories = [
  {
    category: "Generale",
    icon: "❓",
    questions: [
      {
        id: 'faq-1',
        question: "Come accedo al sistema?",
        answer: "Utilizza le credenziali fornite dal tuo amministratore. Se hai dimenticato la password, usa il link 'Password dimenticata' nella pagina di login o contatta l'amministratore di sistema."
      },
      {
        id: 'faq-2',
        question: "Quali browser sono supportati?",
        answer: "Il sistema funziona su Chrome, Firefox, Safari e Edge (versioni recenti). Per la migliore esperienza, consigliamo Chrome o Edge."
      },
      {
        id: 'faq-3',
        question: "Come posso cambiare la mia password?",
        answer: "Dopo aver effettuato il login, vai nell'area del tuo profilo e seleziona 'Cambia Password'. Inserisci la password attuale e la nuova password due volte per conferma. Se la funzionalità non è disponibile contatta l'amministratore di stistema"
      }
    ]
  },
  {
    category: "Fogli di Assistenza",
    icon: "📋",
    questions: [
      {
        id: 'faq-4',
        question: "Come creo un nuovo foglio di assistenza?",
        answer: "Vai su 'Fogli Assistenza' nel menu principale, poi clicca sul pulsante 'Nuovo Foglio'. Compila i campi obbligatori (cliente, tecnico, data) e clicca 'Salva'.",
        relatedVideo: 'video-1' // Collegamento al video tutorial (quando disponibile)
      },
      {
        id: 'faq-5',
        question: "Posso modificare un foglio già salvato?",
        answer: "Sì, puoi modificare un foglio di assistenza cliccando sull'icona di modifica. Alcune informazioni potrebbero non essere modificabili se il foglio è già stato firmato o completato."
      },
      {
        id: 'faq-6',
        question: "Come aggiungo interventi al foglio?",
        answer: "Apri il foglio di assistenza e clicca su 'Aggiungi Intervento'. Compila i dettagli dell'intervento e salva. Puoi aggiungere più interventi allo stesso foglio."
      }
    ]
  },
  {
    category: "Clienti e Anagrafiche",
    icon: "👥",
    questions: [
      {
        id: 'faq-7',
        question: "Come aggiungo un nuovo cliente?",
        answer: "Vai su 'Gestione Clienti' (disponibile per manager e admin), clicca 'Nuovo Cliente' e compila i dati richiesti. I campi con asterisco sono obbligatori."
      },
      {
        id: 'faq-8',
        question: "Posso modificare i dati di un cliente?",
        answer: "Sì, se hai i permessi di manager o admin. Vai su 'Gestione Clienti', trova il cliente e clicca sull'icona di modifica."
      }
    ]
  },
  {
    category: "Problemi Tecnici",
    icon: "🔧",
    questions: [
      {
        id: 'faq-9',
        question: "Il PDF non si genera correttamente",
        answer: "Verifica che tutti i campi obbligatori siano compilati. Se il problema persiste, prova a ricaricare la pagina (F5) o svuota la cache del browser (Ctrl+Shift+Canc)."
      },
      {
        id: 'faq-10',
        question: "L'applicazione è lenta o non risponde",
        answer: "Prova a ricaricare la pagina. Se il problema persiste, chiudi tutti i tab non necessari, riavvia il browser o contatta l'amministratore di sistema."
      },
      {
        id: 'faq-11',
        question: "Ho perso i dati che stavo inserendo",
        answer: "L'applicazione salva automaticamente le bozze dei fogli di assistenza. Controlla nell'elenco dei fogli se è presente una bozza con i tuoi dati parziali."
      }
    ]
  },
  {
    category: "Calendario e Pianificazione",
    icon: "📅",
    questions: [
      {
        id: 'faq-12',
        question: "Come funziona il calendario degli interventi?",
        answer: "Il calendario mostra tutti gli interventi pianificati. Puoi visualizzare per giorno, settimana o mese. Clicca su un intervento per vedere i dettagli completi."
      },
      {
        id: 'faq-13',
        question: "Posso spostare un intervento nel calendario?",
        answer: "Sì, se hai i permessi necessari. Trascina l'intervento sulla nuova data o clicca su di esso e modifica la data manualmente."
      }
    ]
  }
];
