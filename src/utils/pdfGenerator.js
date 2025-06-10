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
    let yPosition = 15; 
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 15;
    const marginRight = 15;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const marginBottom = 15; 

    const dataStampa = new Date().toLocaleDateString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric'
    });
    const titoloFoglioHeader = `Foglio Assistenza N. ${foglioData.numero_foglio || `ID: ${foglioData.id.substring(0,8)}`}`;

    const NOME_AZIENDA = "Oilsafe S.r.l.";
    const INDIRIZZO_AZIENDA = "Via Toscanini, 209 - 41122 Modena (MO)";
    const PARTITA_IVA_AZIENDA = "02589600366";
    const TELEFONO_AZIENDA = "+39 059 285294";
    const EMAIL_AZIENDA = "amministrazione@oilsafe.it";

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
            addPageHeaderOnce(currentDoc); 
            return true; 
        }
        return false; 
    };
    
    const addFormattedText = (currentDoc, text, x, options = {}) => {
        const fontSize = options.fontSize || 10;
        const textLineHeight = (fontSize / 2.83465 * 1.2); 
        const linesArray = currentDoc.splitTextToSize(String(text) || '-', options.maxWidth || contentWidth);
        // Stima più precisa considerando il margine inferiore dell'opzione
        const estimatedBlockHeight = linesArray.length * textLineHeight + (options.marginBottomIfSplit || options.marginBottom || 2) + 2; 
        
        // Se il blocco intero non ci sta, e l'opzione keepTogether è true (o per default per le etichette)
        // allora aggiungi pagina prima.
        if (options.keepTogether && (yPosition + estimatedBlockHeight > pageHeight - marginBottom)) {
            checkAndAddPage(currentDoc, estimatedBlockHeight);
        } else {
             checkAndAddPage(currentDoc, textLineHeight); // Controlla almeno per la prima riga
        }
        
        currentDoc.setFontSize(fontSize);
        currentDoc.setFont(undefined, options.fontStyle || 'normal');
        currentDoc.text(linesArray, x, yPosition, { align: options.align || 'left' }); 
        
        const textDimensions = currentDoc.getTextDimensions(linesArray, { fontSize: fontSize });
        yPosition += textDimensions.h + (options.marginBottom || 2); 
    };

    const addLabelAndValue = (currentDoc, label, value, x, labelWidth = 45, valueMaxWidthOffset = 2) => {
        const labelFontSize = 10;
        const valueFontSize = 10;
        const interlineaPiccola = 1;

        const labelLines = currentDoc.splitTextToSize(label, labelWidth - 2);
        const labelTextHeight = currentDoc.getTextDimensions(labelLines, {fontSize: labelFontSize}).h;
        
        let valueTextHeight = currentDoc.getTextDimensions("X", {fontSize: valueFontSize}).h;
        let valueLines = ['-']; 

        if (value !== null && typeof value !== 'undefined' && String(value).trim() !== '') {
            const valueX = x + labelWidth + 2; 
            const calculatedValueMaxWidth = contentWidth - (labelWidth + 2) - valueMaxWidthOffset;
            valueLines = currentDoc.splitTextToSize(String(value), calculatedValueMaxWidth > 10 ? calculatedValueMaxWidth : contentWidth - valueX );
            valueTextHeight = currentDoc.getTextDimensions(valueLines, {fontSize: valueFontSize}).h;
        }
        
        const combinedBlockHeight = labelTextHeight + (value && String(value).trim() !== '' ? valueTextHeight : 0) + interlineaPiccola + 3; // +3 per margine
        // Se il valore è su più righe, l'altezza combinata è più complessa se sono sulla stessa linea Y
        // Per ora, stimiamo l'altezza massima e se il blocco combinato (etichetta + valore) è troppo grande, andiamo a pagina nuova.
        if (yPosition + Math.max(labelTextHeight, valueTextHeight) + interlineaPiccola + 2 > pageHeight - marginBottom) {
           checkAndAddPage(currentDoc, Math.max(labelTextHeight, valueTextHeight) + interlineaPiccola + 2); // Forza cambio pagina se il max non ci sta
        } else if (value && String(value).trim() !== '' && yPosition + combinedBlockHeight > pageHeight - marginBottom) {
            // Se l'etichetta ci sta, ma l'etichetta + valore no, allora vai a pagina nuova per l'intero blocco
            checkAndAddPage(currentDoc, combinedBlockHeight);
        }

        currentDoc.setFontSize(labelFontSize);
        currentDoc.setFont(undefined, 'bold');
        currentDoc.text(labelLines, x, yPosition);
        
        currentDoc.setFontSize(valueFontSize);
        currentDoc.setFont(undefined, 'normal');
        if (value !== null && typeof value !== 'undefined' && String(value).trim() !== '') {
             const valueX = x + labelWidth + 2;
             const calculatedValueMaxWidth = contentWidth - (labelWidth + 2) - valueMaxWidthOffset;
             const currentValLines = currentDoc.splitTextToSize(String(value), calculatedValueMaxWidth > 10 ? calculatedValueMaxWidth : contentWidth - valueX);
             currentDoc.text(currentValLines, valueX, yPosition);
        }
        yPosition += Math.max(labelTextHeight, valueTextHeight) + interlineaPiccola;
    };

    const addLine = (currentDoc) => { 
        checkAndAddPage(currentDoc, 6); 
        currentDoc.setDrawColor(180, 180, 180); 
        currentDoc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
        yPosition += 4; // Aumentato lo spazio DOPO la linea
    };

    // --- INIZIO DISEGNO PDF ---

    addPageHeaderOnce(doc); 

    addFormattedText(doc, NOME_AZIENDA, marginLeft, { fontSize: 16, fontStyle: 'bold' });
    addFormattedText(doc, INDIRIZZO_AZIENDA, marginLeft, { fontSize: 9 });
    addFormattedText(doc, `P.IVA: ${PARTITA_IVA_AZIENDA} - Tel: ${TELEFONO_AZIENDA}`, marginLeft, { fontSize: 9 });
    addFormattedText(doc, `Email: ${EMAIL_AZIENDA}`, marginLeft, { fontSize: 9, marginBottom: 7 });

    const titoloDocumento = `RAPPORTO DI INTERVENTO TECNICO`;
    addFormattedText(doc, titoloDocumento, pageWidth / 2, { fontSize: 14, fontStyle: 'bold', align: 'center', marginBottom: 7 });

    addFormattedText(doc, 'Dati Generali del Foglio:', marginLeft, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
    addLabelAndValue(doc, 'Data Apertura:', new Date(foglioData.data_apertura_foglio).toLocaleDateString(), marginLeft);
    addLabelAndValue(doc, 'Cliente:', foglioData.clienti?.nome_azienda || 'N/D', marginLeft);
    
    // INDIRIZZO INTERVENTO SPECIFICO
    let indirizzoInterventoDaStampare = 'N/D';
    // foglioData.indirizzi_clienti è l'oggetto joinato che viene dalla tabella 'indirizzi_clienti'
    // referenziata da 'indirizzo_intervento_id' nel foglio di assistenza
    if (foglioData.indirizzi_clienti && foglioData.indirizzi_clienti.indirizzo_completo) {
        indirizzoInterventoDaStampare = foglioData.indirizzi_clienti.indirizzo_completo;
        if (foglioData.indirizzi_clienti.descrizione) {
            indirizzoInterventoDaStampare = `${foglioData.indirizzi_clienti.descrizione}: ${indirizzoInterventoDaStampare}`;
        }
    } else if (foglioData.indirizzo_intervento_id) {
        // Fallback se il join non ha funzionato ma l'ID è presente
        indirizzoInterventoDaStampare = `ID Indirizzo specificato: ${foglioData.indirizzo_intervento_id.substring(0,8)}... (Dettaglio non caricato nel foglioData principale)`;
    }
    addLabelAndValue(doc, 'Indirizzo Intervento:', indirizzoInterventoDaStampare, marginLeft);

    addLabelAndValue(doc, 'Referente Richiesta:', foglioData.referente_cliente_richiesta || 'N/D', marginLeft);
    if (foglioData.commesse) addLabelAndValue(doc, 'Commessa:', `${foglioData.commesse.codice_commessa} (${foglioData.commesse.descrizione_commessa || 'N/D'})`, marginLeft);
    if (foglioData.ordini_cliente) addLabelAndValue(doc, 'Ordine Cliente:', `${foglioData.ordini_cliente.numero_ordine_cliente} (${foglioData.ordini_cliente.descrizione_ordine || 'N/D'})`, marginLeft);
    addLabelAndValue(doc, 'Stato Foglio:', foglioData.stato_foglio, marginLeft);
    if (foglioData.creato_da_user_id) {
        addLabelAndValue(doc, 'Rif. Utente Oilsafe:', `${foglioData.creato_da_user_id.substring(0,8)}...`, marginLeft);
    }
    yPosition += 3; 

    // MOTIVO INTERVENTO
    const motivoLabel = 'Motivo Intervento Generale:';
    const motivoValue = foglioData.motivo_intervento_generale || 'N/D';
    const motivoLabelHeight = doc.getTextDimensions(motivoLabel, {fontSize: 10, fontStyle: 'bold'}).h;
    const motivoValueLines = doc.splitTextToSize(motivoValue, contentWidth);
    const motivoValueHeight = doc.getTextDimensions(motivoValueLines, {fontSize: 10}).h;
    checkAndAddPage(doc, motivoLabelHeight + motivoValueHeight + 5); // Controllo per l'intero blocco
    addFormattedText(doc, motivoLabel, marginLeft, {fontStyle: 'bold', marginBottom: 1});
    addFormattedText(doc, motivoValue, marginLeft, { maxWidth: contentWidth, marginBottom: 2 });

    // DESCRIZIONE LAVORO
    const descLabel = 'Descrizione Lavoro Generale:';
    const descValue = foglioData.descrizione_lavoro_generale || 'N/D';
    const descLabelHeight = doc.getTextDimensions(descLabel, {fontSize: 10, fontStyle: 'bold'}).h;
    const descValueLines = doc.splitTextToSize(descValue, contentWidth);
    const descValueHeight = doc.getTextDimensions(descValueLines, {fontSize: 10}).h;
    checkAndAddPage(doc, descLabelHeight + descValueHeight + 5); // Controllo per l'intero blocco
    addFormattedText(doc, descLabel, marginLeft, {fontStyle: 'bold', marginBottom: 1});
    addFormattedText(doc, descValue, marginLeft, { maxWidth: contentWidth, marginBottom: 5 });

    // TABELLA INTERVENTI
    if (interventiData && interventiData.length > 0) {
        const tableTitleHeight = 10; const oneRowHeight = 10; 
        checkAndAddPage(doc, tableTitleHeight + oneRowHeight); 
        addLine(doc); 
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
                // Se autoTable ha creato una nuova pagina (cioè, non è la prima pagina del documento OPPURE
                // se siamo sulla prima pagina ma il cursore è tornato indietro a causa di una nuova pagina creata dalla tabella)
                if (data.pageNumber > 1 || (data.pageNumber === 1 && data.cursor.y < yPosition) ) { 
                    yPosition = 15; // Reset y per la nuova pagina
                    addPageHeaderOnce(doc); // Aggiungi header
                }
                // Aggiorna yPosition globale alla posizione del cursore dopo che autoTable ha disegnato
                // Questo è importante se la tabella finisce e c'è altro contenuto da aggiungere *sulla stessa pagina*
                // yPosition = data.cursor.y; // Commentato perché l'aggiornamento sotto è più affidabile
            },
            margin: { top: 15, right: marginRight, bottom: marginBottom + 10, left: marginLeft }
        });
        yPosition = doc.autoTable.previous.finalY ? doc.autoTable.previous.finalY + 5 : yPosition;
    } else { 
        addFormattedText(doc, 'Nessun intervento specifico registrato.', marginLeft, {marginBottom: 5});
    }

    // MATERIALI E OSSERVAZIONI GENERALI
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
    const signatureBlockHeightEstimation = 26 + 10 + 5; 
    checkAndAddPage(doc, signatureBlockHeightEstimation * 1.5); 

    addLine(doc);
    addFormattedText(doc, 'Firme:', marginLeft, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
    
    const signatureWidth = 52; 
    const signatureHeight = 26;
    const signatureYStartForLabels = yPosition;
    let yForImagePlacement = signatureYStartForLabels + doc.getTextDimensions("A", {fontSize:10, fontStyle:'bold'}).h + 1; // Spazio per l'etichetta

    const signatureXCliente = marginLeft + 5;
    const signatureXTecnico = pageWidth - marginRight - signatureWidth - 5;

    // Salva yPosition prima di disegnare la prima firma
    let yPosBeforeClienteSig = yPosition;
    addFormattedText(doc, 'Firma Cliente:', signatureXCliente, {fontStyle: 'bold', marginBottom:0});
    // yPosition è ora dopo l'etichetta "Firma Cliente"
    const firmaClienteDataUrl = await loadImageAsDataURL(foglioData.firma_cliente_url);
    if (firmaClienteDataUrl) { 
        checkAndAddPage(doc, signatureHeight + 2); // Controlla spazio per l'immagine alla yPosition corrente
        doc.addImage(firmaClienteDataUrl, 'PNG', signatureXCliente, yPosition, signatureWidth, signatureHeight); 
        yPosition += signatureHeight + 2; 
    } else { 
        checkAndAddPage(doc, 10); 
        addFormattedText(doc, '[Firma Cliente non disponibile]', signatureXCliente, {fontSize: 8, marginBottom:0}); 
        yPosition += doc.getTextDimensions('[Firma Cliente non disponibile]', {fontSize:8}).h + 2;
    }
    let clienteSignatureBottomY = yPosition;

    // Per la firma tecnico, resettiamo yPosition all'inizio delle etichette firme
    // e poi la riposizioniamo per l'immagine del tecnico.
    yPosition = signatureYStartForLabels; // Torna alla y dell'etichetta cliente
    addFormattedText(doc, 'Firma Tecnico Oilsafe:', signatureXTecnico, {fontStyle: 'bold', marginBottom:0});
    // yPosition è ora dopo l'etichetta "Firma Tecnico"
    const firmaTecnicoDataUrl = await loadImageAsDataURL(foglioData.firma_tecnico_principale_url);
    if (firmaTecnicoDataUrl) { 
        checkAndAddPage(doc, signatureHeight + 2); // Controlla spazio alla yPosition corrente
        doc.addImage(firmaTecnicoDataUrl, 'PNG', signatureXTecnico, yPosition, signatureWidth, signatureHeight); 
        yPosition += signatureHeight + 2;
    } else { 
        checkAndAddPage(doc, 10);
        addFormattedText(doc, '[Firma Tecnico non disponibile]', signatureXTecnico, {fontSize: 8, marginBottom:0});
        yPosition += doc.getTextDimensions('[Firma Tecnico non disponibile]', {fontSize:8}).h + 2;
    }
    let tecnicoSignatureBottomY = yPosition;
    
    yPosition = Math.max(clienteSignatureBottomY, tecnicoSignatureBottomY) + 5; // Avanza y dopo la firma più bassa


    // PIÈ DI PAGINA
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i); 
        doc.setFontSize(8); 
        doc.setTextColor(100);
        doc.text(dataStampa, marginLeft, pageHeight - 10, { align: 'left' });
        doc.text(`Pagina ${i} di ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        // L'header a destra viene aggiunto da addPageHeaderOnce quando si crea una nuova pagina
        // o all'inizio per la prima pagina. Non è necessario aggiungerlo di nuovo qui nel ciclo del footer
        // a meno che non si voglia sovrascrivere o ci siano casi non coperti.
        // Per sicurezza, se non è la prima pagina (che ha già l'header), lo aggiungiamo.
        if (i > 1) {
            addPageHeaderOnce(doc);
        }
        doc.setTextColor(0);
    }

    const fileName = `FoglioAssistenza_${foglioData.numero_foglio || foglioData.id.substring(0,8)}.pdf`;
    doc.save(fileName);
};