/**
 * Admin Monitoring Dashboard
 *
 * Dashboard protetta da PIN per visualizzare metriche di performance.
 * Accessibile solo tramite route nascosta /admin-monitoring.
 *
 * Features:
 * - Autenticazione PIN
 * - Filtri per periodo e tipo metrica
 * - Summary cards con metriche chiave
 * - Alert automatici per problemi
 * - Tabella log dettagliati con paginazione
 * - Auto-refresh ogni 30s
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { flushPerformanceLogs } from '../utils/performanceTracker';
import './AdminMonitoringPage.css';

const ADMIN_PIN = import.meta.env.VITE_ADMIN_MONITORING_PIN || '1234';
const LOGS_PER_PAGE = 50;

function AdminMonitoringPage({ session }) {
  // Stati autenticazione
  const [authenticated, setAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');

  // Stati dati
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Stati filtri
  const [timeRange, setTimeRange] = useState('24h');
  const [metricFilter, setMetricFilter] = useState('all');

  // Stati paginazione
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  // Handler PIN
  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setAuthenticated(true);
      setPinError('');
      loadMonitoringData();
    } else {
      setPinError('PIN errato. Riprova.');
      setPinInput('');
    }
  };

  // Carica dati monitoring
  const loadMonitoringData = async () => {
    setLoading(true);

    try {
      // Calcola timestamp per time range
      const now = new Date();
      let startTime = new Date();

      switch (timeRange) {
        case '1h':
          startTime.setHours(now.getHours() - 1);
          break;
        case '24h':
          startTime.setDate(now.getDate() - 1);
          break;
        case '7d':
          startTime.setDate(now.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(now.getDate() - 30);
          break;
      }

      // Fetch logs con paginazione
      const from = (currentPage - 1) * LOGS_PER_PAGE;
      const to = currentPage * LOGS_PER_PAGE - 1;

      let logsQuery = supabase
        .from('performance_logs')
        .select('*', { count: 'exact' })
        .gte('created_at', startTime.toISOString())
        .order('created_at', { ascending: false })
        .range(from, to);

      if (metricFilter !== 'all') {
        logsQuery = logsQuery.eq('metric_type', metricFilter);
      }

      const { data: logsData, error: logsError, count } = await logsQuery;

      if (logsError) throw logsError;

      setLogs(logsData || []);
      setTotalLogs(count || 0);

      // Fetch summary
      const { data: summaryData, error: summaryError } = await supabase
        .from('performance_summary')
        .select('*')
        .gte('hour', startTime.toISOString())
        .order('hour', { ascending: false })
        .limit(24);

      if (summaryError) throw summaryError;

      setSummary(summaryData || []);

      // Genera alerts
      generateAlerts(logsData);

    } catch (error) {
      console.error('Errore caricamento monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Genera alerts basati su threshold
  const generateAlerts = (logsData) => {
    const newAlerts = [];

    // Alert 1: Slow queries (> 1000ms)
    const slowQueries = logsData.filter(
      l => l.metric_type === 'query' && l.duration_ms > 1000
    );
    if (slowQueries.length > 0) {
      newAlerts.push({
        type: 'warning',
        message: `${slowQueries.length} query lente rilevate (> 1s)`,
        details: slowQueries.slice(0, 5).map(q =>
          `${q.table_name} - ${q.query_type} - ${q.duration_ms.toFixed(0)}ms`
        )
      });
    }

    // Alert 2: Poor Web Vitals
    const poorVitals = logsData.filter(
      l => l.metric_type === 'vitals' && l.vital_rating === 'poor'
    );
    if (poorVitals.length > 5) {
      newAlerts.push({
        type: 'error',
        message: `${poorVitals.length} metriche Web Vitals scarse`,
        details: poorVitals.slice(0, 5).map(v =>
          `${v.vital_name}: ${v.vital_value.toFixed(0)} (${v.page_path})`
        )
      });
    }

    // Alert 3: JavaScript errors
    const jsErrors = logsData.filter(l => l.metric_type === 'error');
    if (jsErrors.length > 0) {
      newAlerts.push({
        type: 'error',
        message: `${jsErrors.length} errori JavaScript rilevati`,
        details: jsErrors.slice(0, 5).map(e =>
          `${e.error_message?.substring(0, 60) || 'Unknown error'} (${e.page_path})`
        )
      });
    }

    // Alert 4: High memory usage
    const highMemory = logsData.filter(
      l => l.metric_type === 'memory' && l.memory_used_mb > 200
    );
    if (highMemory.length > 0) {
      newAlerts.push({
        type: 'warning',
        message: `Utilizzo memoria elevato (> 200MB)`,
        details: highMemory.slice(0, 3).map(m =>
          `${m.memory_used_mb.toFixed(0)}MB (${m.page_path})`
        )
      });
    }

    setAlerts(newAlerts);
  };

  // Auto-refresh ogni 30 secondi
  useEffect(() => {
    if (authenticated) {
      loadMonitoringData();
      const interval = setInterval(loadMonitoringData, 30000);
      return () => clearInterval(interval);
    }
  }, [authenticated, timeRange, metricFilter, currentPage]);

  // Badge alert indicator
  const hasAlerts = alerts.length > 0;

  // PIN authentication form
  if (!authenticated) {
    return (
      <div className="pin-auth-container">
        <div className="pin-auth-card">
          <h2>Accesso Monitoring</h2>
          <p className="pin-auth-description">
            Inserisci il PIN di amministrazione per accedere alla dashboard di monitoraggio performance.
          </p>
          <form onSubmit={handlePinSubmit}>
            <div className="form-group">
              <label htmlFor="pin">PIN:</label>
              <input
                type="password"
                id="pin"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="pin-input"
                autoFocus
                placeholder="Inserisci PIN"
              />
            </div>
            {pinError && (
              <p className="pin-error">{pinError}</p>
            )}
            <button type="submit" className="btn-primary">
              Accedi
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="admin-monitoring-page">
      {/* Header */}
      <div className="dashboard-header">
        <h2>Dashboard Monitoraggio Performance</h2>
        {hasAlerts && (
          <div className="alert-badge">
            ⚠️ {alerts.length} Problema{alerts.length > 1 ? 'i' : ''} rilevat{alerts.length > 1 ? 'i' : 'o'}
          </div>
        )}
      </div>

      {/* Filtri */}
      <div className="filters-panel">
        <div className="filter-group">
          <label>Periodo:</label>
          <select
            value={timeRange}
            onChange={(e) => {
              setTimeRange(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="1h">Ultima ora</option>
            <option value="24h">Ultime 24 ore</option>
            <option value="7d">Ultimi 7 giorni</option>
            <option value="30d">Ultimi 30 giorni</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Metrica:</label>
          <select
            value={metricFilter}
            onChange={(e) => {
              setMetricFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Tutte</option>
            <option value="page_load">Caricamento pagina</option>
            <option value="query">Query DB</option>
            <option value="vitals">Web Vitals</option>
            <option value="error">Errori</option>
            <option value="render">Rendering</option>
            <option value="memory">Memoria</option>
          </select>
        </div>

        <button onClick={loadMonitoringData} className="btn-refresh">
          🔄 Aggiorna
        </button>

        <button onClick={flushPerformanceLogs} className="btn-secondary">
          💾 Flush Logs
        </button>
      </div>

      {/* Alerts section */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          <h3>⚠️ Alert</h3>
          {alerts.map((alert, idx) => (
            <div key={idx} className={`alert alert-${alert.type}`}>
              <strong>{alert.message}</strong>
              {alert.details && alert.details.length > 0 && (
                <ul>
                  {alert.details.map((detail, i) => (
                    <li key={i}>{detail}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      {summary && summary.length > 0 && (
        <div className="summary-section">
          <h3>Riepilogo Performance</h3>
          <div className="metrics-grid">
            {/* Page Load Card */}
            <div className="metric-card">
              <h4>Caricamento Pagine</h4>
              <div className="metric-value">
                {summary.filter(s => s.metric_type === 'page_load')[0]?.avg_duration_ms?.toFixed(0) || 'N/A'} ms
              </div>
              <div className="metric-label">Media</div>
            </div>

            {/* Queries Card */}
            <div className="metric-card">
              <h4>Query Database</h4>
              <div className="metric-value">
                {summary.filter(s => s.metric_type === 'query')[0]?.avg_duration_ms?.toFixed(0) || 'N/A'} ms
              </div>
              <div className="metric-label">Media</div>
            </div>

            {/* Web Vitals Card */}
            <div className="metric-card">
              <h4>Web Vitals Scarse</h4>
              <div className="metric-value">
                {summary.reduce((sum, s) => sum + (s.poor_vitals_count || 0), 0)}
              </div>
              <div className="metric-label">Totale</div>
            </div>

            {/* Errors Card */}
            <div className="metric-card">
              <h4>Errori</h4>
              <div className="metric-value">
                {logs.filter(l => l.metric_type === 'error').length}
              </div>
              <div className="metric-label">Rilevati</div>
            </div>
          </div>
        </div>
      )}

      {/* Logs table */}
      <div className="logs-section">
        <h3>Log Dettagliati ({totalLogs} totali)</h3>
        {loading ? (
          <p className="loading-message">Caricamento...</p>
        ) : (
          <>
            <div className="table-container">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Tipo</th>
                    <th>Pagina/Componente</th>
                    <th>Operazione</th>
                    <th>Durata (ms)</th>
                    <th>Dettagli</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="no-data">
                        Nessun log disponibile per i filtri selezionati
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td className="timestamp-cell">
                          {new Date(log.created_at).toLocaleString('it-IT')}
                        </td>
                        <td>
                          <span className={`badge badge-${log.metric_type}`}>
                            {log.metric_type}
                          </span>
                        </td>
                        <td className="path-cell">
                          {log.page_path || log.component_name || '-'}
                        </td>
                        <td>
                          {log.metric_type === 'query' && `${log.query_type} ${log.table_name}`}
                          {log.metric_type === 'vitals' && log.vital_name}
                          {log.metric_type === 'error' && log.error_type}
                          {log.metric_type === 'render' && log.render_phase}
                          {!['query', 'vitals', 'error', 'render'].includes(log.metric_type) && '-'}
                        </td>
                        <td className="duration-cell">
                          <span className={
                            log.duration_ms > 1000 ? 'duration-slow' :
                            log.duration_ms > 500 ? 'duration-medium' : ''
                          }>
                            {log.duration_ms?.toFixed(0) || '-'}
                          </span>
                        </td>
                        <td className="details-cell">
                          {log.metric_type === 'query' && `${log.row_count || 0} righe`}
                          {log.metric_type === 'vitals' && `${log.vital_value?.toFixed(0)} (${log.vital_rating})`}
                          {log.metric_type === 'error' && (log.error_message?.substring(0, 50) || '')}
                          {log.metric_type === 'memory' && `${log.memory_used_mb?.toFixed(0)}MB / ${log.memory_total_mb?.toFixed(0)}MB`}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginazione */}
            {totalLogs > LOGS_PER_PAGE && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn-pagination"
                >
                  « Precedente
                </button>
                <span className="pagination-info">
                  Pagina {currentPage} di {Math.ceil(totalLogs / LOGS_PER_PAGE)}
                </span>
                <button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage >= Math.ceil(totalLogs / LOGS_PER_PAGE)}
                  className="btn-pagination"
                >
                  Successiva »
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdminMonitoringPage;
