/**
 * Performance Analyzer Utilities
 *
 * Funzioni per analisi e correlazione tra metriche client-side e server-side.
 * Utile per identificare se rallentamenti sono dovuti a rete, client o database.
 */

import { supabase } from '../supabaseClient';

/**
 * Calcola percentile da array di valori
 */
const percentile = (arr, p) => {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
};

/**
 * Confronta metriche client-side con server-side per una tabella specifica
 *
 * @param {string} tableName - Nome tabella da analizzare
 * @param {Date} startDate - Data inizio periodo
 * @param {Date} endDate - Data fine periodo
 * @returns {Object} Statistiche correlate client/server
 */
export const correlateQueryMetrics = async (tableName, startDate, endDate) => {
  try {
    // Fetch client-side metrics
    const { data: clientMetrics, error } = await supabase
      .from('performance_logs')
      .select('duration_ms, row_count, created_at')
      .eq('metric_type', 'query')
      .eq('table_name', tableName)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    if (!clientMetrics || clientMetrics.length === 0) {
      return {
        tableName,
        period: { start: startDate, end: endDate },
        clientMetrics: null,
        serverMetrics: null,
        message: 'Nessun dato disponibile per il periodo selezionato'
      };
    }

    // Calcola statistiche client
    const durations = clientMetrics.map(m => m.duration_ms);
    const avgClientDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const p50ClientDuration = percentile(durations, 0.50);
    const p95ClientDuration = percentile(durations, 0.95);
    const p99ClientDuration = percentile(durations, 0.99);
    const totalRows = clientMetrics.reduce((sum, m) => sum + (m.row_count || 0), 0);

    return {
      tableName,
      period: {
        start: startDate,
        end: endDate
      },
      clientMetrics: {
        queryCount: clientMetrics.length,
        avgDuration: avgClientDuration.toFixed(2),
        p50Duration: p50ClientDuration.toFixed(2),
        p95Duration: p95ClientDuration.toFixed(2),
        p99Duration: p99ClientDuration.toFixed(2),
        maxDuration: Math.max(...durations).toFixed(2),
        minDuration: Math.min(...durations).toFixed(2),
        totalRowsFetched: totalRows
      },
      serverMetrics: {
        message: 'Dati server-side disponibili solo su Supabase Pro Dashboard',
        instruction: 'Vai su Supabase > Database > Performance > Query Performance per confrontare'
      },
      analysis: {
        slowQueries: clientMetrics.filter(m => m.duration_ms > 1000).length,
        averageRowsPerQuery: (totalRows / clientMetrics.length).toFixed(0)
      }
    };
  } catch (error) {
    console.error('Errore correlazione metriche:', error);
    return {
      tableName,
      error: error.message
    };
  }
};

/**
 * Analizza Web Vitals per periodo specificato
 *
 * @param {Date} startDate - Data inizio
 * @param {Date} endDate - Data fine
 * @returns {Object} Statistiche Web Vitals aggregate
 */
export const analyzeWebVitals = async (startDate, endDate) => {
  try {
    const { data: vitals, error } = await supabase
      .from('performance_logs')
      .select('vital_name, vital_value, vital_rating, page_path, created_at')
      .eq('metric_type', 'vitals')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    if (!vitals || vitals.length === 0) {
      return { message: 'Nessun dato Web Vitals disponibile' };
    }

    // Raggruppa per vital_name
    const vitalsByName = vitals.reduce((acc, v) => {
      if (!acc[v.vital_name]) {
        acc[v.vital_name] = [];
      }
      acc[v.vital_name].push(v);
      return acc;
    }, {});

    const summary = {};

    for (const [vitalName, vitalData] of Object.entries(vitalsByName)) {
      const values = vitalData.map(v => v.vital_value);
      const ratings = vitalData.reduce((acc, v) => {
        acc[v.vital_rating] = (acc[v.vital_rating] || 0) + 1;
        return acc;
      }, {});

      summary[vitalName] = {
        count: vitalData.length,
        avg: (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2),
        p50: percentile(values, 0.50).toFixed(2),
        p95: percentile(values, 0.95).toFixed(2),
        max: Math.max(...values).toFixed(2),
        ratings: {
          good: ratings.good || 0,
          needsImprovement: ratings['needs-improvement'] || 0,
          poor: ratings.poor || 0
        },
        poorPercentage: ((ratings.poor || 0) / vitalData.length * 100).toFixed(1)
      };
    }

    return {
      period: { start: startDate, end: endDate },
      totalMeasurements: vitals.length,
      vitals: summary
    };
  } catch (error) {
    console.error('Errore analisi Web Vitals:', error);
    return { error: error.message };
  }
};

/**
 * Identifica pagine con performance scarse
 *
 * @param {number} thresholdMs - Soglia durata considerata lenta (default 2000ms)
 * @param {Date} startDate - Data inizio
 * @param {Date} endDate - Data fine
 * @returns {Array} Pagine ordinate per problemi di performance
 */
export const identifySlowPages = async (thresholdMs = 2000, startDate, endDate) => {
  try {
    const { data: pageLoads, error } = await supabase
      .from('performance_logs')
      .select('page_path, duration_ms, created_at')
      .eq('metric_type', 'page_load')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    if (!pageLoads || pageLoads.length === 0) {
      return [];
    }

    // Raggruppa per page_path
    const pageStats = pageLoads.reduce((acc, p) => {
      if (!acc[p.page_path]) {
        acc[p.page_path] = [];
      }
      acc[p.page_path].push(p.duration_ms);
      return acc;
    }, {});

    const results = Object.entries(pageStats).map(([path, durations]) => {
      const slowLoads = durations.filter(d => d > thresholdMs).length;
      const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;

      return {
        page: path,
        totalLoads: durations.length,
        slowLoads,
        slowPercentage: (slowLoads / durations.length * 100).toFixed(1),
        avgDuration: avg.toFixed(2),
        p95Duration: percentile(durations, 0.95).toFixed(2),
        maxDuration: Math.max(...durations).toFixed(2)
      };
    });

    // Ordina per percentuale caricamenti lenti
    return results.sort((a, b) => parseFloat(b.slowPercentage) - parseFloat(a.slowPercentage));
  } catch (error) {
    console.error('Errore identificazione pagine lente:', error);
    return [];
  }
};

/**
 * Analizza errori per tipo e frequenza
 *
 * @param {Date} startDate - Data inizio
 * @param {Date} endDate - Data fine
 * @returns {Object} Statistiche errori
 */
export const analyzeErrors = async (startDate, endDate) => {
  try {
    const { data: errors, error } = await supabase
      .from('performance_logs')
      .select('error_type, error_message, page_path, created_at')
      .eq('metric_type', 'error')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    if (!errors || errors.length === 0) {
      return { message: 'Nessun errore rilevato (ottimo!)' };
    }

    // Raggruppa per tipo
    const byType = errors.reduce((acc, e) => {
      const type = e.error_type || 'unknown';
      if (!acc[type]) acc[type] = [];
      acc[type].push(e);
      return acc;
    }, {});

    // Raggruppa per messaggio (top 10)
    const messageCounts = errors.reduce((acc, e) => {
      const msg = e.error_message || 'Unknown error';
      acc[msg] = (acc[msg] || 0) + 1;
      return acc;
    }, {});

    const topErrors = Object.entries(messageCounts)
      .map(([msg, count]) => ({ message: msg, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      period: { start: startDate, end: endDate },
      totalErrors: errors.length,
      byType: Object.entries(byType).map(([type, errs]) => ({
        type,
        count: errs.length,
        percentage: (errs.length / errors.length * 100).toFixed(1)
      })),
      topErrors
    };
  } catch (error) {
    console.error('Errore analisi errori:', error);
    return { error: error.message };
  }
};
