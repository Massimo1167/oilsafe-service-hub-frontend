/**
 * Simple landing page shown after login. Displays a welcome message
 * using session data provided by `App.jsx`.
 * Shows role-based statistics: user sees their assigned sheets, admin sees all sheets.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import oilsafeLogo from '../assets/oilsafe-logo.png';
import { getStatsByStatus, getStatsForTechnician } from '../utils/statistiche';

// Componente per la pagina Dashboard.
// Ora è una semplice pagina di benvenuto, ripulita dalla funzionalità di test del PDF.
function DashboardPage({ session, userRole }) { // Riceve la sessione e il ruolo per personalizzare il saluto e le statistiche
  const navigate = useNavigate();
  const [statsUser, setStatsUser] = useState(null); // Statistiche per user
  const [statsAdmin, setStatsAdmin] = useState(null); // Statistiche per admin
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);

        const role = (userRole || '').trim().toLowerCase();

        if (role === 'user') {
          // Per utenti di tipo user: statistiche dei fogli con loro interventi
          // Prima trova il tecnico corrispondente all'utente loggato
          const { data: tecnico, error: tecnicoError } = await supabase
            .from('tecnici')
            .select('id')
            .eq('user_id', session.user.id)
            .single();

          if (tecnicoError || !tecnico) {
            console.warn('Nessun tecnico associato a questo utente');
            setStatsUser({
              aperti: 0,
              inLavorazione: 0,
              attesaFirma: 0,
              completati: 0,
              completatiMeseCorrente: 0,
              completatiMesePrecedente: 0
            });
          } else {
            const userStats = await getStatsForTechnician(tecnico.id);
            setStatsUser(userStats);
          }
        } else if (role === 'admin' || role === 'manager') {
          // Per admin/manager: statistiche globali per stato
          const adminStats = await getStatsByStatus();
          setStatsAdmin(adminStats);
        }
      } catch (error) {
        console.error('Errore caricamento statistiche:', error);
      } finally {
        setLoadingStats(false);
      }
    };

    if (session) {
      fetchStats();
    }
  }, [session, userRole]);

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

          {/* Sezione Statistiche Fogli Assistenza - Basata sul ruolo */}
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
              <>
                {/* Statistiche per utente USER */}
                {(userRole || '').toLowerCase() === 'user' && statsUser && (
                  <div>
                    <p style={{ fontSize: '0.9em', fontStyle: 'italic', marginBottom: '1rem', color: '#555' }}>
                      I tuoi fogli di assistenza
                    </p>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '1rem'
                    }}>
                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#17a2b8' }}>
                          {statsUser.aperti}
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>Aperti</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#ffc107' }}>
                          {statsUser.inLavorazione}
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>In Lavorazione</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#fd7e14' }}>
                          {statsUser.attesaFirma}
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>Attesa Firma</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#28a745' }}>
                          {statsUser.completati}
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>Completati</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#007bff' }}>
                          {statsUser.completatiMeseCorrente}
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>Completati mese corrente</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '2em', fontWeight: 'bold', color: '#6c757d' }}>
                          {statsUser.completatiMesePrecedente}
                        </div>
                        <div style={{ fontSize: '0.85em', color: '#666' }}>Completati mese precedente</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Statistiche per utente ADMIN/MANAGER */}
                {((userRole || '').toLowerCase() === 'admin' || (userRole || '').toLowerCase() === 'manager') && statsAdmin && (
                  <div>
                    <p style={{ fontSize: '0.9em', fontStyle: 'italic', marginBottom: '1rem', color: '#555' }}>
                      Tutti i fogli di assistenza
                    </p>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '0.8rem'
                    }}>
                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#17a2b8' }}>
                          {statsAdmin['Aperto'] || 0}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>Aperti</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#ffc107' }}>
                          {statsAdmin['In Lavorazione'] || 0}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>In Lavorazione</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#fd7e14' }}>
                          {statsAdmin['Attesa Firma'] || 0}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>Attesa Firma</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#28a745' }}>
                          {statsAdmin['Completato'] || 0}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>Completati</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#20c997' }}>
                          {statsAdmin['Consuntivato'] || 0}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>Consuntivati</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#007bff' }}>
                          {statsAdmin['Inviato'] || 0}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>Inviati</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#6f42c1' }}>
                          {statsAdmin['In attesa accettazione'] || 0}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>In attesa accettazione</div>
                      </div>

                      <div style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#343a40' }}>
                          {statsAdmin['Fatturato'] || 0}
                        </div>
                        <div style={{ fontSize: '0.8em', color: '#666' }}>Fatturati</div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Badge Versione Cliccabile */}
      <div style={{ marginTop: '2rem', textAlign: 'center' }}>
        <button
          className="version-badge"
          onClick={() => navigate('/info')}
          title="Clicca per informazioni complete"
        >
          <span className="version-badge-icon">ℹ️</span>
          <span className="version-badge-text">
            {/* eslint-disable-next-line no-undef */}
            Versione <strong>{__APP_VERSION__}</strong>
          </span>
          <span className="version-badge-arrow">→</span>
        </button>
      </div>

      <hr style={{margin: "20px 0"}} />
      <p>Utilizza il menu di navigazione in alto per accedere alle diverse sezioni dell'applicazione.</p>
    </div>
  );
}
export default DashboardPage;