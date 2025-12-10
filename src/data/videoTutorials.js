/**
 * Configurazione Video Tutorial YouTube
 *
 * Per aggiungere un nuovo video:
 * 1. Ottieni l'ID video da YouTube (es: da https://youtube.com/watch?v=ABC123 → ABC123)
 * 2. Aggiungi un nuovo oggetto all'array con le informazioni del video
 * 3. La thumbnail viene generata automaticamente da YouTube
 */

export const videoTutorials = [
  {
    id: 'video-1',
    title: "Introduzione a Oilsafe Service Hub",
    description: "Panoramica generale delle funzionalità principali dell'applicazione",
    youtubeId: "qZAHNAKaq50", // Sostituisci con l'ID del tuo video YouTube
    thumbnail: "https://img.youtube.com/vi/qZAHNAKaq50/mqdefault.jpg",
    duration: "3:59",
    category: "Introduzione"
  },
  // Aggiungi altri video qui seguendo lo stesso formato
  /*
  {
    id: 'video-2',
    title: "Creare un Foglio di Assistenza",
    description: "Tutorial passo-passo per la creazione di nuovi fogli di assistenza",
    youtubeId: "TUO_VIDEO_ID",
    thumbnail: "https://img.youtube.com/vi/TUO_VIDEO_ID/mqdefault.jpg",
    duration: "8:45",
    category: "Operazioni Base"
  },
  */
];
