// src/utils/pdfGenerator.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const loadImageAsDataURL = (url) => {
    return new Promise((resolve) => {
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
            } catch (e) {
                console.error("Errore conversione immagine in DataURL (forse tainted canvas):", e);
                resolve(null);
            }
        };
        img.onerror = (err) => {
            console.error(`Errore caricamento immagine da ${url}:`, err);
            resolve(null);
        };
        img.src = url;
    });
};


export const generateFoglioAssistenzaPDF = async (foglioData, interventiData) => {
    if (!foglioData) {
        console.error("Dati del foglio di assistenza mancanti per la generazione PDF.");
        return;
    }

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    let yPosition = 15; // Posizione Y corrente sulla pagina, inizia sotto il margine superiore
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 15;
    const marginRight = 15;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const marginBottom = 15; // Margine inferiore per il contenuto principale

    const dataStampa = new Date().toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const titoloFoglioHeader = `Foglio Assistenza N. ${foglioData.numero_foglio || `ID: ${foglioData.id.substring(0,8)}`}`;

    // --- DATI AZIENDA (Definiti qui, all'inizio) ---
    const NOME_AZIENDA = "Oilsafe S.r.l.";
    const INDIRIZZO_AZIENDA = "Via Toscanini, 209 - 41122 Modena (MO)";
    const PARTITA_IVA_AZIENDA = "02589600366";
    const TELEFONO_AZIENDA = "+39 059 285294";
    const EMAIL_AZIENDA = "amministrazione@oilsafe.it";

    // Funzione per aggiungere l'header di pagina (titolo foglio a destra)
    const addPageHeaderOnce = (currentDoc) => {
        currentDoc.setFontSize(8);
        currentDoc.setTextColor(100); // Grigio
        currentDoc.text(titoloFoglioHeader, pageWidth - marginRight, 10, { align: 'right' });
        currentDoc.setTextColor(0); // Reset colore testo a nero
    };

    // Funzione per controllare se è necessario aggiungere una nuova pagina
    const checkAndAddPage = (currentDoc, neededHeight = 10) => {
        if (yPosition + neededHeight > pageHeight - marginBottom) {
            currentDoc.addPage();
            yPosition = 15; // Reset yPosition per la nuova pagina (margine superiore)
            addPageHeaderOnce(currentDoc); // Aggiungi header alla nuova pagina
            return true; // Pagina aggiunta
        }
        return false; // Nessuna pagina aggiunta
    };
    
    // Funzione per aggiungere testo formattato, gestendo il cambio pagina e aggiornando yPosition
    const addFormattedText = (currentDoc, text, x, options = {}) => {
        const fontSize = options.fontSize || 10;
        const textLineHeight = (fontSize / 2.83465 * 1.2); // Stima altezza riga
        const linesArray = currentDoc.splitTextToSize(String(text) || '-', options.maxWidth || contentWidth);
        const estimatedBlockHeight = linesArray.length * textLineHeight + (options.marginBottom || 2) + 2; // Stima altezza blocco
        
        checkAndAddPage(currentDoc, estimatedBlockHeight); // Controlla pagina PRIMA di disegnare
        
        currentDoc.setFontSize(fontSize);
        currentDoc.setFont(undefined, options.fontStyle || 'normal');
        currentDoc.text(linesArray, x, yPosition, { align: options.align || 'left' }); // Usa yPosition corrente
        
        const textDimensions = currentDoc.getTextDimensions(linesArray, { fontSize: fontSize });
        yPosition += textDimensions.h + (options.marginBottom || 2); // Aggiorna yPosition globale
    };

    // Funzione per aggiungere etichetta (bold) e valore, gestendo il cambio pagina per l'intero blocco
    const addLabelAndValue = (currentDoc, label, value, x, labelWidth = 45, valueMaxWidthOffset = 2) => {
        const labelFontSize = 10;
        const valueFontSize = 10;
        const interlineaPiccola = 1;

        const labelLines = currentDoc.splitTextToSize(label, labelWidth - 2); // -2 per margine interno etichetta
        const labelTextHeight = currentDoc.getTextDimensions(labelLines, {fontSize: labelFontSize}).h;
        
        let valueTextHeight = currentDoc.getTextDimensions("X", {fontSize: valueFontSize}).h; // Altezza di una riga per default
        let valueLines = ['-']; // Valore di default se non fornito

        if (value !== null && typeof value !== 'undefined' && String(value).trim() !== '') {
            const valueX = x + labelWidth + 2; // Spazio tra etichetta e valore
            const calculatedValueMaxWidth = contentWidth - (labelWidth + 2) - valueMaxWidthOffset;
            valueLines = currentDoc.splitTextToSize(String(value), calculatedValueMaxWidth > 10 ? calculatedValueMaxWidth : contentWidth - valueX );
            valueTextHeight = currentDoc.getTextDimensions(valueLines, {fontSize: valueFontSize}).h;
        }
        
        const combinedBlockHeight = Math.max(labelTextHeight, valueTextHeight) + interlineaPiccola + 2; // +2 margine sotto
        checkAndAddPage(currentDoc, combinedBlockHeight); // Controlla per l'intero blocco etichetta+valore
        
        currentDoc.setFontSize(labelFontSize);
        currentDoc.setFont(undefined, 'bold');
        currentDoc.text(labelLines, x, yPosition);
        
        currentDoc.setFontSize(valueFontSize);
        currentDoc.setFont(undefined, 'normal');
        if (value !== null && typeof value !== 'undefined' && String(value).trim() !== '') {
             const valueX = x + labelWidth + 2;
             const calculatedValueMaxWidth = contentWidth - (labelWidth + 2) - valueMaxWidthOffset;
             // Ricalcola valueLines nel caso sia cambiato yPosition (anche se checkAndAddPage dovrebbe averlo gestito)
             const currentValLines = currentDoc.splitTextToSize(String(value), calculatedValueMaxWidth > 10 ? calculatedValueMaxWidth : contentWidth - valueX);
             currentDoc.text(currentValLines, valueX, yPosition);
        }
        yPosition += Math.max(labelTextHeight, valueTextHeight) + interlineaPiccola;
    };

    // Funzione per aggiungere una linea orizzontale, con spazio adeguato
    const addLine = (currentDoc) => { // Non ha bisogno di y esplicita, usa yPosition globale
        checkAndAddPage(currentDoc, 6); // Spazio per la linea e un po' dopo
        currentDoc.setDrawColor(180, 180, 180); // Grigio chiaro
        currentDoc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
        yPosition += 4; // Aumenta lo spazio DOPO la linea
    };

    // --- INIZIO DISEGNO PDF ---

    addPageHeaderOnce(doc); // Aggiungi header alla prima pagina

    // INTESTAZIONE AZIENDA
    addFormattedText(doc, NOME_AZIENDA, marginLeft, { fontSize: 16, fontStyle: 'bold' });
    addFormattedText(doc, INDIRIZZO_AZIENDA, marginLeft, { fontSize: 9 });
    addFormattedText(doc, `P.IVA: ${PARTITA_IVA_AZIENDA} - Tel: ${TELEFONO_AZIENDA}`, marginLeft, { fontSize: 9 });
    addFormattedText(doc, `Email: ${EMAIL_AZIENDA}`, marginLeft, { fontSize: 9, marginBottom: 7 });

    // TITOLO DOCUMENTO
    const titoloDocumento = `RAPPORTO DI INTERVENTO TECNICO`;
    addFormattedText(doc, titoloDocumento, pageWidth / 2, { fontSize: 14, fontStyle: 'bold', align: 'center', marginBottom: 7 });

    // DATI GENERALI FOGLIO
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
    yPosition += 3; // Spazio aggiuntivo dopo il blocco dati generali

    // MOTIVO INTERVENTO (gestione stacco titolo/valore)
    const motivoLabel = 'Motivo Intervento Generale:';
    const motivoValue = foglioData.motivo_intervento_generale || 'N/D';
    const motivoLabelHeight = doc.getTextDimensions(motivoLabel, {fontSize: 10, fontStyle: 'bold'}).h;
    const motivoValueLines = doc.splitTextToSize(motivoValue, contentWidth);
    const motivoValueHeight = doc.getTextDimensions(motivoValueLines, {fontSize: 10}).h;
    checkAndAddPage(doc, motivoLabelHeight + motivoValueHeight + 5);
    addFormattedText(doc, motivoLabel, marginLeft, {fontStyle: 'bold', marginBottom: 1});
    addFormattedText(doc, motivoValue, marginLeft, { maxWidth: contentWidth, marginBottom: 2 });

    // DESCRIZIONE LAVORO (gestione stacco titolo/valore)
    const descLabel = 'Descrizione Lavoro Generale:';
    const descValue = foglioData.descrizione_lavoro_generale || 'N/D';
    const descLabelHeight = doc.getTextDimensions(descLabel, {fontSize: 10, fontStyle: 'bold'}).h;
    const descValueLines = doc.splitTextToSize(descValue, contentWidth);
    const descValueHeight = doc.getTextDimensions(descValueLines, {fontSize: 10}).h;
    checkAndAddPage(doc, descLabelHeight + descValueHeight + 5);
    addFormattedText(doc, descLabel, marginLeft, {fontStyle: 'bold', marginBottom: 1});
    addFormattedText(doc, descValue, marginLeft, { maxWidth: contentWidth, marginBottom: 5 });

    // TABELLA INTERVENTI
    if (interventiData && interventiData.length > 0) {
        const tableTitleHeight = 10; const oneRowHeight = 10; // Stime
        checkAndAddPage(doc, tableTitleHeight + oneRowHeight); 
        addLine(doc); // addLine ora usa yPosition globale e la aggiorna
        addFormattedText(doc, 'Dettaglio Interventi Svolti:', marginLeft, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
        
        const head = [['Data', 'Tecnico', 'Tipo', 'H Lav.', 'H Via.', 'Km', 'Descrizione Attività', 'Osservazioni Int.', 'Spese']];
        const body = interventiData.map(int => [
            new Date(int.data_intervento_effettivo).toLocaleDateString(),
            int.tecnici ? `${int.tecnici.nome.substring(0,1)}. ${int.tecnici.cognome}` : 'N/D',
            int.tipo_intervento || '-', int.ore_lavoro_effettive || '-', int.ore_viaggio || '-', int.km_percorsi || '-',
            int.descrizione_attivita_svolta_intervento || '-', int.osservazioni_intervento || '-',
            [ (int.vitto ? "V" : ""), (int.autostrada ? "A" : ""), (int.alloggio ? "H" : "") ].filter(Boolean).join('/') || '-'
        ]);

        doc.autoTable({
            startY: yPosition, head: head, body: body, theme: 'striped',
            headStyles: { fillColor: [0, 123, 255], textColor: 255, fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
            styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
            columnStyles: {
                0: { cellWidth: 16, halign: 'center' }, 1: { cellWidth: 25 }, 2: { cellWidth: 13, halign: 'center' },
                3: { cellWidth: 10, halign: 'right' }, 4: { cellWidth: 10, halign: 'right' }, 5: { cellWidth: 10, halign: 'right' },
                6: { cellWidth: 'auto' }, 7: { cellWidth: 35 }, 8: { cellWidth: 12, halign: 'center' },
            },
            didDrawPage: (data) => { 
                if (data.pageNumber > doc.internal.getCurrentPageInfo().pageNumber || data.cursor.y < yPosition ) { // Se autoTable ha aggiunto una pagina
                    yPosition = 15; 
                    addPageHeaderOnce(doc);
                    // Se la tabella iniziava sotto un titolo, quel titolo andrebbe ridisegnato qui.
                    // Per ora, il titolo "Dettaglio Interventi Svolti" è prima di autoTable.
                }
                // yPosition = data.cursor.y; // Lasciamo che sia l'aggiornamento sotto a gestire la y finale
            },
            margin: { top: 15, right: marginRight, bottom: marginBottom + 10, left: marginLeft }
        });
        yPosition = doc.autoTable.previous.finalY ? doc.autoTable.previous.finalY + 5 : yPosition;
    } else { 
        addFormattedText(doc, 'Nessun intervento specifico registrato.', marginLeft, {marginBottom: 5});
    }

    // MATERIALI E OSSERVAZIONI GENERALI (CON CONTROLLO STACCO)
    addLine(doc);
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

    // FIRME
    const signatureBlockHeightEstimation = 26 + 10 + 5; // Immagine + Etichetta + Margine
    checkAndAddPage(doc, signatureBlockHeightEstimation * 1.5); // Spazio per almeno una firma e mezza per sicurezza

    addLine(doc);
    addFormattedText(doc, 'Firme:', marginLeft, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
    
    const signatureWidth = 52; 
    const signatureHeight = 26;
    const signatureYStartForLabels = yPosition;
    let yForImages = signatureYStartForLabels + doc.getTextDimensions("X", {fontSize:10, fontStyle:'bold'}).h + 1; 

    const signatureXCliente = marginLeft + 5;
    const signatureXTecnico = pageWidth - marginRight - signatureWidth - 5;

    // Firma Cliente
    checkAndAddPage(doc, signatureHeight + 10); // Controlla spazio per etichetta + immagine
    addFormattedText(doc, 'Firma Cliente:', signatureXCliente, {fontStyle: 'bold', marginBottom:1});
    yForImages = yPosition; // Aggiorna yForImages dopo che addFormattedText ha aggiornato yPosition
    const firmaClienteDataUrl = await loadImageAsDataURL(foglioData.firma_cliente_url);
    if (firmaClienteDataUrl) { 
        doc.addImage(firmaClienteDataUrl, 'PNG', signatureXCliente, yForImages, signatureWidth, signatureHeight); 
    } else { 
        addFormattedText(doc, '[Firma Cliente non disponibile]', signatureXCliente, {fontSize: 8, marginBottom:0}); 
    }
    let clienteSignatureBottomY = yForImages + signatureHeight;

    // Firma Tecnico
    // Per allineare i box, usiamo le stesse y di partenza per etichette e immagini
    checkAndAddPage(doc, signatureHeight + 10); // Assumendo che vada sulla stessa "riga" o subito dopo
    addFormattedText(doc, 'Firma Tecnico Oilsafe:', signatureXTecnico, {fontStyle: 'bold', marginBottom:1});
    let yTecnicoImage = yPosition; // Aggiorna yTecnicoImage
    const firmaTecnicoDataUrl = await loadImageAsDataURL(foglioData.firma_tecnico_principale_url);
    if (firmaTecnicoDataUrl) { 
        doc.addImage(firmaTecnicoDataUrl, 'PNG', signatureXTecnico, yTecnicoImage, signatureWidth, signatureHeight); 
    } else { 
        addFormattedText(doc, '[Firma Tecnico non disponibile]', signatureXTecnico, {fontSize: 8, marginBottom:0});
    }
    let tecnicoSignatureBottomY = yTecnicoImage + signatureHeight;
    
    yPosition = Math.max(clienteSignatureBottomY, tecnicoSignatureBottomY) + 10;

    // PIÈ DI PAGINA
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(dataStampa, marginLeft, pageHeight - 10, { align: 'left' });
        doc.text(`Pagina ${i} di ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        if (i > 1 || (i === 1 && !doc.autoTable.previous)) { // Aggiungi header se non è la prima pagina (già fatto) o se autoTable non l'ha aggiunto
             // La primissima chiamata a addPageHeaderOnce dovrebbe coprire la pagina 1 iniziale
             // e didDrawPage dovrebbe coprire le pagine di autoTable.
             // Questa è un'ulteriore sicurezza per le pagine create da checkAndAddPage per testo lungo.
             // addPageHeaderOnce(doc); // Potrebbe essere ancora ridondante, da testare.
        }
        // L'header di pagina a destra viene ora aggiunto da addPageHeaderOnce
        // chiamato all'inizio per pagina 1 e da checkAndAddPage/didDrawPage per le successive.
        // Per evitare duplicazioni nel footer, non lo aggiungiamo qui esplicitamente.
        doc.setTextColor(0);
    }

    const fileName = `FoglioAssistenza_${foglioData.numero_foglio || foglioData.id.substring(0,8)}.pdf`;
    doc.save(fileName);
};