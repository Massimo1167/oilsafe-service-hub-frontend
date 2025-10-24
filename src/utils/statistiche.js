/**
 * Utility functions for calculating statistics on service sheets (fogli assistenza)
 */
import { supabase } from '../supabaseClient';
import { STATO_FOGLIO_STEPS } from './statoFoglio';

/**
 * Get date ranges for statistical queries
 */
export const getDateRanges = () => {
  const oggi = new Date();

  // Settimana corrente (lunedì-domenica)
  const giornoDellaSett = oggi.getDay() || 7; // Domenica = 7
  const inizioSettimanaCorrente = new Date(oggi);
  inizioSettimanaCorrente.setDate(oggi.getDate() - giornoDellaSett + 1);
  inizioSettimanaCorrente.setHours(0, 0, 0, 0);

  // Settimana precedente
  const inizioSettimanaPrecedente = new Date(inizioSettimanaCorrente);
  inizioSettimanaPrecedente.setDate(inizioSettimanaCorrente.getDate() - 7);
  const fineSettimanaPrecedente = new Date(inizioSettimanaCorrente);
  fineSettimanaPrecedente.setDate(inizioSettimanaCorrente.getDate() - 1);
  fineSettimanaPrecedente.setHours(23, 59, 59, 999);

  // Mese corrente
  const inizioMeseCorrente = new Date(oggi.getFullYear(), oggi.getMonth(), 1);

  // Mese precedente
  const inizioMesePrecedente = new Date(oggi.getFullYear(), oggi.getMonth() - 1, 1);
  const fineMesePrecedente = new Date(oggi.getFullYear(), oggi.getMonth(), 0);
  fineMesePrecedente.setHours(23, 59, 59, 999);

  // Anno corrente
  const inizioAnnoCorrente = new Date(oggi.getFullYear(), 0, 1);

  // Ultimi 7 giorni
  const setteGiorniFa = new Date(oggi);
  setteGiorniFa.setDate(oggi.getDate() - 7);
  setteGiorniFa.setHours(0, 0, 0, 0);

  return {
    oggi,
    setteGiorniFa,
    inizioSettimanaCorrente,
    inizioSettimanaPrecedente,
    fineSettimanaPrecedente,
    inizioMeseCorrente,
    inizioMesePrecedente,
    fineMesePrecedente,
    inizioAnnoCorrente
  };
};

/**
 * Format date for Supabase queries (YYYY-MM-DD)
 */
export const formatDateForQuery = (date) => {
  return date.toISOString().split('T')[0];
};

/**
 * Get statistics by status for all sheets (admin view)
 */
export const getStatsByStatus = async () => {
  const stats = {};

  try {
    // Conta per ogni stato
    for (const stato of STATO_FOGLIO_STEPS) {
      const { count, error } = await supabase
        .from('fogli_assistenza')
        .select('*', { count: 'exact', head: true })
        .eq('stato_foglio', stato);

      if (error) {
        console.error(`Errore conteggio stato ${stato}:`, error);
        stats[stato] = 0;
      } else {
        stats[stato] = count || 0;
      }
    }

    return stats;
  } catch (error) {
    console.error('Errore getStatsByStatus:', error);
    return {};
  }
};

/**
 * Get statistics for a specific technician (user view)
 * Returns sheets where the technician has interventions
 */
export const getStatsForTechnician = async (technicianId) => {
  const dates = getDateRanges();
  const stats = {
    aperti: 0,
    inLavorazione: 0,
    attesaFirma: 0,
    completati: 0,
    completatiMeseCorrente: 0,
    completatiMesePrecedente: 0
  };

  try {
    // Query per trovare fogli con interventi del tecnico
    // Usa una subquery per ottimizzare
    const foglioIdsQuery = supabase
      .from('interventi')
      .select('foglio_assistenza_id')
      .eq('tecnico_id', technicianId);

    const { data: interventiData, error: interventiError } = await foglioIdsQuery;

    if (interventiError) {
      console.error('Errore fetch interventi tecnico:', interventiError);
      return stats;
    }

    // Estrai gli ID unici dei fogli
    const foglioIds = [...new Set(interventiData.map(i => i.foglio_assistenza_id))];

    if (foglioIds.length === 0) {
      return stats;
    }

    // Conta fogli per stato
    const { count: aperti } = await supabase
      .from('fogli_assistenza')
      .select('*', { count: 'exact', head: true })
      .in('id', foglioIds)
      .eq('stato_foglio', 'Aperto');

    const { count: inLavorazione } = await supabase
      .from('fogli_assistenza')
      .select('*', { count: 'exact', head: true })
      .in('id', foglioIds)
      .eq('stato_foglio', 'In Lavorazione');

    const { count: attesaFirma } = await supabase
      .from('fogli_assistenza')
      .select('*', { count: 'exact', head: true })
      .in('id', foglioIds)
      .eq('stato_foglio', 'Attesa Firma');

    const { count: completati } = await supabase
      .from('fogli_assistenza')
      .select('*', { count: 'exact', head: true })
      .in('id', foglioIds)
      .eq('stato_foglio', 'Completato');

    // Completati nel mese corrente
    const { count: completatiMeseCorrente } = await supabase
      .from('fogli_assistenza')
      .select('*', { count: 'exact', head: true })
      .in('id', foglioIds)
      .eq('stato_foglio', 'Completato')
      .gte('data_apertura_foglio', formatDateForQuery(dates.inizioMeseCorrente));

    // Completati nel mese precedente
    const { count: completatiMesePrecedente } = await supabase
      .from('fogli_assistenza')
      .select('*', { count: 'exact', head: true })
      .in('id', foglioIds)
      .eq('stato_foglio', 'Completato')
      .gte('data_apertura_foglio', formatDateForQuery(dates.inizioMesePrecedente))
      .lte('data_apertura_foglio', formatDateForQuery(dates.fineMesePrecedente));

    stats.aperti = aperti || 0;
    stats.inLavorazione = inLavorazione || 0;
    stats.attesaFirma = attesaFirma || 0;
    stats.completati = completati || 0;
    stats.completatiMeseCorrente = completatiMeseCorrente || 0;
    stats.completatiMesePrecedente = completatiMesePrecedente || 0;

    return stats;
  } catch (error) {
    console.error('Errore getStatsForTechnician:', error);
    return stats;
  }
};

/**
 * Get time-based statistics (for advanced statistics page)
 */
export const getStatsByTimePeriod = async (periodo = 'mese_corrente') => {
  const dates = getDateRanges();
  let startDate, endDate;

  switch (periodo) {
    case 'settimana_corrente':
      startDate = dates.inizioSettimanaCorrente;
      endDate = dates.oggi;
      break;
    case 'settimana_precedente':
      startDate = dates.inizioSettimanaPrecedente;
      endDate = dates.fineSettimanaPrecedente;
      break;
    case 'mese_corrente':
      startDate = dates.inizioMeseCorrente;
      endDate = dates.oggi;
      break;
    case 'mese_precedente':
      startDate = dates.inizioMesePrecedente;
      endDate = dates.fineMesePrecedente;
      break;
    case 'anno_corrente':
      startDate = dates.inizioAnnoCorrente;
      endDate = dates.oggi;
      break;
    default:
      startDate = dates.inizioMeseCorrente;
      endDate = dates.oggi;
  }

  try {
    // Conta fogli per stato nel periodo
    const statsByStatus = {};

    for (const stato of STATO_FOGLIO_STEPS) {
      const { count, error } = await supabase
        .from('fogli_assistenza')
        .select('*', { count: 'exact', head: true })
        .eq('stato_foglio', stato)
        .gte('data_apertura_foglio', formatDateForQuery(startDate))
        .lte('data_apertura_foglio', formatDateForQuery(endDate));

      if (error) {
        console.error(`Errore conteggio stato ${stato} per periodo:`, error);
        statsByStatus[stato] = 0;
      } else {
        statsByStatus[stato] = count || 0;
      }
    }

    // Totale fogli nel periodo
    const { count: totale } = await supabase
      .from('fogli_assistenza')
      .select('*', { count: 'exact', head: true })
      .gte('data_apertura_foglio', formatDateForQuery(startDate))
      .lte('data_apertura_foglio', formatDateForQuery(endDate));

    return {
      periodo,
      startDate: formatDateForQuery(startDate),
      endDate: formatDateForQuery(endDate),
      totale: totale || 0,
      byStatus: statsByStatus
    };
  } catch (error) {
    console.error('Errore getStatsByTimePeriod:', error);
    return {
      periodo,
      totale: 0,
      byStatus: {}
    };
  }
};

/**
 * Get top clients by number of sheets
 */
export const getTopClients = async (limit = 5) => {
  try {
    const { data, error } = await supabase
      .from('fogli_assistenza')
      .select('cliente_id, clienti(nome_azienda)')
      .not('cliente_id', 'is', null);

    if (error) {
      console.error('Errore getTopClients:', error);
      return [];
    }

    // Conta occorrenze per cliente
    const clientCount = {};
    data.forEach(item => {
      if (item.cliente_id) {
        if (!clientCount[item.cliente_id]) {
          clientCount[item.cliente_id] = {
            id: item.cliente_id,
            nome: item.clienti?.nome_azienda || 'N/A',
            count: 0
          };
        }
        clientCount[item.cliente_id].count++;
      }
    });

    // Ordina e limita
    return Object.values(clientCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('Errore getTopClients:', error);
    return [];
  }
};

/**
 * Get top technicians by completed sheets
 */
export const getTopTechnicians = async (limit = 5) => {
  try {
    // Trova tutti i fogli completati
    const { data: fogliCompletati, error: fogliError } = await supabase
      .from('fogli_assistenza')
      .select('id')
      .eq('stato_foglio', 'Completato');

    if (fogliError || !fogliCompletati || fogliCompletati.length === 0) {
      return [];
    }

    const foglioIds = fogliCompletati.map(f => f.id);

    // Trova interventi di questi fogli
    const { data: interventi, error: interventiError } = await supabase
      .from('interventi')
      .select('tecnico_id, tecnici(nome, cognome)')
      .in('foglio_assistenza_id', foglioIds);

    if (interventiError) {
      console.error('Errore getTopTechnicians:', interventiError);
      return [];
    }

    // Conta per tecnico
    const techCount = {};
    interventi.forEach(item => {
      if (item.tecnico_id) {
        if (!techCount[item.tecnico_id]) {
          techCount[item.tecnico_id] = {
            id: item.tecnico_id,
            nome: item.tecnici ? `${item.tecnici.nome} ${item.tecnici.cognome}` : 'N/A',
            count: 0
          };
        }
        techCount[item.tecnico_id].count++;
      }
    });

    return Object.values(techCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('Errore getTopTechnicians:', error);
    return [];
  }
};

/**
 * Get temporal trend data for charts
 * Returns daily/weekly counts for the specified period
 */
export const getTrendData = async (periodo = 'mese_corrente') => {
  const dates = getDateRanges();
  let startDate, endDate, groupBy;

  switch (periodo) {
    case 'settimana_corrente':
    case 'settimana_precedente':
      startDate = periodo === 'settimana_corrente'
        ? dates.inizioSettimanaCorrente
        : dates.inizioSettimanaPrecedente;
      endDate = periodo === 'settimana_corrente'
        ? dates.oggi
        : dates.fineSettimanaPrecedente;
      groupBy = 'day';
      break;
    case 'mese_corrente':
    case 'mese_precedente':
      startDate = periodo === 'mese_corrente'
        ? dates.inizioMeseCorrente
        : dates.inizioMesePrecedente;
      endDate = periodo === 'mese_corrente'
        ? dates.oggi
        : dates.fineMesePrecedente;
      groupBy = 'week';
      break;
    case 'anno_corrente':
      startDate = dates.inizioAnnoCorrente;
      endDate = dates.oggi;
      groupBy = 'month';
      break;
    default:
      startDate = dates.inizioMeseCorrente;
      endDate = dates.oggi;
      groupBy = 'week';
  }

  try {
    // Recupera tutti i fogli nel periodo
    const { data, error } = await supabase
      .from('fogli_assistenza')
      .select('data_apertura_foglio, stato_foglio')
      .gte('data_apertura_foglio', formatDateForQuery(startDate))
      .lte('data_apertura_foglio', formatDateForQuery(endDate))
      .order('data_apertura_foglio');

    if (error) {
      console.error('Errore getTrendData:', error);
      return [];
    }

    // Raggruppa i dati per periodo
    const grouped = {};

    data.forEach(item => {
      const date = new Date(item.data_apertura_foglio);
      let key;

      if (groupBy === 'day') {
        key = formatDateForQuery(date);
      } else if (groupBy === 'week') {
        // Calcola inizio settimana
        const weekStart = new Date(date);
        const day = weekStart.getDay() || 7;
        weekStart.setDate(date.getDate() - day + 1);
        key = formatDateForQuery(weekStart);
      } else { // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = {
          periodo: key,
          totale: 0,
          aperti: 0,
          completati: 0,
          inLavorazione: 0
        };
      }

      grouped[key].totale++;

      if (item.stato_foglio === 'Aperto') grouped[key].aperti++;
      if (item.stato_foglio === 'Completato') grouped[key].completati++;
      if (item.stato_foglio === 'In Lavorazione') grouped[key].inLavorazione++;
    });

    // Converti in array e ordina
    return Object.values(grouped).sort((a, b) =>
      a.periodo.localeCompare(b.periodo)
    );
  } catch (error) {
    console.error('Errore getTrendData:', error);
    return [];
  }
};
