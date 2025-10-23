/**
 * Simple landing page shown after login. Displays a welcome message
 * using session data provided by `App.jsx`.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import oilsafeLogo from '../assets/oilsafe-logo.png';

// Componente per la pagina Dashboard.
// Ora è una semplice pagina di benvenuto, ripulita dalla funzionalità di test del PDF.
function DashboardPage({ session }) { // Riceve la sessione per personalizzare il saluto
  const [stats, setStats] = useState({
    totale: 0,
    ultimaSettimana: 0,
    meseCorrente: 0,
    mesePrecedente: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);

        // Date di riferimento
        const oggi = new Date();
        const setteGiorniFa = new Date(oggi);
        setteGiorniFa.setDate(oggi.getDate() - 7);

        const inizioMeseCorrente = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
        const inizioMesePrecedente = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1);
        const fineMesePrecedente = new Date(oggi.getFullYear(), oggi.getMonth(), 0);

        // Query 1: Totale fogli
        const { count: totale } = await supabase
          .from('fogli_assistenza')
          .select('*', { count: 'exact', head: true });

        // Query 2: Ultima settimana
        const { count: ultimaSettimana } = await supabase
          .from('fogli_assistenza')
          .select('*', { count: 'exact', head: true })
          .gte('data_apertura_foglio', setteGiorniFa.toISOString().split('T')[0]);

        // Query 3: Mese corrente
        const { count: meseCorrente } = await supabase
          .from('fogli_assistenza')
          .select('*', { count: 'exact', head: true })
          .gte('data_apertura_foglio', inizioMeseCorrente.toISOString().split('T')[0]);

        // Query 4: Mese precedente
        const { count: mesePrecedente } = await supabase
          .from('fogli_assistenza')
          .select('*', { count: 'exact', head: true })
          .gte('data_apertura_foglio', inizioMesePrecedente.toISOString().split('T')[0])
          .lte('data_apertura_foglio', fineMesePrecedente.toISOString().split('T')[0]);

        setStats({
          totale: totale || 0,
          ultimaSettimana: ultimaSettimana || 0,
          meseCorrente: meseCorrente || 0,
          mesePrecedente: mesePrecedente || 0
        });
      } catch (error) {
        console.error('Errore caricamento statistiche:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (session) {
      fetchStats();
    }
  }, [session]);

  return (
    <div>
      {/* Header con titolo e logo affiancati */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <h2 style={{ margin: 0 }}>Dashboard</h2>
        <img
          src={oilsafeLogo}
          alt="Oilsafe Service Hub logo"
          style={{ maxWidth: '200px', height: 'auto' }}
        />
      </div>

      <p>Benvenuto in Oilsafe Service FLE!</p>
      {/* Mostra un messaggio di benvenuto personalizzato se la sessione utente è attiva */}
      {session && (
        <>
          <p>
            Loggato come: <strong>{session.user.full_name || session.user.email}</strong>
            <br />
            Ruolo: <strong>{session.user.role}</strong>
          </p>

          {/* Sezione Statistiche Fogli Assistenza */}
          <div style={{
            marginTop: '1.5rem',
            marginBottom: '1.5rem',
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.8rem', fontSize: '1.1em' }}>
              📊 Statistiche Fogli di Assistenza
            </h3>

            {loadingStats ? (
              <p style={{ fontStyle: 'italic', color: '#666' }}>Caricamento statistiche...</p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '1rem'
              }}>
                <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                  <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#007bff' }}>
                    {stats.totale}
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#666' }}>Totale fogli</div>
                </div>

                <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                  <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#28a745' }}>
                    {stats.ultimaSettimana}
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#666' }}>Ultima settimana</div>
                </div>

                <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                  <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#ffc107' }}>
                    {stats.meseCorrente}
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#666' }}>Mese corrente</div>
                </div>

                <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                  <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#6c757d' }}>
                    {stats.mesePrecedente}
                  </div>
                  <div style={{ fontSize: '0.9em', color: '#666' }}>Mese precedente</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      <p style={{ fontStyle: 'italic', marginTop: '1em' }}>
        {/* eslint-disable-next-line no-undef */}
        Versione: {__APP_VERSION__}
      </p>
      <div style={{ fontStyle: 'italic', marginTop: '1em' }}>
        <p style={{ marginBottom: '0.5em', fontWeight: 'bold' }}>Modifiche recenti:</p>
        <ul style={{ marginTop: '0.5em', paddingLeft: '20px', lineHeight: '1.6' }}>
          {/* eslint-disable-next-line no-undef */}
          {__APP_DESCRIPTION__.split(';').map((item, idx) => (
            <li key={idx}>{item.trim()}</li>
          ))}
        </ul>
      </div>
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