// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Recupera le variabili d'ambiente definite nel tuo file .env (per lo sviluppo locale)
// o nelle impostazioni di Netlify (per il deploy)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  let errorMessage = "ERRORE CRITICO: Configurazione Supabase mancante. ";
  if (!supabaseUrl) errorMessage += "VITE_SUPABASE_URL non è definita. ";
  if (!supabaseAnonKey) errorMessage += "VITE_SUPABASE_ANON_KEY non è definita. ";
  
  errorMessage += "Controlla le tue variabili d'ambiente (file .env per sviluppo locale, impostazioni del sito su Netlify per il deploy).";
  
  console.error(errorMessage);
  // Potresti voler mostrare questo errore anche nell'UI o bloccare l'app
  alert(errorMessage); // Semplice alert per ora, considera una soluzione UI migliore
  // throw new Error(errorMessage); // Questo bloccherebbe l'esecuzione dello script
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);