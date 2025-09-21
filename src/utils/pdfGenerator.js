/**
 * Utility functions to generate a PDF representation of a service sheet.
 * Uses jspdf and jspdf-autotable and embeds the Oilsafe logo.
 * Called from detail and list pages to produce printable documents.
 */
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// Importa l'immagine del logo dal percorso assets. Assicurati che il logo sia in 'src/assets/'.
import oilsafeLogo from '../assets/oilsafe-logo.png'; 

// Funzione helper per caricare immagini da URL (per le firme) e convertirle in DataURL
const loadImageAsDataURL = (url) => {
    return new Promise((resolve) => {
        if (!url) { resolve(null); return; }
        if (url.startsWith('data:image')) { resolve(url); return; } // Già in formato DataURL
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Necessario per caricare immagini da altri domini (es. Supabase Storage)
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
                console.error("Errore conversione immagine in DataURL (problema di 'tainted canvas'):", e);
                resolve(null);
            }
        };
        img.onerror = (err) => {
            console.error(`Errore durante il caricamento dell'immagine da ${url}:`, err);
            resolve(null);
        };
        img.src = url;
    });
};

// Funzione principale per la generazione del PDF
export const generateFoglioAssistenzaPDF = async (foglioData, interventiData, options = {}) => {
    if (!foglioData) {
        console.error("Dati del foglio di assistenza mancanti per la generazione PDF.");
        return;
    }

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
    // Se non specificato, usa il layout dettagliato come predefinito
    const layoutType = options.layout || 'detailed';
    let yPosition = 15; // Posizione Y corrente, parte dal margine superiore
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;
    const marginLeft = margin;
    const marginRight = margin;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const marginBottom = 15; // Margine inferiore per il contenuto principale

    // --- DATI PER HEADER E FOOTER ---
    const dataStampa = new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const titoloFoglioHeader = `Foglio Assistenza N. ${foglioData.numero_foglio || `ID: ${foglioData.id.substring(0,8)}`}`;

    // --- DATI AZIENDA ---
    const NOME_AZIENDA = "Oilsafe S.r.l.";
    const INDIRIZZO_AZIENDA = "Via Toscanini, 209 - 41122 Modena (MO)";
    const PARTITA_IVA_AZIENDA = "02589600366";
    const TELEFONO_AZIENDA = "+39 059 285294";
    const EMAIL_AZIENDA = "amministrazione@oilsafe.it";

    // --- FUNZIONI HELPER INTERNE ---

    // Aggiunge l'header di pagina (il titolo del foglio a destra)
    const addPageHeader = (currentDoc) => {
        currentDoc.setFontSize(8);
        currentDoc.setTextColor(100); // Grigio
        currentDoc.text(titoloFoglioHeader, pageWidth - marginRight, 10, { align: 'right' });
        currentDoc.setTextColor(0); // Reset colore testo a nero
    };
    
    // Aggiunge il footer di pagina (data e numero pagina)
    const addPageFooter = (currentDoc, pageNum, totalPages) => {
        currentDoc.setFontSize(8);
        currentDoc.setTextColor(100);
        currentDoc.text(dataStampa, marginLeft, pageHeight - 10, { align: 'left' });
        currentDoc.text(`Pagina ${pageNum} di ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        currentDoc.setTextColor(0);
    };

    // Controlla se è necessario aggiungere una nuova pagina e, in caso, aggiunge header
    const checkAndAddPage = (currentDoc, neededHeight = 10) => {
        if (yPosition + neededHeight > pageHeight - marginBottom) {
            currentDoc.addPage();
            yPosition = 15; 
            addPageHeader(currentDoc);
            return true; 
        }
        return false; 
    };
    
    // Aggiunge testo formattato, gestendo il cambio pagina e aggiornando yPosition
    const addFormattedText = (currentDoc, text, x, options = {}) => {
        const fontSize = options.fontSize || 10;
        const textLineHeight = (fontSize / 2.83465 * 1.2); 
        const linesArray = currentDoc.splitTextToSize(String(text) || '-', options.maxWidth || contentWidth);
        const estimatedBlockHeight = linesArray.length * textLineHeight + (options.marginBottom || 2) + 2; 
        
        if (options.keepTogether) {
            checkAndAddPage(currentDoc, estimatedBlockHeight);
        }
        
        checkAndAddPage(currentDoc, textLineHeight);
        
        currentDoc.setFontSize(fontSize);
        currentDoc.setFont(undefined, options.fontStyle || 'normal');
        currentDoc.text(linesArray, x, yPosition, { align: options.align || 'left' }); 
        
        const textDimensions = currentDoc.getTextDimensions(linesArray, { fontSize: fontSize });
        yPosition += textDimensions.h + (options.marginBottom || 2);
    };

    // Aggiunge etichetta (bold) e valore, cercando di tenerli uniti
    const addLabelAndValue = (currentDoc, label, value, x, labelWidth = 45) => {
        const labelFontSize = 10;
        const valueFontSize = 10;
        const interlineaPiccola = 1;
        const labelLines = currentDoc.splitTextToSize(label, labelWidth - 2);
        const labelTextHeight = currentDoc.getTextDimensions(labelLines, {fontSize: labelFontSize}).h;
        
        let valueTextHeight = currentDoc.getTextDimensions("X", {fontSize: valueFontSize}).h;
        let valueLines = ['-']; 

        if (value !== null && typeof value !== 'undefined' && String(value).trim() !== '') {
            const valueX = x + labelWidth + 2; 
            const calculatedValueMaxWidth = contentWidth - (labelWidth + 2);
            valueLines = currentDoc.splitTextToSize(String(value), calculatedValueMaxWidth);
            valueTextHeight = currentDoc.getTextDimensions(valueLines, {fontSize: valueFontSize}).h;
        }
        
        const combinedBlockHeight = Math.max(labelTextHeight, valueTextHeight) + interlineaPiccola + 2;
        checkAndAddPage(currentDoc, combinedBlockHeight);
        
        currentDoc.setFontSize(labelFontSize);
        currentDoc.setFont(undefined, 'bold');
        currentDoc.text(labelLines, x, yPosition);
        
        currentDoc.setFontSize(valueFontSize);
        currentDoc.setFont(undefined, 'normal');
        if (value !== null && typeof value !== 'undefined' && String(value).trim() !== '') {
             const valueX = x + labelWidth + 2;
             const calculatedValueMaxWidth = contentWidth - (labelWidth + 2);
             const currentValLines = currentDoc.splitTextToSize(String(value), calculatedValueMaxWidth);
             currentDoc.text(currentValLines, valueX, yPosition);
        }
        yPosition += Math.max(labelTextHeight, valueTextHeight) + interlineaPiccola;
    };

    // Aggiunge una linea orizzontale con spazio
    const addLine = (currentDoc) => {
        checkAndAddPage(currentDoc, 6);
        yPosition += 2; // Spazio prima della linea
        currentDoc.setDrawColor(180, 180, 180);
        currentDoc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
        yPosition += 4; // Spazio dopo la linea
    };

    // --- INIZIO DISEGNO PDF ---
    addPageHeader(doc); // Aggiungi header alla prima pagina

    // INTESTAZIONE AZIENDA CON LOGO
    const logoWidth = 40;
    const logoHeight = (logoWidth * 87) / 258; // Mantiene le proporzioni dell'immagine originale (258x87 pixels)
    doc.addImage(oilsafeLogo, 'PNG', marginLeft, yPosition, logoWidth, logoHeight);

    const textStartX = marginLeft + logoWidth + 5;
    let textY = yPosition + 2;
    doc.setFontSize(11); doc.setFont(undefined, 'bold');
    doc.text(NOME_AZIENDA, textStartX, textY); textY += 5;
    doc.setFontSize(9); doc.setFont(undefined, 'normal');
    doc.text(INDIRIZZO_AZIENDA, textStartX, textY); textY += 4;
    doc.text(`P.IVA: ${PARTITA_IVA_AZIENDA} - Tel: ${TELEFONO_AZIENDA}`, textStartX, textY); textY += 4;
    doc.text(`Email: ${EMAIL_AZIENDA}`, textStartX, textY);
    
    yPosition = Math.max(yPosition + logoHeight, textY) + 10;
    
    const titoloDocumento = `RAPPORTO DI INTERVENTO TECNICO`;
    addFormattedText(doc, titoloDocumento, pageWidth / 2, { fontSize: 14, fontStyle: 'bold', align: 'center', marginBottom: 7 });

    // DATI GENERALI FOGLIO
    addFormattedText(doc, 'Dati Generali del Foglio:', marginLeft, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
    addLabelAndValue(doc, 'Data Apertura:', new Date(foglioData.data_apertura_foglio).toLocaleDateString(), marginLeft);
    addLabelAndValue(doc, 'Cliente:', foglioData.clienti?.nome_azienda || 'N/D', marginLeft);
    
    let indirizzoInterventoDaStampare = 'N/D';
    if (foglioData.indirizzi_clienti && foglioData.indirizzi_clienti.indirizzo_completo) {
        indirizzoInterventoDaStampare = foglioData.indirizzi_clienti.indirizzo_completo;
        if (foglioData.indirizzi_clienti.descrizione) {
            indirizzoInterventoDaStampare = `${foglioData.indirizzi_clienti.descrizione}: ${indirizzoInterventoDaStampare}`;
        }
    }
    addLabelAndValue(doc, 'Indirizzo Intervento:', indirizzoInterventoDaStampare, marginLeft);

    addLabelAndValue(doc, 'Referente Richiesta:', foglioData.referente_cliente_richiesta || 'N/D', marginLeft);
    const nomeTecnicoAss = foglioData.tecnico_assegnato_nome || foglioData.profilo_tecnico_assegnato?.full_name;
    if (nomeTecnicoAss) {
        addLabelAndValue(doc, 'Tecnico Assegnato:', nomeTecnicoAss, marginLeft);
    }
    if (foglioData.commesse) addLabelAndValue(doc, 'Commessa:', `${foglioData.commesse.codice_commessa} (${foglioData.commesse.descrizione_commessa || 'N/D'})`, marginLeft);
    if (foglioData.ordini_cliente) addLabelAndValue(doc, 'Ordine Cliente:', `${foglioData.ordini_cliente.numero_ordine_cliente} (${foglioData.ordini_cliente.descrizione_ordine || 'N/D'})`, marginLeft);
    addLabelAndValue(doc, 'Stato Foglio:', foglioData.stato_foglio, marginLeft);
    if (foglioData.nota_stato_foglio) {
        addLabelAndValue(doc, 'Nota Stato Foglio:', foglioData.nota_stato_foglio, marginLeft);
    }
    if (foglioData.creato_da_user_id) addLabelAndValue(doc, 'Rif. Utente Oilsafe:', `${foglioData.creato_da_user_id.substring(0,8)}...`, marginLeft);
    yPosition += 3; 

    // Funzione interna per blocchi di testo con titolo, per non separare titolo e contenuto
    const renderBlock = (label, value) => {
        const labelHeight = doc.getTextDimensions(label, {fontSize: 10, fontStyle: 'bold'}).h;
        const valueLines = doc.splitTextToSize(String(value || '-'), contentWidth);
        const valueHeight = doc.getTextDimensions(valueLines, {fontSize: 10}).h;
        checkAndAddPage(doc, labelHeight + valueHeight + 5);
        addFormattedText(doc, label, marginLeft, {fontStyle: 'bold', marginBottom: 1});
        addFormattedText(doc, value || 'N/D', marginLeft, { maxWidth: contentWidth, marginBottom: 2 });
    };

    // MOTIVO, DESCRIZIONE, MATERIALI, OSSERVAZIONI
    renderBlock('Motivo Intervento Generale:', foglioData.motivo_intervento_generale);
    renderBlock('Descrizione Lavoro Generale:', foglioData.descrizione_lavoro_generale);
    yPosition += 3;

    // Calcolo totali interventi
    let totaleKmPercorsi = 0;
    let totaleOreViaggioTecnici = 0;
    let totaleOreLavoroTecnici = 0;
    if (interventiData && interventiData.length > 0) {
        interventiData.forEach(int => {
            const numTec = parseFloat(int.numero_tecnici) || 1;
            totaleKmPercorsi += parseFloat(int.km_percorsi) || 0;
            totaleOreViaggioTecnici += (parseFloat(int.ore_viaggio) || 0) * numTec;
            totaleOreLavoroTecnici += (parseFloat(int.ore_lavoro_effettive) || 0) * numTec;
        });
    }

    // TABELLA INTERVENTI
    if (interventiData && interventiData.length > 0) {
        checkAndAddPage(doc, 20); 
        addLine(doc); 
        addFormattedText(doc, 'Dettaglio Interventi Svolti:', marginLeft, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
        
        if (layoutType === 'table') {
            const head = [['Data', 'Tecnico', 'N. Tecnici', 'Tipo', 'H Lav.', 'H Via.', 'Km', 'Descrizione Attività', 'Osservazioni Int.', 'Spese']];
            const body = interventiData.map(int => [
                new Date(int.data_intervento_effettivo).toLocaleDateString(),
                int.tecnici ? `${int.tecnici.nome.substring(0,1)}. ${int.tecnici.cognome}` : 'N/D',
                int.numero_tecnici || '-',
                int.tipo_intervento || '-',
                int.ore_lavoro_effettive || '-',
                int.ore_viaggio || '-',
                int.km_percorsi || '-',
                int.descrizione_attivita_svolta_intervento || '-',
                int.osservazioni_intervento || '-',
                [(int.vitto ? 'V' : ''), (int.autostrada ? 'A' : ''), (int.alloggio ? 'H' : '')].filter(Boolean).join('/') || '-'
            ]);

            doc.autoTable({
                startY: yPosition,
                head,
                body,
                theme: 'striped',
                margin: { left: marginLeft, right: marginRight },
                tableWidth: contentWidth,
                headStyles: { fillColor: [0, 123, 255], textColor: 255, fontStyle: 'bold', fontSize: 7.5, halign: 'center' },
                styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' },
                columnStyles: {
                    0: { cellWidth: 16, halign: 'center' },
                    1: { cellWidth: 22 },
                    2: { cellWidth: 10, halign: 'right' },
                    3: { cellWidth: 13, halign: 'center' },
                    4: { cellWidth: 10, halign: 'right' },
                    5: { cellWidth: 10, halign: 'right' },
                    6: { cellWidth: 10, halign: 'right' },
                    7: { cellWidth: 50 },
                    8: { cellWidth: 33 },
                    9: { cellWidth: 12, halign: 'center' },
                },
                didDrawPage: (data) => { if (data.pageNumber > 1) { addPageHeader(doc); } },
            });
            yPosition = doc.autoTable.previous.finalY ? doc.autoTable.previous.finalY + 5 : yPosition;
        } else {
            interventiData.forEach((int, idx) => {
                if (idx > 0) addLine(doc);

                const row = [
                    new Date(int.data_intervento_effettivo).toLocaleDateString(),
                    int.tecnici ? `${int.tecnici.nome.substring(0,1)}. ${int.tecnici.cognome}` : 'N/D',
                    int.numero_tecnici || '-',
                    int.tipo_intervento || '-',
                    int.ore_lavoro_effettive || '-',
                    int.ore_viaggio || '-',
                    int.km_percorsi || '-',
                    [(int.vitto ? 'V' : ''), (int.autostrada ? 'A' : ''), (int.alloggio ? 'H' : '')].filter(Boolean).join('/') || '-'
                ];

                doc.autoTable({
                    startY: yPosition,
                    head: [['Data', 'Tecnico', 'N. Tecnici', 'Tipo', 'H Lav.', 'H Via.', 'Km', 'Spese']],
                    body: [row],
                    theme: 'plain',
                    margin: { left: marginLeft, right: marginRight },
                    tableWidth: contentWidth,
                    headStyles: { fillColor: [0, 123, 255], textColor: 255, fontStyle: 'bold', halign: 'center', fontSize: 8 },
                    columnStyles: {
                        0: { cellWidth: 22, halign: 'center' },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 12, halign: 'right' },
                        3: { cellWidth: 22, halign: 'center' },
                        4: { cellWidth: 20, halign: 'right' },
                        5: { cellWidth: 20, halign: 'right' },
                        6: { cellWidth: 20, halign: 'right' },
                        7: { cellWidth: 37, halign: 'center' },
                    },
                    didDrawPage: (data) => { if (data.pageNumber > 1) { addPageHeader(doc); } },
                });
                const rowHeightSpace =
                    doc.autoTable?.previous?.table?.body?.[0]?.height || 5;
                yPosition = doc.autoTable.previous.finalY
                    ? doc.autoTable.previous.finalY + rowHeightSpace
                    : yPosition;

                addLabelAndValue(doc, 'Descrizione Attività:', int.descrizione_attivita_svolta_intervento || '-', marginLeft + 2);
                addLabelAndValue(doc, 'Osservazioni:', int.osservazioni_intervento || '-', marginLeft + 2);
            });
            yPosition += 3;
        }
    } else { 
        addFormattedText(doc, 'Nessun intervento specifico registrato.', marginLeft, {marginBottom: 5});
    }

    addLine(doc);
    renderBlock(`Materiali Forniti (Generale):`, foglioData.materiali_forniti_generale || 'Nessuno');
    renderBlock(`Osservazioni Generali (Foglio):`, foglioData.osservazioni_generali || 'Nessuna');
    yPosition += 5;

    addLine(doc);
    addFormattedText(doc, 'Totali Interventi:', marginLeft, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
    addLabelAndValue(doc, 'Km Totali Percorsi:', totaleKmPercorsi.toFixed(1), marginLeft);
    addLabelAndValue(doc, 'Ore Viaggio x Tecnici:', totaleOreViaggioTecnici.toFixed(2), marginLeft);
    addLabelAndValue(doc, 'Ore Lavoro x Tecnici:', totaleOreLavoroTecnici.toFixed(2), marginLeft);
    yPosition += 5;

    // FIRME
    const signatureWidth = 52; 
    const signatureHeight = 26;
    const signatureBlockHeightEstimation = signatureHeight + 15; 
    checkAndAddPage(doc, signatureBlockHeightEstimation); 

    addLine(doc);
    addFormattedText(doc, 'Firme:', marginLeft, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
    
    const signatureYStartForLabels = yPosition;
    const signatureXCliente = marginLeft + 5;
    const signatureXTecnico = pageWidth - marginRight - signatureWidth - 5;

    // Disegna etichette
    doc.setFontSize(10).setFont(undefined, 'bold');
    doc.text('Firma Cliente:', signatureXCliente, signatureYStartForLabels);
    doc.text('Firma Tecnico Oilsafe:', signatureXTecnico, signatureYStartForLabels);
    doc.setFont(undefined, 'normal');
    
    let yForImages = signatureYStartForLabels + doc.getTextDimensions("A").h + 1;
    checkAndAddPage(doc, signatureHeight + 5);
    
    const firmaClienteDataUrl = await loadImageAsDataURL(foglioData.firma_cliente_url);
    if (firmaClienteDataUrl) { 
        doc.addImage(firmaClienteDataUrl, 'PNG', signatureXCliente, yForImages, signatureWidth, signatureHeight); 
    } else { 
        doc.text('[Firma Cliente non disponibile]', signatureXCliente, yForImages + (signatureHeight / 2));
    }

    const firmaTecnicoDataUrl = await loadImageAsDataURL(foglioData.firma_tecnico_principale_url);
    if (firmaTecnicoDataUrl) { 
        doc.addImage(firmaTecnicoDataUrl, 'PNG', signatureXTecnico, yForImages, signatureWidth, signatureHeight); 
    } else { 
        doc.text('[Firma Tecnico non disponibile]', signatureXTecnico, yForImages + (signatureHeight / 2));
    }
    
    yPosition = yForImages + signatureHeight + 10;

    // PIÈ DI PAGINA FINALE
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i); 
        addPageFooter(doc, i, totalPages);
    }

    const codiceCommessa = foglioData.commesse?.codice_commessa || 'COMMESSA';
    const numeroFoglio = foglioData.numero_foglio || foglioData.id.substring(0,8);

    // Nuovo formato nome file: NUMERO_COMMESSA.pdf (senza "FoglioAssistenza")
    const fileName = `${numeroFoglio}_${codiceCommessa}.pdf`;
    const baseName = `${numeroFoglio}_${codiceCommessa}`;

    const percorsoSalvataggio = foglioData.commesse?.percorso_salvataggio;

    // Salva sempre il PDF con il nome semplificato
    doc.save(fileName);

    // Crea sempre il file TXT, anche se il percorso di destinazione è vuoto
    const pathToUse = percorsoSalvataggio && percorsoSalvataggio.trim() ? percorsoSalvataggio.trim() : '';
    createDestinationFile(baseName, pathToUse, foglioData);
};

// Funzione per creare il file TXT con il percorso di destinazione
function createDestinationFile(baseName, destinationPath, foglioData) {
    try {
        // Estrae le email dai dati del foglio
        const emailReportInterno = foglioData?.email_report_interno || '';
        const emailReportCliente = foglioData?.email_report_cliente || '';

        // Contenuto del file TXT con format strutturato
        const content = `PATH_TO=${destinationPath}
EMAIL_TO=${emailReportInterno}
EMAIL_CLIENTE=${emailReportCliente}
EMAIL_TO_SENT=false
EMAIL_CLIENTE_SENT=false
TRASFERITO=false`;

        // Crea un blob con il contenuto
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

        // Crea un URL temporaneo per il blob
        const url = URL.createObjectURL(blob);

        // Crea un elemento anchor per il download
        const link = document.createElement('a');
        link.href = url;
        link.download = `${baseName}.txt`;

        // Aggiunge il link al DOM, fa click e lo rimuove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Pulisce l'URL temporaneo
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error('Errore nella creazione del file di destinazione:', error);
        // Non interrompe il processo se il file TXT fallisce
    }
};

