/**
 * Utility functions for exporting statistics to Excel format
 * Uses the xlsx library already present in the project
 */
import * as XLSX from 'xlsx';

/**
 * Format date for Excel display
 */
const formatDateForExcel = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT');
};

/**
 * Export statistics by time period to Excel
 */
export const exportStatsByPeriodToExcel = (statsPeriod, periodo) => {
  if (!statsPeriod || !statsPeriod.byStatus) {
    alert('Nessun dato da esportare');
    return;
  }

  // Crea workbook
  const wb = XLSX.utils.book_new();

  // Sheet 1: Riepilogo generale
  const riepilogoData = [
    ['Statistiche Fogli di Assistenza'],
    ['Periodo:', getPeriodoLabel(periodo)],
    ['Data Inizio:', formatDateForExcel(statsPeriod.startDate)],
    ['Data Fine:', formatDateForExcel(statsPeriod.endDate)],
    ['Totale Fogli:', statsPeriod.totale],
    [],
    ['Distribuzione per Stato'],
    ['Stato', 'Numero Fogli', 'Percentuale']
  ];

  // Aggiungi righe per ogni stato
  Object.entries(statsPeriod.byStatus).forEach(([stato, count]) => {
    const percentuale = statsPeriod.totale > 0
      ? ((count / statsPeriod.totale) * 100).toFixed(1)
      : '0';
    riepilogoData.push([stato, count, `${percentuale}%`]);
  });

  const wsRiepilogo = XLSX.utils.aoa_to_sheet(riepilogoData);

  // Imposta larghezze colonne
  wsRiepilogo['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 15 }
  ];

  XLSX.utils.book_append_sheet(wb, wsRiepilogo, 'Riepilogo');

  // Genera e scarica file
  const fileName = `statistiche_${periodo}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Export top clients to Excel
 */
export const exportTopClientsToExcel = (topClients) => {
  if (!topClients || topClients.length === 0) {
    alert('Nessun dato da esportare');
    return;
  }

  const wb = XLSX.utils.book_new();

  const data = [
    ['Top Clienti per Numero di Fogli'],
    ['Data Esportazione:', new Date().toLocaleDateString('it-IT')],
    [],
    ['Posizione', 'Cliente', 'Numero Fogli']
  ];

  topClients.forEach((client, index) => {
    data.push([index + 1, client.nome, client.count]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 15 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Top Clienti');

  const fileName = `top_clienti_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Export top technicians to Excel
 */
export const exportTopTechniciansToExcel = (topTechs) => {
  if (!topTechs || topTechs.length === 0) {
    alert('Nessun dato da esportare');
    return;
  }

  const wb = XLSX.utils.book_new();

  const data = [
    ['Top Tecnici per Fogli Completati'],
    ['Data Esportazione:', new Date().toLocaleDateString('it-IT')],
    [],
    ['Posizione', 'Tecnico', 'Numero Interventi']
  ];

  topTechs.forEach((tech, index) => {
    data.push([index + 1, tech.nome, tech.count]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Top Tecnici');

  const fileName = `top_tecnici_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Export trend data to Excel
 */
export const exportTrendDataToExcel = (trendData, periodo) => {
  if (!trendData || trendData.length === 0) {
    alert('Nessun dato da esportare');
    return;
  }

  const wb = XLSX.utils.book_new();

  const data = [
    ['Trend Temporale Fogli di Assistenza'],
    ['Periodo:', getPeriodoLabel(periodo)],
    ['Data Esportazione:', new Date().toLocaleDateString('it-IT')],
    [],
    ['Periodo', 'Totale', 'Aperti', 'In Lavorazione', 'Completati']
  ];

  trendData.forEach(item => {
    data.push([
      item.periodo,
      item.totale,
      item.aperti,
      item.inLavorazione,
      item.completati
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 12 }];

  XLSX.utils.book_append_sheet(wb, ws, 'Trend Temporale');

  const fileName = `trend_${periodo}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Export full comprehensive report to Excel with multiple sheets
 */
export const exportFullReportToExcel = (statsPeriod, topClients, topTechs, trendData, periodo) => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Riepilogo
  const riepilogoData = [
    ['Report Completo Statistiche Fogli di Assistenza'],
    ['Periodo:', getPeriodoLabel(periodo)],
    ['Data Inizio:', formatDateForExcel(statsPeriod?.startDate)],
    ['Data Fine:', formatDateForExcel(statsPeriod?.endDate)],
    ['Data Generazione:', new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })],
    [],
    ['TOTALE FOGLI NEL PERIODO:', statsPeriod?.totale || 0],
    [],
    ['Distribuzione per Stato'],
    ['Stato', 'Numero Fogli', 'Percentuale']
  ];

  if (statsPeriod && statsPeriod.byStatus) {
    Object.entries(statsPeriod.byStatus).forEach(([stato, count]) => {
      const percentuale = statsPeriod.totale > 0
        ? ((count / statsPeriod.totale) * 100).toFixed(1)
        : '0';
      riepilogoData.push([stato, count, `${percentuale}%`]);
    });
  }

  const wsRiepilogo = XLSX.utils.aoa_to_sheet(riepilogoData);
  wsRiepilogo['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsRiepilogo, 'Riepilogo');

  // Sheet 2: Top Clienti
  if (topClients && topClients.length > 0) {
    const clientiData = [
      ['Top Clienti per Numero di Fogli'],
      [],
      ['Posizione', 'Cliente', 'Numero Fogli']
    ];
    topClients.forEach((client, index) => {
      clientiData.push([index + 1, client.nome, client.count]);
    });

    const wsClienti = XLSX.utils.aoa_to_sheet(clientiData);
    wsClienti['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsClienti, 'Top Clienti');
  }

  // Sheet 3: Top Tecnici
  if (topTechs && topTechs.length > 0) {
    const tecniciData = [
      ['Top Tecnici per Fogli Completati'],
      [],
      ['Posizione', 'Tecnico', 'Numero Interventi']
    ];
    topTechs.forEach((tech, index) => {
      tecniciData.push([index + 1, tech.nome, tech.count]);
    });

    const wsTecnici = XLSX.utils.aoa_to_sheet(tecniciData);
    wsTecnici['!cols'] = [{ wch: 12 }, { wch: 40 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsTecnici, 'Top Tecnici');
  }

  // Sheet 4: Trend Temporale
  if (trendData && trendData.length > 0) {
    const trendDataSheet = [
      ['Trend Temporale'],
      [],
      ['Periodo', 'Totale', 'Aperti', 'In Lavorazione', 'Completati']
    ];
    trendData.forEach(item => {
      trendDataSheet.push([
        item.periodo,
        item.totale,
        item.aperti,
        item.inLavorazione,
        item.completati
      ]);
    });

    const wsTrend = XLSX.utils.aoa_to_sheet(trendDataSheet);
    wsTrend['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 18 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsTrend, 'Trend');
  }

  // Genera e scarica file
  const fileName = `report_completo_${periodo}_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Helper function to get period label in Italian
 */
const getPeriodoLabel = (periodo) => {
  const labels = {
    'settimana_corrente': 'Settimana Corrente',
    'settimana_precedente': 'Settimana Precedente',
    'mese_corrente': 'Mese Corrente',
    'mese_precedente': 'Mese Precedente',
    'anno_corrente': 'Anno Corrente'
  };
  return labels[periodo] || periodo;
};
