// src/utils/pdfGenerator.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const loadImageAsDataURL = (url) => {
    return new Promise((resolve) => { // Semplificato il reject per ora
        if (!url) { resolve(null); return; }
        if (url.startsWith('data:image')) { resolve(url); return; }
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            try {
                const dataURL = canvas.toDataURL('image/png');
                resolve(dataURL);
            } catch (e) { console.error("Errore conversione DataURL:", e); resolve(null); }
        };
        img.onerror = (err) => { console.error(`Errore caricamento immagine ${url}:`, err); resolve(null); };
        img.src = url;
    });
};

export const generateFoglioAssistenzaPDF = async (foglioData, interventiData) => {
    if (!foglioData) { console.error("Dati foglio mancanti per PDF."); return; }

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    let yPosition = 15; 
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 15;
    const marginRight = 15;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const marginBottom = 15;

    // Data di stampa per il footer
    const dataStampa = new Date().toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });

    // Titolo del foglio per l'intestazione di pagina
    const titoloFoglioHeader = `Foglio Assistenza N. ${foglioData.numero_foglio || `ID: ${foglioData.id.substring(0,8)}`}`;


    const checkAndAddPage = (neededHeight = 10) => {
        if (yPosition + neededHeight > pageHeight - marginBottom) {
            doc.addPage();
            yPosition = 15; // Reset yPosition per la nuova pagina
            // Aggiungi nuovamente l'intestazione di pagina a destra
            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text(titoloFoglioHeader, pageWidth - marginRight, 10, { align: 'right' });
            doc.setTextColor(0); // Reset colore testo
        }
    };
    
    const addFormattedText = (text, x, y, options = {}, defaultLineHeight = 4) => {
        const fontSize = options.fontSize || 10;
        const textHeightEstimate = fontSize / 2.83465 * 1.2 * (String(text).split('\n').length + 2);
        checkAndAddPage(textHeightEstimate);
        
        doc.setFontSize(fontSize);
        doc.setFont(undefined, options.fontStyle || 'normal');
        const lines = doc.splitTextToSize(String(text) || '-', options.maxWidth || contentWidth);
        doc.text(lines, x, y, { align: options.align || 'left' });
        const textDimensions = doc.getTextDimensions(lines, { fontSize: fontSize });
        return y + textDimensions.h + (options.marginBottom || 2);
    };

    const addLabelAndValue = (label, value, x, currentY, labelWidth = 40, valueMaxWidthOffset = 5) => {
        const labelFontSize = 10;
        const valueFontSize = 10;
        const labelHeight = doc.getTextDimensions(label, {fontSize: labelFontSize}).h;
        let valueHeight = doc.getTextDimensions('X', {fontSize: valueFontSize}).h; // Altezza di una riga di valore
        
        if (value) {
            const valueX = x + labelWidth;
            const calculatedValueMaxWidth = contentWidth - labelWidth - valueMaxWidthOffset;
            const valueLines = doc.splitTextToSize(String(value), calculatedValueMaxWidth > 10 ? calculatedValueMaxWidth : contentWidth - valueX );
            valueHeight = doc.getTextDimensions(valueLines, {fontSize: valueFontSize}).h;
        }
        
        checkAndAddPage(Math.max(labelHeight, valueHeight) + 2); // Stima altezza necessaria
        
        doc.setFontSize(labelFontSize);
        doc.setFont(undefined, 'bold');
        doc.text(label, x, currentY);
        
        doc.setFontSize(valueFontSize);
        doc.setFont(undefined, 'normal');
        if (value) {
            const valueX = x + labelWidth + 2; // +2 per spazio tra label e value
            const calculatedValueMaxWidth = contentWidth - (labelWidth + 2) - valueMaxWidthOffset;
            const valueLines = doc.splitTextToSize(String(value), calculatedValueMaxWidth > 10 ? calculatedValueMaxWidth : contentWidth - valueX);
            doc.text(valueLines, valueX, currentY);
        }
        return currentY + Math.max(labelHeight, valueHeight) + 1;
    };

    const addLine = (y) => {
        checkAndAddPage(5);
        doc.setDrawColor(180, 180, 180);
        doc.line(marginLeft, y, pageWidth - marginRight, y);
        return y + 2;
    };

    // --- INTESTAZIONE DI PAGINA (a destra) ---
    doc.setFontSize(8);
    doc.setTextColor(100); // Grigio per l'intestazione
    doc.text(titoloFoglioHeader, pageWidth - marginRight, 10, { align: 'right' });
    doc.setTextColor(0); // Reset colore testo

    // --- INTESTAZIONE AZIENDA ---
    const NOME_AZIENDA = "Oilsafe S.r.l.";
    const INDIRIZZO_AZIENDA = "Via Toscanini, 209 - 41122 Modena (MO)";
    const PARTITA_IVA_AZIENDA = "02589600366";
    const TELEFONO_AZIENDA = "+39 059 285294";
    const EMAIL_AZIENDA = "amministrazione@oilsafe.it";

    yPosition = addFormattedText(NOME_AZIENDA, marginLeft, yPosition, { fontSize: 16, fontStyle: 'bold' });
    yPosition = addFormattedText(INDIRIZZO_AZIENDA, marginLeft, yPosition, { fontSize: 9 });
    yPosition = addFormattedText(`P.IVA: ${PARTITA_IVA_AZIENDA} - Tel: ${TELEFONO_AZIENDA}`, marginLeft, yPosition, { fontSize: 9 });
    yPosition = addFormattedText(`Email: ${EMAIL_AZIENDA}`, marginLeft, yPosition, { fontSize: 9, marginBottom: 7 });

    // --- TITOLO DOCUMENTO (Centrato, ma l'intestazione di pagina è già a dx) ---
    // yPosition = addFormattedText(titoloFoglioHeader, pageWidth / 2, yPosition, { fontSize: 14, fontStyle: 'bold', align: 'center', marginBottom: 7 });
    // Se vogliamo un titolo grande e centrato oltre all'intestazione di pagina:
    const titoloDocumento = `RAPPORTO DI INTERVENTO TECNICO`;
    yPosition = addFormattedText(titoloDocumento, pageWidth / 2, yPosition, { fontSize: 14, fontStyle: 'bold', align: 'center', marginBottom: 7 });


    // --- DATI GENERALI FOGLIO ---
    // ... (logica addLabelAndValue come prima, usando marginLeft invece di 15) ...
    yPosition = addFormattedText('Dati Generali del Foglio:', marginLeft, yPosition, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
    doc.setFontSize(10);

    yPosition = addLabelAndValue('Data Apertura:', new Date(foglioData.data_apertura_foglio).toLocaleDateString(), marginLeft, yPosition);
    yPosition = addLabelAndValue('Cliente:', foglioData.clienti?.nome_azienda || 'N/D', marginLeft, yPosition);
    if(foglioData.clienti?.indirizzo) yPosition = addLabelAndValue('Indirizzo Cliente:', foglioData.clienti.indirizzo, marginLeft, yPosition);
    yPosition = addLabelAndValue('Referente Richiesta:', foglioData.referente_cliente_richiesta || 'N/D', marginLeft, yPosition);
    if (foglioData.commesse) yPosition = addLabelAndValue('Commessa:', `${foglioData.commesse.codice_commessa} (${foglioData.commesse.descrizione_commessa || 'N/D'})`, marginLeft, yPosition);
    if (foglioData.ordini_cliente) yPosition = addLabelAndValue('Ordine Cliente:', `${foglioData.ordini_cliente.numero_ordine_cliente} (${foglioData.ordini_cliente.descrizione_ordine || 'N/D'})`, marginLeft, yPosition);
    yPosition = addLabelAndValue('Stato Foglio:', foglioData.stato_foglio, marginLeft, yPosition);
    if (foglioData.creato_da_user_id) {
        yPosition = addLabelAndValue('Rif. Utente Oilsafe:', `${foglioData.creato_da_user_id.substring(0,8)}...`, marginLeft, yPosition);
    }
    yPosition += 3;

    yPosition = addFormattedText('Motivo Intervento Generale:', marginLeft, yPosition, {fontStyle: 'bold'});
    yPosition = addFormattedText(foglioData.motivo_intervento_generale || 'N/D', marginLeft, yPosition, { maxWidth: contentWidth, marginBottom: 2 });

    yPosition = addFormattedText('Descrizione Lavoro Generale:', marginLeft, yPosition, {fontStyle: 'bold'});
    yPosition = addFormattedText(foglioData.descrizione_lavoro_generale || 'N/D', marginLeft, yPosition, { maxWidth: contentWidth, marginBottom: 5 });


    // --- TABELLA INTERVENTI ---
    if (interventiData && interventiData.length > 0) {
        checkAndAddPage(20);
        yPosition = addLine(yPosition);
        yPosition = addFormattedText('Dettaglio Interventi Svolti:', marginLeft, yPosition + 2, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
        
        const head = [['Data', 'Tecnico', 'Tipo', 'H Lav.', 'H Via.', 'Km', 'Descrizione Attività', 'Osservazioni Int.', 'Spese']];
        const body = interventiData.map(int => [ /* ... come prima ... */
            new Date(int.data_intervento_effettivo).toLocaleDateString(),
            int.tecnici ? `${int.tecnici.nome.substring(0,1)}. ${int.tecnici.cognome}` : 'N/D',
            int.tipo_intervento || '-',
            int.ore_lavoro_effettive || '-',
            int.ore_viaggio || '-',
            int.km_percorsi || '-',
            int.descrizione_attivita_svolta_intervento || '-',
            int.osservazioni_intervento || '-',
            [ (int.vitto ? "V" : ""), (int.autostrada ? "A" : ""), (int.alloggio ? "H" : "") ].filter(Boolean).join('/') || '-'
        ]);

        doc.autoTable({
            startY: yPosition,
            head: head,
            body: body,
            theme: 'striped',
            headStyles: { 
                fillColor: [0, 123, 255], // Colore Blu per l'intestazione (RGB)
                textColor: 255, 
                fontStyle: 'bold', 
                fontSize: 7.5, 
                halign: 'center' 
            },
            styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
            columnStyles: { /* ... come prima ... */
                0: { cellWidth: 16, halign: 'center' }, 1: { cellWidth: 25 }, 2: { cellWidth: 13, halign: 'center' },
                3: { cellWidth: 10, halign: 'right' }, 4: { cellWidth: 10, halign: 'right' }, 5: { cellWidth: 10, halign: 'right' },
                6: { cellWidth: 'auto' }, 7: { cellWidth: 35 }, 8: { cellWidth: 12, halign: 'center' },
            },
            didDrawPage: (data) => { 
                yPosition = data.cursor.y; 
                checkAndAddPage(0); 
                // Aggiungi nuovamente l'intestazione di pagina a destra per le nuove pagine della tabella
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(titoloFoglioHeader, pageWidth - marginRight, 10, { align: 'right' });
                doc.setTextColor(0);
            },
            margin: { top: 15, right: marginRight, bottom: marginBottom + 5, left: marginLeft } // Margini per la tabella
        });
        yPosition = doc.autoTable.previous.finalY ? doc.autoTable.previous.finalY + 5 : yPosition + 5;

    } else { /* ... come prima ... */ }

    // --- MATERIALI E OSSERVAZIONI GENERALI ---
    // ... (logica addFormattedText come prima, usando marginLeft) ...
    checkAndAddPage(20);
    yPosition = addLine(yPosition);
    yPosition = addFormattedText(`Materiali Forniti (Generale):`, marginLeft, yPosition + 2, {fontStyle: 'bold'});
    yPosition = addFormattedText(foglioData.materiali_forniti_generale || 'Nessuno', marginLeft, yPosition, { maxWidth: contentWidth, marginBottom: 3 });
    yPosition = addFormattedText(`Osservazioni Generali (Foglio):`, marginLeft, yPosition, {fontStyle: 'bold'});
    yPosition = addFormattedText(foglioData.osservazioni_generali || 'Nessuna', marginLeft, yPosition, { maxWidth: contentWidth, marginBottom: 10 });


    // --- FIRME ---
    // ... (logica firme come prima, usando marginLeft e signatureXCliente/Tecnico) ...
    checkAndAddPage(65);
    yPosition = addLine(yPosition);
    yPosition = addFormattedText('Firme:', marginLeft, yPosition + 3, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
    doc.setFontSize(10);

    const signatureWidth = 70; const signatureHeight = 35;
    const signatureYStart = yPosition + 2;
    const signatureXCliente = marginLeft + 5; // Leggermente indentato dai margini
    const signatureXTecnico = pageWidth - marginRight - signatureWidth - 5; // Leggermente indentato dai margini

    yPosition = addFormattedText('Firma Cliente:', signatureXCliente, signatureYStart, {fontStyle: 'bold', marginBottom:1});
    const firmaClienteDataUrl = await loadImageAsDataURL(foglioData.firma_cliente_url);
    if (firmaClienteDataUrl) { try { doc.addImage(firmaClienteDataUrl, 'PNG', signatureXCliente, yPosition, signatureWidth, signatureHeight); } catch (e) { yPosition = addFormattedText('[Err firma]', signatureXCliente, yPosition); } }
    else { yPosition = addFormattedText('[Firma Cliente non disponibile]', signatureXCliente, yPosition + 5); }

    let yTecnicoLabel = signatureYStart;
    let yTecnicoImage = yPosition; // Stessa y dell'immagine cliente precedente
    addFormattedText('Firma Tecnico Oilsafe:', signatureXTecnico, yTecnicoLabel, {fontStyle: 'bold', marginBottom:1});
    const firmaTecnicoDataUrl = await loadImageAsDataURL(foglioData.firma_tecnico_principale_url);
    if (firmaTecnicoDataUrl) { try { doc.addImage(firmaTecnicoDataUrl, 'PNG', signatureXTecnico, yTecnicoImage, signatureWidth, signatureHeight); } catch (e) { addFormattedText('[Err firma]', signatureXTecnico, yTecnicoImage); } }
    else { addFormattedText('[Firma Tecnico non disponibile]', signatureXTecnico, yTecnicoImage + 5); }
    
    yPosition = Math.max(yPosition + signatureHeight, yTecnicoImage + signatureHeight) + 10;


    // --- PIÈ DI PAGINA (Numero pagina e Data Stampa) ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i); // Attiva la pagina i-esima
        doc.setFontSize(8);
        doc.setTextColor(100);

        // Data di stampa a sinistra
        doc.text(dataStampa, marginLeft, pageHeight - 10, { align: 'left' });

        // Numero pagina al centro
        doc.text(`Pagina ${i} di ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Intestazione a destra (se non già aggiunta da didDrawPage di autoTable)
        // La logica di checkAndAddPage e didDrawPage dovrebbe già gestire questo per le pagine successive.
        // Lo mettiamo qui per la prima pagina o se la tabella non va su più pagine.
        if (i > 1 || !doc.autoTable.previous) { // Evita di sovrascrivere se autoTable l'ha già fatto
             doc.text(titoloFoglioHeader, pageWidth - marginRight, 10, { align: 'right' });
        }
        doc.setTextColor(0); // Reset colore testo
    }

    const fileName = `FoglioAssistenza_${foglioData.numero_foglio || foglioData.id.substring(0,8)}.pdf`;
    doc.save(fileName);
};