/**
 * Advanced statistics page for admin users.
 * Shows detailed analytics with time-period filters, charts and export capabilities.
 */
import React, { useState, useEffect } from 'react';
import { getStatsByTimePeriod, getTopClients, getTopTechnicians, getTrendData } from '../utils/statistiche';
import { STATO_FOGLIO_STEPS } from '../utils/statoFoglio';
import FogliPerStatoChart from '../components/charts/FogliPerStatoChart';
import TrendTemporaleChart from '../components/charts/TrendTemporaleChart';
import {
  exportStatsByPeriodToExcel,
  exportTopClientsToExcel,
  exportTopTechniciansToExcel,
  exportTrendDataToExcel,
  exportFullReportToExcel
} from '../utils/exportStatistiche';

function StatistichePage({ session }) {
  const [selectedPeriod, setSelectedPeriod] = useState('mese_corrente');
  const [statsPeriod, setStatsPeriod] = useState(null);
  const [topClients, setTopClients] = useState([]);
  const [topTechs, setTopTechs] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCharts, setShowCharts] = useState(true); // Toggle view charts/tables

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      try {
        // Carica statistiche per periodo selezionato
        const periodData = await getStatsByTimePeriod(selectedPeriod);
        setStatsPeriod(periodData);

        // Carica trend temporale
        const trend = await getTrendData(selectedPeriod);
        setTrendData(trend);

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

      {/* Barra controlli: Selettore periodo + pulsanti export + toggle view */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        border: '1px solid #dee2e6',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <label htmlFor="period-select" style={{ fontWeight: 'bold' }}>
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

          {/* Toggle Grafici/Tabelle */}
          <button
            onClick={() => setShowCharts(!showCharts)}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              borderRadius: '4px',
              border: '1px solid #007bff',
              backgroundColor: showCharts ? '#007bff' : '#fff',
              color: showCharts ? '#fff' : '#007bff',
              cursor: 'pointer'
            }}
          >
            {showCharts ? '📊 Grafici' : '📋 Tabelle'}
          </button>
        </div>

        {/* Pulsanti Export */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => exportFullReportToExcel(statsPeriod, topClients, topTechs, trendData, selectedPeriod)}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              borderRadius: '4px',
              border: '1px solid #28a745',
              backgroundColor: '#28a745',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            📊 Report Completo
          </button>
          <button
            onClick={() => exportStatsByPeriodToExcel(statsPeriod, selectedPeriod)}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.9rem',
              borderRadius: '4px',
              border: '1px solid #17a2b8',
              backgroundColor: '#17a2b8',
              color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            📄 Riepilogo
          </button>
        </div>
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

              {/* Breakdown per stato - Grafici o Tabelle */}
              <h4 style={{ marginBottom: '1rem' }}>Distribuzione per Stato</h4>

              {showCharts ? (
                <FogliPerStatoChart statsByStatus={statsPeriod.byStatus} />
              ) : (
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
              )}
            </div>
          )}

          {/* Sezione Trend Temporale - Solo in modalità grafici */}
          {showCharts && trendData && trendData.length > 0 && (
            <div style={{
              marginBottom: '2rem',
              padding: '1rem',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#ffffff'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h3 style={{ margin: 0 }}>Trend Temporale</h3>
                <button
                  onClick={() => exportTrendDataToExcel(trendData, selectedPeriod)}
                  style={{
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.85rem',
                    borderRadius: '4px',
                    border: '1px solid #6c757d',
                    backgroundColor: '#6c757d',
                    color: '#fff',
                    cursor: 'pointer'
                  }}
                >
                  📄 Esporta Trend
                </button>
              </div>
              <TrendTemporaleChart trendData={trendData} periodo={selectedPeriod} />
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
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <h3 style={{ margin: 0 }}>Top 5 Clienti</h3>
                {topClients.length > 0 && (
                  <button
                    onClick={() => exportTopClientsToExcel(topClients)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: '1px solid #6c757d',
                      backgroundColor: '#6c757d',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    📄 Esporta
                  </button>
                )}
              </div>
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
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '0.5rem'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>Top 5 Tecnici</h3>
                  <p style={{ fontSize: '0.85em', color: '#666', margin: 0 }}>
                    Per fogli completati
                  </p>
                </div>
                {topTechs.length > 0 && (
                  <button
                    onClick={() => exportTopTechniciansToExcel(topTechs)}
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: '1px solid #6c757d',
                      backgroundColor: '#6c757d',
                      color: '#fff',
                      cursor: 'pointer'
                    }}
                  >
                    📄 Esporta
                  </button>
                )}
              </div>
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
