/**
 * Performance tracking utility per monitoraggio client-side
 *
 * Traccia:
 * - Page loads (Navigation Timing API)
 * - Query Supabase (via interceptor)
 * - Web Vitals (LCP, FID, CLS, FCP, TTFB, INP)
 * - Errori JavaScript
 * - Component render times (React Profiler)
 * - Memoria/CPU usage
 *
 * Utilizza sampling configurabile e invio batch asincrono per non appesantire il client.
 */

import { supabase } from '../supabaseClient';
import { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } from 'web-vitals';

// Configurazione
const ENABLE_MONITORING = import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true';
const BATCH_SIZE = 10; // Numero log prima del flush automatico
const BATCH_INTERVAL_MS = 5000; // Flush ogni 5 secondi se buffer non pieno
const MAX_ERROR_STACK_LENGTH = 500;
const MAX_QUERY_DESCRIPTION_LENGTH = 200;

// Sampling dinamico basato su ambiente
const getAdaptiveSampleRate = () => {
  if (import.meta.env.MODE === 'development') {
    return 1.0; // 100% in dev
  }

  // In produzione: sampling adattivo basato su ora del giorno
  const hour = new Date().getHours();
  // Peak hours (9-18): 5%, off-peak: 20%
  return (hour >= 9 && hour <= 18) ? 0.05 : 0.20;
};

let SAMPLE_RATE = getAdaptiveSampleRate();

// Session ID univoco per correlazione eventi
let sessionId = null;
let currentUserId = null;
let currentUserRole = null;

// Buffer per invio batch
let logBuffer = [];
let flushTimer = null;

/**
 * Inizializza performance tracking
 */
export const initPerformanceTracking = (userId, userRole) => {
  if (!ENABLE_MONITORING) {
    console.log('[Performance Tracker] Monitoring disabilitato');
    return;
  }

  sessionId = `${userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  currentUserId = userId;
  currentUserRole = userRole;

  // Override sampling per admin (sempre 100%)
  if (userRole === 'admin') {
    SAMPLE_RATE = 1.0;
  }

  // Setup Web Vitals
  trackWebVitals();

  // Setup error tracking globale
  trackGlobalErrors();

  // Setup memory tracking (ogni minuto, se disponibile)
  if (performance.memory) {
    setInterval(trackMemoryUsage, 60000);
  }

  console.log(`[Performance Tracker] Inizializzato - Session: ${sessionId}, Sample rate: ${(SAMPLE_RATE * 100).toFixed(0)}%`);
};

/**
 * Determina se campionare questo evento
 */
const shouldSample = () => {
  return Math.random() < SAMPLE_RATE;
};

/**
 * Ottiene metadata browser/device
 */
const getBrowserMetadata = () => {
  const ua = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = '';

  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browserName = 'Chrome';
    browserVersion = ua.match(/Chrome\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('Edg')) {
    browserName = 'Edge';
    browserVersion = ua.match(/Edg\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('Firefox')) {
    browserName = 'Firefox';
    browserVersion = ua.match(/Firefox\/([\d.]+)/)?.[1] || '';
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browserName = 'Safari';
    browserVersion = ua.match(/Version\/([\d.]+)/)?.[1] || '';
  }

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

  return {
    browser_name: browserName,
    browser_version: browserVersion,
    device_type: /Mobile|Android|iPhone/i.test(ua) ? 'mobile' :
                 /Tablet|iPad/i.test(ua) ? 'tablet' : 'desktop',
    connection_type: connection?.effectiveType || 'unknown',
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight
  };
};

/**
 * Sanitizza log entry prima dell'invio
 */
const sanitizeLogEntry = (entry) => {
  return {
    ...entry,
    error_stack: entry.error_stack?.substring(0, MAX_ERROR_STACK_LENGTH),
    query_description: entry.query_description?.substring(0, MAX_QUERY_DESCRIPTION_LENGTH)
  };
};

/**
 * Aggiunge log al buffer
 */
const addToBuffer = (logEntry) => {
  if (!ENABLE_MONITORING || !shouldSample()) return;

  // NON tracciare se utente non autenticato (evita errori RLS)
  if (!currentUserId) {
    return;
  }

  const sanitized = sanitizeLogEntry({
    ...logEntry,
    user_id: currentUserId,
    user_role: currentUserRole,
    session_id: sessionId,
    timestamp_client: new Date().toISOString(),
    is_sampled: true,
    sample_rate: SAMPLE_RATE,
    ...getBrowserMetadata()
  });

  logBuffer.push(sanitized);

  // Auto-flush se buffer pieno
  if (logBuffer.length >= BATCH_SIZE) {
    flushLogs();
  } else {
    // Schedula flush se non già schedulato
    if (!flushTimer) {
      flushTimer = setTimeout(flushLogs, BATCH_INTERVAL_MS);
    }
  }
};

/**
 * Invia logs al server in batch
 */
const flushLogs = async () => {
  if (logBuffer.length === 0) return;

  // NON inviare logs se utente non autenticato (viola RLS)
  if (!currentUserId) {
    console.debug('[Performance Tracker] Skip invio logs - utente non autenticato');
    logBuffer = []; // Svuota buffer
    clearTimeout(flushTimer);
    flushTimer = null;
    return;
  }

  clearTimeout(flushTimer);
  flushTimer = null;

  const logsToSend = [...logBuffer];
  logBuffer = [];

  try {
    const { error } = await supabase
      .from('performance_logs')
      .insert(logsToSend);

    if (error) {
      console.error('[Performance Tracker] Errore invio logs:', error);
      // Re-aggiungi al buffer se fallisce (max 1 retry)
      if (logBuffer.length < BATCH_SIZE * 2) {
        logBuffer.push(...logsToSend);
      }
    } else {
      console.log(`[Performance Tracker] Inviati ${logsToSend.length} log`);
    }
  } catch (err) {
    console.error('[Performance Tracker] Eccezione invio logs:', err);
  }
};

/**
 * Track page load performance (Navigation Timing API)
 */
export const trackPageLoad = (pagePath) => {
  if (!ENABLE_MONITORING) return;

  // Attendi che la navigazione sia completa
  if (document.readyState === 'complete') {
    capturePageLoadMetrics(pagePath);
  } else {
    window.addEventListener('load', () => capturePageLoadMetrics(pagePath));
  }
};

const capturePageLoadMetrics = (pagePath) => {
  if (performance.getEntriesByType) {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0];

      addToBuffer({
        metric_type: 'page_load',
        page_path: pagePath,
        duration_ms: nav.loadEventEnd - nav.fetchStart,
        network_duration_ms: nav.responseEnd - nav.fetchStart,
        dom_content_loaded_ms: nav.domContentLoadedEventEnd - nav.fetchStart,
        load_complete_ms: nav.loadEventEnd - nav.fetchStart
      });
    }
  }
};

/**
 * Track Supabase query performance
 * (chiamato dal query interceptor)
 */
export const trackQuery = (tableName, queryType, description, startTime, rowCount) => {
  if (!ENABLE_MONITORING) return;

  const duration = performance.now() - startTime;

  addToBuffer({
    metric_type: 'query',
    table_name: tableName,
    query_type: queryType,
    query_description: description,
    duration_ms: duration,
    row_count: rowCount || 0,
    operation_name: `${queryType}_${tableName}`
  });
};

/**
 * Track Web Vitals (usando library web-vitals)
 */
const trackWebVitals = () => {
  if (!ENABLE_MONITORING) return;

  // Cumulative Layout Shift
  onCLS((metric) => {
    const rating = metric.value < 0.1 ? 'good' :
                   metric.value < 0.25 ? 'needs-improvement' : 'poor';
    addToBuffer({
      metric_type: 'vitals',
      vital_name: 'CLS',
      vital_value: metric.value,
      vital_rating: rating,
      page_path: window.location.pathname
    });
  });

  // First Input Delay
  onFID((metric) => {
    const rating = metric.value < 100 ? 'good' :
                   metric.value < 300 ? 'needs-improvement' : 'poor';
    addToBuffer({
      metric_type: 'vitals',
      vital_name: 'FID',
      vital_value: metric.value,
      vital_rating: rating,
      page_path: window.location.pathname
    });
  });

  // Largest Contentful Paint
  onLCP((metric) => {
    const rating = metric.value < 2500 ? 'good' :
                   metric.value < 4000 ? 'needs-improvement' : 'poor';
    addToBuffer({
      metric_type: 'vitals',
      vital_name: 'LCP',
      vital_value: metric.value,
      vital_rating: rating,
      page_path: window.location.pathname
    });
  });

  // First Contentful Paint
  onFCP((metric) => {
    const rating = metric.value < 1800 ? 'good' :
                   metric.value < 3000 ? 'needs-improvement' : 'poor';
    addToBuffer({
      metric_type: 'vitals',
      vital_name: 'FCP',
      vital_value: metric.value,
      vital_rating: rating,
      page_path: window.location.pathname
    });
  });

  // Time to First Byte
  onTTFB((metric) => {
    const rating = metric.value < 800 ? 'good' :
                   metric.value < 1800 ? 'needs-improvement' : 'poor';
    addToBuffer({
      metric_type: 'vitals',
      vital_name: 'TTFB',
      vital_value: metric.value,
      vital_rating: rating,
      page_path: window.location.pathname
    });
  });

  // Interaction to Next Paint
  onINP((metric) => {
    const rating = metric.value < 200 ? 'good' :
                   metric.value < 500 ? 'needs-improvement' : 'poor';
    addToBuffer({
      metric_type: 'vitals',
      vital_name: 'INP',
      vital_value: metric.value,
      vital_rating: rating,
      page_path: window.location.pathname
    });
  });
};

/**
 * Track global JavaScript errors
 */
const trackGlobalErrors = () => {
  if (!ENABLE_MONITORING) return;

  // Errori JavaScript normali
  window.addEventListener('error', (event) => {
    addToBuffer({
      metric_type: 'error',
      error_type: 'javascript',
      error_message: event.message,
      error_stack: event.error?.stack || '',
      page_path: window.location.pathname,
      component_name: event.filename
    });
  });

  // Promise rejections non gestite
  window.addEventListener('unhandledrejection', (event) => {
    addToBuffer({
      metric_type: 'error',
      error_type: 'promise',
      error_message: event.reason?.message || String(event.reason),
      error_stack: event.reason?.stack || '',
      page_path: window.location.pathname
    });
  });
};

/**
 * Track memory usage
 */
const trackMemoryUsage = () => {
  if (!ENABLE_MONITORING || !performance.memory) return;

  const memUsed = performance.memory.usedJSHeapSize / (1024 * 1024);
  const memTotal = performance.memory.totalJSHeapSize / (1024 * 1024);

  addToBuffer({
    metric_type: 'memory',
    memory_used_mb: memUsed,
    memory_total_mb: memTotal,
    page_path: window.location.pathname
  });
};

/**
 * Track React component render time
 * (chiamato da PerformanceProfiler)
 */
export const trackComponentRender = (componentName, phase, actualDuration) => {
  if (!ENABLE_MONITORING) return;

  // Track solo render lenti (> 16ms = 1 frame a 60fps)
  if (actualDuration > 16) {
    addToBuffer({
      metric_type: 'render',
      component_name: componentName,
      render_phase: phase,
      duration_ms: actualDuration,
      page_path: window.location.pathname
    });
  }
};

/**
 * Force flush logs (chiamata esplicita, es. prima di unload)
 */
export const flushPerformanceLogs = () => {
  if (logBuffer.length > 0) {
    flushLogs();
  }
};
