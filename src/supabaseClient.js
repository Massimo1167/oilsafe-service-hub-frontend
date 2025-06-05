// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

// Sostituisci con i tuoi valori reali!
const supabaseUrl = 'https://snrorrdmprbrqxdojgtp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNucm9ycmRtcHJicnF4ZG9qZ3RwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgzNDIyNTQsImV4cCI6MjA2MzkxODI1NH0.LPxBdoOEwEQAB4BhHbxudu2eUWg42ewN8085ZL34CMY';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Errore: URL Supabase o Chiave Anon non definite. Controlla supabaseClient.js e le variabili d'ambiente.");
  // Potresti voler lanciare un errore più bloccante qui o gestire diversamente
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);