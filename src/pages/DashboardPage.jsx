// src/pages/DashboardPage.jsx
import React from 'react';

// Componente per la pagina Dashboard.
// Ora è una semplice pagina di benvenuto, ripulita dalla funzionalità di test del PDF.
function DashboardPage({ session }) { // Riceve la sessione per personalizzare il saluto
  return (
    <div>
      <h2>Dashboard</h2>
      <p>Benvenuto in Oilsafe Service Hub!</p>
      {/* Mostra un messaggio di benvenuto personalizzato se la sessione utente è attiva */}
      {session && 
        <p>
          Loggato come: <strong>{session.user.full_name || session.user.email}</strong> 
          (Ruolo: <strong>{session.user.role}</strong>)
        </p>
      }
      <hr style={{margin: "20px 0"}} />
      <p>Utilizza il menu di navigazione in alto per accedere alle diverse sezioni dell'applicazione.</p>
    </div>
  );
}
export default DashboardPage;