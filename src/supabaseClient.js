// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Sostituisci con i tuoi valori reali!
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Errore: URL Supabase o Chiave Anon non definite. Controlla supabaseClient.js e le variabili d'ambiente.");
  // Potresti voler lanciare un errore più bloccante qui o gestire diversamente
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);