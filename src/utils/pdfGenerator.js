// src/utils/pdfGenerator.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const loadImageAsDataURL = (url) => {
    // ... (come prima) ...
    return new Promise((resolve) => {
        if (!url) { resolve(null); return; }
        if (url.startsWith('data:image')) { resolve(url); return; }
        const img = new Image(); img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
            const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
            try { const dataURL = canvas.toDataURL('image/png'); resolve(dataURL); }
            catch (e) { console.error("Errore conversione DataURL:", e); resolve(null); }
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
    const marginBottom = 15; // Margine inferiore della pagina
    const dataStampa = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const titoloFoglioHeader = `Foglio Assistenza N. ${foglioData.numero_foglio || `ID: ${foglioData.id.substring(0,8)}`}`;

    // Funzione per aggiungere l'header solo una volta per pagina
    const addPageHeaderOnce = (currentDoc) => {
        currentDoc.setFontSize(8);
        currentDoc.setTextColor(100);
        currentDoc.text(titoloFoglioHeader, pageWidth - marginRight, 10, { align: 'right' });
        currentDoc.setTextColor(0);
    };

    const checkAndAddPage = (currentDoc, neededHeight = 10) => {
        if (yPosition + neededHeight > pageHeight - marginBottom) {
            currentDoc.addPage();
            yPosition = 15; 
            addPageHeaderOnce(currentDoc); // Aggiungi header alla nuova pagina
            return true; // Pagina aggiunta
        }
        return false; // Nessuna pagina aggiunta
    };
    
    const addFormattedText = (currentDoc, text, x, options = {}) => {
        const fontSize = options.fontSize || 10;
        const textLineHeight = (fontSize / 2.83465 * 1.2);
        const linesArray = currentDoc.splitTextToSize(String(text) || '-', options.maxWidth || contentWidth);
        const estimatedHeight = linesArray.length * textLineHeight + (options.marginBottom || 2);
        
        checkAndAddPage(currentDoc, estimatedHeight);
        
        currentDoc.setFontSize(fontSize);
        currentDoc.setFont(undefined, options.fontStyle || 'normal');
        currentDoc.text(linesArray, x, yPosition, { align: options.align || 'left' });
        const textDimensions = currentDoc.getTextDimensions(linesArray, { fontSize: fontSize });
        yPosition += textDimensions.h + (options.marginBottom || 2);
    };

    const addLabelAndValue = (currentDoc, label, value, x, labelWidth = 40, valueMaxWidthOffset = 5) => {
        const labelFontSize = 10;
        const valueFontSize = 10;
        const defaultLineHeight = (labelFontSize / 2.83465 * 1.2);

        const labelLines = currentDoc.splitTextToSize(label, labelWidth - 2); // -2 per un po' di margine
        const labelTextHeight = currentDoc.getTextDimensions(labelLines, {fontSize: labelFontSize}).h;
        
        let valueTextHeight = defaultLineHeight; // Altezza minima per una riga
        let valueLines = ['-']; // Default se value è nullo o vuoto

        if (value) {
            const valueX = x + labelWidth + 2; // +2 per spazio
            const calculatedValueMaxWidth = contentWidth - (labelWidth + 2) - valueMaxWidthOffset;
            valueLines = currentDoc.splitTextToSize(String(value), calculatedValueMaxWidth > 10 ? calculatedValueMaxWidth : contentWidth - valueX );
            valueTextHeight = currentDoc.getTextDimensions(valueLines, {fontSize: valueFontSize}).h;
        }
        
        // Controlla se l'intero blocco (etichetta + valore) ci sta
        const combinedHeight = Math.max(labelTextHeight, valueTextHeight) + 3; // +3 per margine
        if (yPosition + combinedHeight > pageHeight - marginBottom) {
            currentDoc.addPage();
            yPosition = 15;
            addPageHeaderOnce(currentDoc);
        }
        
        currentDoc.setFontSize(labelFontSize);
        currentDoc.setFont(undefined, 'bold');
        currentDoc.text(labelLines, x, yPosition);
        
        currentDoc.setFontSize(valueFontSize);
        currentDoc.setFont(undefined, 'normal');
        if (value) { // Disegna il valore solo se esiste
             const valueX = x + labelWidth + 2;
             const calculatedValueMaxWidth = contentWidth - (labelWidth + 2) - valueMaxWidthOffset;
             // Ricalcola valueLines nel caso sia cambiato yPosition a causa di addPage
             const currentValLines = currentDoc.splitTextToSize(String(value), calculatedValueMaxWidth > 10 ? calculatedValueMaxWidth : contentWidth - valueX);
             currentDoc.text(currentValLines, valueX, yPosition);
        }
        yPosition += Math.max(labelTextHeight, valueTextHeight) + 1; // Interlinea
    };

    const addLine = (currentDoc, y) => {
        checkAndAddPage(currentDoc, 6); // Spazio per la linea E per il contenuto successivo
        currentDoc.setDrawColor(180, 180, 180);
        currentDoc.line(marginLeft, y, pageWidth - marginRight, y);
        return y + 4; // Aumentato lo spazio dopo la linea
    };

    // --- PRIMA PAGINA ---
    addPageHeaderOnce(doc); // Aggiungi header solo una volta all'inizio per la prima pagina

    // ... (Intestazione Azienda Oilsafe S.r.l. come prima, ma usando yPosition e addFormattedText) ...
    // yPosition = 15; // Già inizializzata
    const NOME_AZIENDA = "Oilsafe S.r.l.";
    const INDIRIZZO_AZIENDA = "Via Toscanini, 209 - 41122 Modena (MO)";
    const PARTITA_IVA_AZIENDA = "02589600366";
    const TELEFONO_AZIENDA = "+39 059 285294";
    const EMAIL_AZIENDA = "amministrazione@oilsafe.it";

    addFormattedText(doc, NOME_AZIENDA, marginLeft, { fontSize: 16, fontStyle: 'bold' });
    addFormattedText(doc, INDIRIZZO_AZIENDA, marginLeft, { fontSize: 9 });
    addFormattedText(doc, `P.IVA: ${PARTITA_IVA_AZIENDA} - Tel: ${TELEFONO_AZIENDA}`, marginLeft, { fontSize: 9 });
    addFormattedText(doc, `Email: ${EMAIL_AZIENDA}`, marginLeft, { fontSize: 9, marginBottom: 7 });

    const titoloDocumento = `RAPPORTO DI INTERVENTO TECNICO`;
    addFormattedText(doc, titoloDocumento, pageWidth / 2, { fontSize: 14, fontStyle: 'bold', align: 'center', marginBottom: 7 });

    // --- DATI GENERALI FOGLIO ---
    addFormattedText(doc, 'Dati Generali del Foglio:', marginLeft, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
    addLabelAndValue(doc, 'Data Apertura:', new Date(foglioData.data_apertura_foglio).toLocaleDateString(), marginLeft);
    addLabelAndValue(doc, 'Cliente:', foglioData.clienti?.nome_azienda || 'N/D', marginLeft);
    if(foglioData.clienti?.indirizzo) addLabelAndValue(doc, 'Indirizzo Cliente:', foglioData.clienti.indirizzo, marginLeft);
    addLabelAndValue(doc, 'Referente Richiesta:', foglioData.referente_cliente_richiesta || 'N/D', marginLeft);
    if (foglioData.commesse) addLabelAndValue(doc, 'Commessa:', `${foglioData.commesse.codice_commessa} (${foglioData.commesse.descrizione_commessa || 'N/D'})`, marginLeft);
    if (foglioData.ordini_cliente) addLabelAndValue(doc, 'Ordine Cliente:', `${foglioData.ordini_cliente.numero_ordine_cliente} (${foglioData.ordini_cliente.descrizione_ordine || 'N/D'})`, marginLeft);
    addLabelAndValue(doc, 'Stato Foglio:', foglioData.stato_foglio, marginLeft);
    if (foglioData.creato_da_user_id) {
        addLabelAndValue(doc, 'Rif. Utente Oilsafe:', `${foglioData.creato_da_user_id.substring(0,8)}...`, marginLeft);
    }
    yPosition += 3;

    // Per evitare stacco tra titolo e valore, passiamo il valore alla funzione addFormattedText
    // che ora gestisce il controllo pagina per il blocco intero (etichetta + valore se etichetta è un testo formattato)
    // Questa logica andrebbe integrata meglio in addLabelAndValue, ma per ora facciamo così:
    const motivoLabel = 'Motivo Intervento Generale:';
    const motivoValue = foglioData.motivo_intervento_generale || 'N/D';
    const motivoLabelHeight = doc.getTextDimensions(motivoLabel, {fontSize: 10, fontStyle: 'bold'}).h;
    const motivoValueLines = doc.splitTextToSize(motivoValue, contentWidth);
    const motivoValueHeight = doc.getTextDimensions(motivoValueLines, {fontSize: 10}).h;
    checkAndAddPage(doc, motivoLabelHeight + motivoValueHeight + 5); // +5 per margini
    addFormattedText(doc, motivoLabel, marginLeft, {fontStyle: 'bold', marginBottom: 1}); // Meno marginBottom
    addFormattedText(doc, motivoValue, marginLeft, { maxWidth: contentWidth, marginBottom: 2 });

    const descLabel = 'Descrizione Lavoro Generale:';
    const descValue = foglioData.descrizione_lavoro_generale || 'N/D';
    const descLabelHeight = doc.getTextDimensions(descLabel, {fontSize: 10, fontStyle: 'bold'}).h;
    const descValueLines = doc.splitTextToSize(descValue, contentWidth);
    const descValueHeight = doc.getTextDimensions(descValueLines, {fontSize: 10}).h;
    checkAndAddPage(doc, descLabelHeight + descValueHeight + 5);
    addFormattedText(doc, descLabel, marginLeft, {fontStyle: 'bold', marginBottom: 1});
    addFormattedText(doc, descValue, marginLeft, { maxWidth: contentWidth, marginBottom: 5 });


    // --- TABELLA INTERVENTI ---
    if (interventiData && interventiData.length > 0) {
        // Calcola altezza stimata titolo + almeno una riga di tabella per decidere se cambiare pagina
        const tableTitleHeight = 10; // Stima
        const oneRowHeight = 10; // Stima
        checkAndAddPage(doc, tableTitleHeight + oneRowHeight); 

        yPosition = addLine(doc, yPosition); // yPosition viene aggiornato da addLine
        addFormattedText(doc, 'Dettaglio Interventi Svolti:', marginLeft, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
        
        const head = [/* ... come prima ... */]; const body = [/* ... come prima ... */];
        head[0] = ['Data', 'Tecnico', 'Tipo', 'H Lav.', 'H Via.', 'Km', 'Descrizione Attività', 'Osservazioni Int.', 'Spese'];
        body.length = 0; // Pulisci e ripopola se era globale
        interventiData.forEach(int => {
            body.push([
                new Date(int.data_intervento_effettivo).toLocaleDateString(),
                int.tecnici ? `${int.tecnici.nome.substring(0,1)}. ${int.tecnici.cognome}` : 'N/D',
                int.tipo_intervento || '-', int.ore_lavoro_effettive || '-', int.ore_viaggio || '-', int.km_percorsi || '-',
                int.descrizione_attivita_svolta_intervento || '-', int.osservazioni_intervento || '-',
                [ (int.vitto ? "V" : ""), (int.autostrada ? "A" : ""), (int.alloggio ? "H" : "") ].filter(Boolean).join('/') || '-'
            ]);
        });


        doc.autoTable({
            startY: yPosition, head: head, body: body, theme: 'striped',
            headStyles: { fillColor: [0, 123, 255], textColor: 255, fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
            styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
            columnStyles: { /* ... come prima ... */
                0: { cellWidth: 16, halign: 'center' }, 1: { cellWidth: 25 }, 2: { cellWidth: 13, halign: 'center' },
                3: { cellWidth: 10, halign: 'right' }, 4: { cellWidth: 10, halign: 'right' }, 5: { cellWidth: 10, halign: 'right' },
                6: { cellWidth: 'auto' }, 7: { cellWidth: 35 }, 8: { cellWidth: 12, halign: 'center' },
            },
            didDrawPage: (data) => { 
                yPosition = 15; 
                addPageHeaderOnce(doc);
                // Se la tabella ha un titolo di sezione, andrebbe ridisegnato qui se la tabella continua
                // Ma il titolo "Dettaglio Interventi Svolti" è già stato disegnato prima di autoTable.
                // Per le pagine successive della tabella, non lo ridisegniamo.
            },
            margin: { top: 15, right: marginRight, bottom: marginBottom + 10, left: marginLeft }
        });
        yPosition = doc.autoTable.previous.finalY ? doc.autoTable.previous.finalY + 5 : yPosition;
    } else { 
        addFormattedText(doc, 'Nessun intervento specifico registrato.', marginLeft, {marginBottom: 5});
    }

    // --- MATERIALI E OSSERVAZIONI GENERALI (CON CONTROLLO STACCO) ---
    yPosition = addLine(doc, yPosition);
    const matLabel = `Materiali Forniti (Generale):`;
    const matValue = foglioData.materiali_forniti_generale || 'Nessuno';
    const matLabelHeight = doc.getTextDimensions(matLabel, {fontSize: 10, fontStyle: 'bold'}).h;
    const matValueLines = doc.splitTextToSize(matValue, contentWidth);
    const matValueHeight = doc.getTextDimensions(matValueLines, {fontSize: 10}).h;
    checkAndAddPage(doc, matLabelHeight + matValueHeight + 5);
    addFormattedText(doc, matLabel, marginLeft, {fontStyle: 'bold', marginBottom: 1});
    addFormattedText(doc, matValue, marginLeft, { maxWidth: contentWidth, marginBottom: 3 });

    const ossLabel = `Osservazioni Generali (Foglio):`;
    const ossValue = foglioData.osservazioni_generali || 'Nessuna';
    const ossLabelHeight = doc.getTextDimensions(ossLabel, {fontSize: 10, fontStyle: 'bold'}).h;
    const ossValueLines = doc.splitTextToSize(ossValue, contentWidth);
    const ossValueHeight = doc.getTextDimensions(ossValueLines, {fontSize: 10}).h;
    checkAndAddPage(doc, ossLabelHeight + ossValueHeight + 5);
    addFormattedText(doc, ossLabel, marginLeft, {fontStyle: 'bold', marginBottom: 1});
    addFormattedText(doc, ossValue, marginLeft, { maxWidth: contentWidth, marginBottom: 10 });

    // --- FIRME ---
    // ... (Codice firme come l'ultima versione con dimensioni 52x26, ma assicurati che checkAndAddPage venga chiamato correttamente prima)
    const signatureBoxHeightEstimation = 26 + 10; // Altezza immagine + etichetta + margine
    checkAndAddPage(doc, signatureBoxHeightEstimation * 2); // Spazio per due blocchi firma

    yPosition = addLine(doc, yPosition);
    addFormattedText(doc, 'Firme:', marginLeft, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
    
    const signatureWidth = 52; 
    const signatureHeight = 26;
    const signatureYStartForLabels = yPosition;
    let yForImages = signatureYStartForLabels + doc.getTextDimensions('X', {fontSize:10}).h + 1; // Spazio per l'etichetta

    const signatureXCliente = marginLeft + 5;
    const signatureXTecnico = pageWidth - marginRight - signatureWidth - 5;

    // Firma Cliente
    addFormattedText(doc, 'Firma Cliente:', signatureXCliente, {fontStyle: 'bold', marginBottom:0});
    const firmaClienteDataUrl = await loadImageAsDataURL(foglioData.firma_cliente_url);
    if (firmaClienteDataUrl) { 
        checkAndAddPage(doc, signatureHeight + 2);
        doc.addImage(firmaClienteDataUrl, 'PNG', signatureXCliente, yForImages, signatureWidth, signatureHeight); 
    } else { 
        checkAndAddPage(doc, 10);
        addFormattedText(doc, '[Firma Cliente non disponibile]', signatureXCliente, {fontSize: 8, marginBottom: signatureHeight - 8}); 
    }

    // Firma Tecnico
    addFormattedText(doc, 'Firma Tecnico Oilsafe:', signatureXTecnico, {fontStyle: 'bold', marginBottom:0});
    const firmaTecnicoDataUrl = await loadImageAsDataURL(foglioData.firma_tecnico_principale_url);
    if (firmaTecnicoDataUrl) { 
        checkAndAddPage(doc, signatureHeight + 2); // Controlla solo se l'immagine potrebbe andare su una nuova pagina
        doc.addImage(firmaTecnicoDataUrl, 'PNG', signatureXTecnico, yForImages, signatureWidth, signatureHeight); 
    } else { 
        checkAndAddPage(doc, 10);
        addFormattedText(doc, '[Firma Tecnico non disponibile]', signatureXTecnico, {fontSize: 8, marginBottom: signatureHeight - 8});
    }
    
    yPosition = yForImages + signatureHeight + 10;


    // --- PIÈ DI PAGINA ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(dataStampa, marginLeft, pageHeight - 10, { align: 'left' });
        doc.text(`Pagina ${i} di ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        // L'header di pagina a destra viene già aggiunto da addPageHeaderOnce o didDrawPage
        // Ma se è la prima pagina e non c'è stata tabella, assicuriamoci che ci sia
        if (i === 1 && doc.internal.getCurrentPageInfo().pageNumber === 1) { // Evita di ridisegnarlo se autoTable l'ha fatto
             // addPageHeaderOnce(doc); // La primissima chiamata a addPageHeaderOnce dovrebbe coprire la pagina 1
        } else if (i > 1) { // Per le pagine successive, se non è una pagina creata da autoTable
            addPageHeaderOnce(doc);
        }
        doc.setTextColor(0);
    }

    const fileName = `FoglioAssistenza_${foglioData.numero_foglio || foglioData.id.substring(0,8)}.pdf`;
    doc.save(fileName);
};