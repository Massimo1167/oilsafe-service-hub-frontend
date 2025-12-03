import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import oilsafeLogo from '../assets/oilsafe-logo.png';

/**
 * Genera PDF della Programmazione Settimanale
 *
 * @param {Object} params - Parametri per la generazione
 * @param {Date} params.weekStart - Data inizio settimana
 * @param {Date} params.weekEnd - Data fine settimana
 * @param {Array} params.weekDays - Array dei giorni della settimana
 * @param {Array} params.tecniciFinali - Array tecnici filtrati da visualizzare
 * @param {Object} params.pianificazioniPerTecnicoGiorno - Oggetto con pianificazioni organizzate
 * @param {string} params.orientamento - 'landscape' o 'portrait'
 * @param {boolean} params.preview - Se true, restituisce DataURL invece di salvare il file
 */
export function generatePianificazionePDF({
  weekStart,
  weekEnd,
  weekDays,
  tecniciFinali,
  pianificazioniPerTecnicoGiorno,
  orientamento = 'landscape',
  preview = false
}) {
  try {
    // Crea documento PDF con orientamento selezionato
    const doc = new jsPDF({
      orientation: orientamento,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- HEADER CON LOGO ---
    const logoWidth = 40;
    const logoHeight = (logoWidth * 87) / 258; // Mantiene proporzioni originali (258x87 pixels)
    const logoX = 14;
    const logoY = 10;

    try {
      doc.addImage(oilsafeLogo, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch (err) {
      console.warn('Logo non disponibile per PDF pianificazione:', err);
    }

    // Titolo
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Programmazione Settimanale', pageWidth / 2, 15, { align: 'center' });

    // Periodo
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const periodoText = `${format(weekStart, 'dd MMM', { locale: it })} - ${format(weekEnd, 'dd MMM yyyy', { locale: it })}`;
    doc.text(periodoText, pageWidth / 2, 22, { align: 'center' });

    // Data stampa
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Stampato il: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })}`, pageWidth - 14, 12, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    // --- TABELLA PROGRAMMAZIONE ---
    const startY = 30;

    // Prepara headers
    const headers = [
      { content: 'Tecnico', styles: { halign: 'left', fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' } },
      ...weekDays.map(day => ({
        content: format(day, 'EEE dd/MM', { locale: it }),
        styles: { halign: 'center', fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold', fontSize: 9 }
      }))
    ];

    // Prepara righe dati
    const rows = tecniciFinali.map(tecnico => {
      const tecnicoData = pianificazioniPerTecnicoGiorno[tecnico.id];
      if (!tecnicoData) return null;

      const row = [
        {
          content: `${tecnico.nome} ${tecnico.cognome}`,
          styles: { fontStyle: 'bold', fillColor: [240, 240, 240] }
        }
      ];

      // Aggiungi celle per ogni giorno
      weekDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const eventi = tecnicoData.giorni[dayKey] || [];

        if (eventi.length === 0) {
          row.push({ content: '-', styles: { halign: 'center', textColor: [150, 150, 150] } });
        } else {
          // Concatena codici commesse
          const codici = eventi.map(e => e.commessa_codice || 'N/A').join('\n');
          row.push({
            content: codici,
            styles: {
              halign: 'center',
              fontSize: 8,
              cellPadding: 2,
              fillColor: [230, 247, 255] // Azzurro chiaro per celle con pianificazioni
            }
          });
        }
      });

      return row;
    }).filter(Boolean);

    // Genera tabella
    doc.autoTable({
      head: [headers],
      body: rows,
      startY: startY,
      margin: { left: 14, right: 14 },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [0, 51, 102],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      columnStyles: {
        0: { cellWidth: orientamento === 'landscape' ? 40 : 35 } // Colonna tecnico più larga
      },
      didDrawPage: function(data) {
        // Footer con numero pagina
        const pageCount = doc.internal.getNumberOfPages();
        const currentPage = doc.internal.getCurrentPageInfo().pageNumber;

        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `Pagina ${currentPage} di ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });

    // --- LEGENDA (se c'è spazio) ---
    const finalY = doc.lastAutoTable.finalY || startY + 50;
    const remainingSpace = pageHeight - finalY - 20;

    if (remainingSpace > 25) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Legenda:', 14, finalY + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('• Codice commessa indica pianificazione attiva', 14, finalY + 16);
      doc.text('• "-" indica nessuna pianificazione per quel giorno', 14, finalY + 21);
    }

    // Modalità preview: restituisce DataURL per iframe
    if (preview) {
      return {
        success: true,
        dataUrl: doc.output('dataurlstring')
      };
    }

    // Modalità normale: salva file
    const fileName = `Programmazione_Settimanale_${format(weekStart, 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error('Errore nella generazione PDF pianificazione:', error);
    return { success: false, error: error.message };
  }
}
