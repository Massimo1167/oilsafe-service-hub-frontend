/**
 * Advanced statistics page for admin users.
 * Shows detailed analytics with time-period filters and breakdowns.
 */
import React, { useState, useEffect } from 'react';
import { getStatsByTimePeriod, getTopClients, getTopTechnicians } from '../utils/statistiche';
import { STATO_FOGLIO_STEPS } from '../utils/statoFoglio';

function StatistichePage({ session }) {
  const [selectedPeriod, setSelectedPeriod] = useState('mese_corrente');
  const [statsPeriod, setStatsPeriod] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [topTechs, setTopTechs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      try {
        // Carica statistiche per periodo selezionato
        const periodData = await getStatsByTimePeriod(selectedPeriod);
        setStatsPeriod(periodData);

        // Carica top clienti e tecnici
        const clients = await getTopClients(5);
        const techs = await getTopTechnicians(5);
        setTopClients(clients);
        setTopTechs(techs);
      } catch (error) {
        console.error('Errore caricamento statistiche:', error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchStatistics();
    }
  }, [session, selectedPeriod]);

  const handlePeriodChange = (e) => {
    setSelectedPeriod(e.target.value);
  };

  const getPeriodLabel = (period) => {
    const labels = {
      'settimana_corrente': 'Settimana Corrente',
      'settimana_precedente': 'Settimana Precedente',
      'mese_corrente': 'Mese Corrente',
      'mese_precedente': 'Mese Precedente',
      'anno_corrente': 'Anno Corrente'
    };
    return labels[period] || period;
  };

  return (
    <div>
      <h2>Statistiche Avanzate</h2>
      <p style={{ color: '#666', fontStyle: 'italic' }}>
        Analisi dettagliata dei fogli di assistenza
      </p>

      {/* Selettore periodo */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6'
      }}>
        <label htmlFor="period-select" style={{ fontWeight: 'bold', marginRight: '1rem' }}>
          Periodo:
        </label>
        <select
          id="period-select"
          value={selectedPeriod}
          onChange={handlePeriodChange}
          style={{
            padding: '0.5rem',
            fontSize: '1rem',
            borderRadius: '4px',
            border: '1px solid #ced4da'
          }}
        >
          <option value="settimana_corrente">Settimana Corrente</option>
          <option value="settimana_precedente">Settimana Precedente</option>
          <option value="mese_corrente">Mese Corrente</option>
          <option value="mese_precedente">Mese Precedente</option>
          <option value="anno_corrente">Anno Corrente</option>
        </select>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="spinner"></div>
          <p style={{ marginTop: '1rem', color: '#666' }}>Caricamento statistiche...</p>
        </div>
      ) : (
        <>
          {/* Statistiche per periodo */}
          {statsPeriod && (
            <div style={{
              marginBottom: '2rem',
              padding: '1rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#ffffff'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                Fogli - {getPeriodLabel(selectedPeriod)}
              </h3>
              <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '1rem' }}>
                Dal {statsPeriod.startDate} al {statsPeriod.endDate}
              </p>

              {/* Totale */}
              <div style={{
                backgroundColor: '#e7f3ff',
                padding: '1rem',
                borderRadius: '6px',
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3em', fontWeight: 'bold', color: '#0056b3' }}>
                  {statsPeriod.totale}
                </div>
                <div style={{ fontSize: '1.1em', color: '#333' }}>Totale Fogli Aperti</div>
              </div>

              {/* Breakdown per stato */}
              <h4 style={{ marginBottom: '1rem' }}>Distribuzione per Stato</h4>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '0.8rem'
              }}>
                {STATO_FOGLIO_STEPS.map((stato, index) => {
                  const count = statsPeriod.byStatus[stato] || 0;
                  const colors = [
                    '#17a2b8', '#ffc107', '#fd7e14', '#28a745',
                    '#20c997', '#007bff', '#6f42c1', '#343a40', '#dc3545'
                  ];
                  const color = colors[index % colors.length];

                  return (
                    <div
                      key={stato}
                      style={{
                        textAlign: 'center',
                        padding: '0.8rem 0.5rem',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '6px',
                        border: '1px solid #e9ecef'
                      }}
                    >
                      <div style={{ fontSize: '1.8em', fontWeight: 'bold', color }}>
                        {count}
                      </div>
                      <div style={{ fontSize: '0.75em', color: '#666', marginTop: '0.3rem' }}>
                        {stato}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sezione Top Clienti e Top Tecnici */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {/* Top 5 Clienti */}
            <div style={{
              padding: '1rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#ffffff'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Top 5 Clienti</h3>
              {topClients.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.9em' }}>Cliente</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.9em' }}>Fogli</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topClients.map((client, index) => (
                      <tr key={client.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '0.5rem', fontSize: '0.9em' }}>
                          <span style={{
                            display: 'inline-block',
                            width: '24px',
                            height: '24px',
                            lineHeight: '24px',
                            textAlign: 'center',
                            backgroundColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#e9ecef',
                            borderRadius: '50%',
                            marginRight: '0.5rem',
                            fontWeight: 'bold',
                            fontSize: '0.85em'
                          }}>
                            {index + 1}
                          </span>
                          {client.nome}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em' }}>
                          {client.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontStyle: 'italic', color: '#999' }}>Nessun dato disponibile</p>
              )}
            </div>

            {/* Top 5 Tecnici */}
            <div style={{
              padding: '1rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#ffffff'
            }}>
              <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Top 5 Tecnici</h3>
              <p style={{ fontSize: '0.85em', color: '#666', marginBottom: '0.5rem' }}>
                Per fogli completati
              </p>
              {topTechs.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #dee2e6' }}>
                      <th style={{ textAlign: 'left', padding: '0.5rem', fontSize: '0.9em' }}>Tecnico</th>
                      <th style={{ textAlign: 'center', padding: '0.5rem', fontSize: '0.9em' }}>Interventi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topTechs.map((tech, index) => (
                      <tr key={tech.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '0.5rem', fontSize: '0.9em' }}>
                          <span style={{
                            display: 'inline-block',
                            width: '24px',
                            height: '24px',
                            lineHeight: '24px',
                            textAlign: 'center',
                            backgroundColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#e9ecef',
                            borderRadius: '50%',
                            marginRight: '0.5rem',
                            fontWeight: 'bold',
                            fontSize: '0.85em'
                          }}>
                            {index + 1}
                          </span>
                          {tech.nome}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '1.1em' }}>
                          {tech.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ fontStyle: 'italic', color: '#999' }}>Nessun dato disponibile</p>
              )}
            </div>
          </div>

          {/* Note informative */}
          <div style={{
            padding: '1rem',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '6px',
            fontSize: '0.9em'
          }}>
            <strong>Note:</strong>
            <ul style={{ marginBottom: 0, paddingLeft: '20px' }}>
              <li>Le statistiche per periodo si basano sulla data di apertura del foglio</li>
              <li>I top clienti mostrano il numero totale di fogli (tutti i periodi)</li>
              <li>I top tecnici mostrano gli interventi su fogli completati (tutti i periodi)</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default StatistichePage;
