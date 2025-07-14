/**
 * Simple landing page shown after login. Displays a welcome message
 * using session data provided by `App.jsx`.
 */
import React from 'react';
import oilsafeLogo from '../assets/oilsafe-logo.png';

// Componente per la pagina Dashboard.
// Ora è una semplice pagina di benvenuto, ripulita dalla funzionalità di test del PDF.
function DashboardPage({ session }) { // Riceve la sessione per personalizzare il saluto
  return (
    <div>
        <h2>Dashboard</h2>
        <img src={oilsafeLogo} alt="Oilsafe Service Hub logo" style={{ maxWidth: '250px', height: 'auto' }} />
        <p>Benvenuto in Oilsafe Service Hub!</p>
      {/* Mostra un messaggio di benvenuto personalizzato se la sessione utente è attiva */}
      {session &&
        <p>
          Loggato come: <strong>{session.user.full_name || session.user.email}</strong>
          <br />
          Ruolo: <strong>{session.user.role}</strong>
        </p>
   
      }
      <p style={{ fontStyle: 'italic', marginTop: '1em' }}>
        Ver.: {__APP_VERSION__} - 
      </p>
      <p style={{ fontStyle: 'italic', marginTop: '1em' }}>
        Desc. ver.: {__APP_DESCRIPTION__}
      </p>
      <p>DB collegato: {import.meta.env.VITE_SUPABASE_DB_LABEL}</p>
      <p style={{ fontStyle: 'italic', marginTop: '1em' }}>
        Sviluppato da Massimo Centrella 
      </p>
      <hr style={{margin: "20px 0"}} />
      <p>Utilizza il menu di navigazione in alto per accedere alle diverse sezioni dell'applicazione.</p>
    </div>
  );
}
export default DashboardPage;