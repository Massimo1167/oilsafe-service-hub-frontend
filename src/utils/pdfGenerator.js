/**
 * Utility functions to generate a PDF representation of a service sheet.
 * Uses jspdf and jspdf-autotable and embeds the Oilsafe logo.
 * Called from detail and list pages to produce printable documents.
 */
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// Importa l'immagine del logo dal percorso assets. Assicurati che il logo sia in 'src/assets/'.
import oilsafeLogo from '../assets/oilsafe-logo.png';
import { parseFormattedText, stripMarkdown } from './textFormatter'; 

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
export const generateFoglioAssistenzaPDF = async (foglioData, interventiData, attivitaPreviste = [], options = {}) => {
    if (!foglioData) {
        console.error("Dati del foglio di assistenza mancanti per la generazione PDF.");
        return;
    }

    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

    // DEBUG: Flag per mostrare ruler graduato (per debug posizionamento colonne)
    const DEBUG_SHOW_RULER = false;

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

    // Renderizza una singola linea di testo con stili misti (grassetto, corsivo, ecc.)
    const renderLineWithStyles = (currentDoc, lineSegments, x, y) => {
        let currentX = x;
        lineSegments.forEach(seg => {
            currentDoc.setFont(undefined, seg.style);
            currentDoc.text(seg.text, currentX, y);
            currentX += currentDoc.getTextWidth(seg.text);
        });
    };

    // Aggiunge testo formattato con supporto markdown (grassetto, corsivo)
    const addFormattedTextWithMarkdown = (currentDoc, text, x, maxWidth) => {
        if (!text || String(text).trim() === '') {
            currentDoc.setFont(undefined, 'normal');
            currentDoc.text('-', x, yPosition);
            yPosition += 5;
            return;
        }

        // Splitta il testo per newline PRIMA di processare il markdown
        const lines = String(text).split('\n');
        const fontSize = 10;
        const lineHeight = fontSize / 2.83465 * 1.2;

        // Processa ogni riga separatamente
        lines.forEach((line, lineIndex) => {
            // Se la riga è vuota, aggiungi solo uno spazio verticale
            if (line.trim() === '') {
                checkAndAddPage(currentDoc, lineHeight);
                yPosition += lineHeight;
                return;
            }

            // Processa il markdown per questa singola riga
            const segments = parseFormattedText(line);

            let currentLine = [];
            let currentLineWidth = 0;

            segments.forEach(segment => {
                // IMPORTANTE: Splitta solo su spazi e tab, NON su newline
                const words = segment.text.split(/( +|\t+)/);

                words.forEach((word) => {
                    if (!word) return; // Skip empty strings

                    currentDoc.setFont(undefined, segment.style);
                    const wordWidth = currentDoc.getTextWidth(word);

                    // Se la parola non entra nella linea corrente, stampa la linea e vai a capo
                    if (currentLineWidth + wordWidth > maxWidth && currentLine.length > 0) {
                        checkAndAddPage(currentDoc, lineHeight);
                        renderLineWithStyles(currentDoc, currentLine, x, yPosition);
                        yPosition += lineHeight;
                        currentLine = [];
                        currentLineWidth = 0;
                    }

                    currentLine.push({ text: word, style: segment.style });
                    currentLineWidth += wordWidth;
                });
            });

            // Stampa l'ultima linea di questa riga logica
            if (currentLine.length > 0) {
                checkAndAddPage(currentDoc, lineHeight);
                renderLineWithStyles(currentDoc, currentLine, x, yPosition);
                yPosition += lineHeight;
            }
        });

        yPosition += 2; // Margine dopo blocco di testo
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
             const calculatedValueMaxWidth = contentWidth - (labelWidth + 2);
             const currentValLines = currentDoc.splitTextToSize(String(value), calculatedValueMaxWidth);
             currentDoc.text(currentValLines, x + labelWidth + 2, yPosition);
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

    // Aggiunge una doppia linea più spessa per evidenziare il cambio giorno
    const addDayChangeLine = (currentDoc) => {
        checkAndAddPage(currentDoc, 8);
        yPosition += 3; // Spazio prima della doppia linea
        currentDoc.setDrawColor(100, 100, 100); // Grigio più scuro
        currentDoc.setLineWidth(0.5); // Linea più spessa
        currentDoc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
        yPosition += 2; // Spazio tra le due linee
        currentDoc.line(marginLeft, yPosition, pageWidth - marginRight, yPosition);
        currentDoc.setLineWidth(0.2); // Reset spessore linea normale
        yPosition += 3; // Spazio dopo la doppia linea
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

    // Ordine Interno con data
    if (foglioData.ordini_interni) {
        let ordineInternoText = `${foglioData.ordini_interni.numero_ordine_cliente} (${foglioData.ordini_interni.descrizione_ordine || 'N/D'})`;
        if (foglioData.ordini_interni.data_ordine) {
            const dataOrdineInterno = new Date(foglioData.ordini_interni.data_ordine);
            ordineInternoText += ` - Data: ${dataOrdineInterno.toLocaleDateString('it-IT')}`;
        }
        addLabelAndValue(doc, 'Ordine Interno:', ordineInternoText, marginLeft);

        // Dati Ordine Cliente (se presenti) - raggruppati
        const hasDatiCliente = foglioData.ordini_interni.codice_ordine_cliente ||
                               foglioData.ordini_interni.data_ordine_cliente ||
                               foglioData.ordini_interni.data_conferma_ordine;

        if (hasDatiCliente) {
            yPosition += 1; // Piccolo spazio prima della sezione
            addLabelAndValue(doc, 'Dati Ordine Cliente:', '', marginLeft);

            if (foglioData.ordini_interni.codice_ordine_cliente) {
                addLabelAndValue(doc, '  Codice:', foglioData.ordini_interni.codice_ordine_cliente, marginLeft);
            }
            if (foglioData.ordini_interni.data_ordine_cliente) {
                const dataOrdineCliente = new Date(foglioData.ordini_interni.data_ordine_cliente);
                addLabelAndValue(doc, '  Data Ordine:', dataOrdineCliente.toLocaleDateString('it-IT'), marginLeft);
            }
            if (foglioData.ordini_interni.data_conferma_ordine) {
                const dataConferma = new Date(foglioData.ordini_interni.data_conferma_ordine);
                addLabelAndValue(doc, '  Data Conferma:', dataConferma.toLocaleDateString('it-IT'), marginLeft);
            }
        }
    }

    addLabelAndValue(doc, 'Stato Foglio:', foglioData.stato_foglio, marginLeft);
    if (foglioData.nota_stato_foglio) {
        addLabelAndValue(doc, 'Nota Stato Foglio:', foglioData.nota_stato_foglio, marginLeft);
    }

    // Rif. Utente Oilsafe - mostra il nome completo se disponibile, altrimenti l'ID
    if (foglioData.profilo_creatore?.full_name) {
        addLabelAndValue(doc, 'Rif. Utente Oilsafe:', foglioData.profilo_creatore.full_name, marginLeft);
    } else if (foglioData.creato_da_user_id) {
        addLabelAndValue(doc, 'Rif. Utente Oilsafe:', `${foglioData.creato_da_user_id.substring(0,8)}...`, marginLeft);
    }
    yPosition += 3;

    // Funzione per blocchi di testo con supporto formattazione markdown
    const renderBlockWithFormatting = (label, value) => {
        const labelHeight = doc.getTextDimensions(label, {fontSize: 10, fontStyle: 'bold'}).h;
        const estimatedHeight = 30; // Stima per check pagina iniziale
        checkAndAddPage(doc, labelHeight + estimatedHeight);

        addFormattedText(doc, label, marginLeft, {fontStyle: 'bold', marginBottom: 1});
        addFormattedTextWithMarkdown(doc, value || 'N/D', marginLeft, contentWidth);
    };

    // MOTIVO, DESCRIZIONE, MATERIALI, OSSERVAZIONI (con supporto formattazione markdown)
    renderBlockWithFormatting('Motivo Intervento Generale:', foglioData.motivo_intervento_generale);
    renderBlockWithFormatting('Descrizione Lavoro Generale:', foglioData.descrizione_lavoro_generale);
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

    // Funzione helper per normalizzare tipo_intervento (supporta valori storici)
    const normalizeTipoIntervento = (tipo) => {
        const mapping = {
            'In Loco': 'Sede Cliente',
            'In loco': 'Sede Cliente',
            'in loco': 'Sede Cliente',
            'Remoto': 'Sede Oilsafe',
            'remoto': 'Sede Oilsafe',
            'Sede Cliente': 'Sede Cliente',
            'Sede Oilsafe': 'Sede Oilsafe',
            'Teleassistenza': 'Teleassistenza'
        };
        return mapping[tipo] || tipo;
    };

    // Funzione per aggregare ore per tipo_intervento e mansione (senza costi)
    const aggregaOrePerTipoEMansione = (interventi) => {
        const aggregazione = {
            'Sede Cliente': {},
            'Sede Oilsafe': {},
            'Teleassistenza': {}
        };

        interventi.forEach(int => {
            // Normalizza il tipo intervento usando la funzione helper
            const tipoInterventoRaw = int.tipo_intervento || 'Sede Cliente';
            const tipoIntervento = normalizeTipoIntervento(tipoInterventoRaw);

            const mansione = int.mansioni?.ruolo || 'Non Specificato';
            const numTec = parseFloat(int.numero_tecnici) || 1;
            const oreLavoro = (parseFloat(int.ore_lavoro_effettive) || 0) * numTec;

            // Inizializza se non esiste
            if (!aggregazione[tipoIntervento]) {
                aggregazione[tipoIntervento] = {};
            }

            // Aggiungi o somma ore
            if (!aggregazione[tipoIntervento][mansione]) {
                aggregazione[tipoIntervento][mansione] = 0;
            }
            aggregazione[tipoIntervento][mansione] += oreLavoro;
        });

        return aggregazione;
    };

    // Funzione per aggregare ore E COSTI per tipo_intervento e mansione con calcolo straordinari
    const aggregaOreECostiPerTipoEMansione = (interventi) => {
        const aggregazione = {
            'Sede Cliente': {},
            'Sede Oilsafe': {},
            'Teleassistenza': {}
        };

        // Step 1: Raggruppa interventi per tecnico+data per calcolare straordinari giornalieri
        const interventiPerTecnicoGiorno = {};

        interventi.forEach(int => {
            const tecnicoId = int.tecnico_id;
            const data = int.data_intervento_effettivo;
            const key = `${tecnicoId}_${data}`;

            if (!interventiPerTecnicoGiorno[key]) {
                interventiPerTecnicoGiorno[key] = [];
            }
            interventiPerTecnicoGiorno[key].push(int);
        });

        // Step 2: Per ogni gruppo giornaliero, calcola ore normali e straordinarie
        Object.values(interventiPerTecnicoGiorno).forEach(interventiGiorno => {
            // Calcola totale ore giornaliere
            const oreTotaliGiorno = interventiGiorno.reduce((sum, int) => {
                const numTec = parseFloat(int.numero_tecnici) || 1;
                const ore = (parseFloat(int.ore_lavoro_effettive) || 0) * numTec;
                return sum + ore;
            }, 0);

            // Determina split normale/straordinario
            const oreNormaliGiorno = Math.min(oreTotaliGiorno, 8);
            const oreStraordinarioGiorno = Math.max(0, oreTotaliGiorno - 8);

            // Step 3: Proporziona ore normali/straordinarie a ciascun intervento
            interventiGiorno.forEach(int => {
                const tipoInterventoRaw = int.tipo_intervento || 'Sede Cliente';
                const tipoIntervento = normalizeTipoIntervento(tipoInterventoRaw);

                const mansione = int.mansioni?.ruolo || 'Non Specificato';
                const mansioneData = int.mansioni; // Dati completi mansione con costi
                const numTec = parseFloat(int.numero_tecnici) || 1;
                const oreIntervento = (parseFloat(int.ore_lavoro_effettive) || 0) * numTec;

                // Proporziona ore normali e straordinarie
                const propOreNormali = oreTotaliGiorno > 0
                    ? (oreIntervento / oreTotaliGiorno) * oreNormaliGiorno
                    : 0;
                const propOreStraord = oreTotaliGiorno > 0
                    ? (oreIntervento / oreTotaliGiorno) * oreStraordinarioGiorno
                    : 0;

                // Determina costi orari dalla mansione in base al tipo intervento
                let costoNormale, costoStraord;
                if (tipoIntervento === 'Sede Cliente') {
                    costoNormale = parseFloat(mansioneData?.costo_orario_cliente) || 0;
                    costoStraord = parseFloat(mansioneData?.costo_straordinario_cliente) || 0;
                } else if (tipoIntervento === 'Teleassistenza') {
                    costoNormale = parseFloat(mansioneData?.costo_orario_teleassistenza) || 0;
                    costoStraord = parseFloat(mansioneData?.costo_straordinario_teleassistenza) || 0;
                } else { // Sede Oilsafe
                    costoNormale = parseFloat(mansioneData?.costo_orario_oilsafe) || 0;
                    costoStraord = parseFloat(mansioneData?.costo_straordinario_oilsafe) || 0;
                }

                // Calcola costi
                const importoNormale = propOreNormali * costoNormale;
                const importoStraord = propOreStraord * costoStraord;

                // Inizializza struttura se non esiste
                if (!aggregazione[tipoIntervento][mansione]) {
                    aggregazione[tipoIntervento][mansione] = {
                        ore_normali: 0,
                        costo_normale: 0,
                        ore_straordinarie: 0,
                        costo_straordinario: 0,
                        ore_totali: 0,
                        costo_totale: 0,
                        has_costo: costoNormale > 0 || costoStraord > 0
                    };
                }

                // Accumula valori
                aggregazione[tipoIntervento][mansione].ore_normali += propOreNormali;
                aggregazione[tipoIntervento][mansione].costo_normale += importoNormale;
                aggregazione[tipoIntervento][mansione].ore_straordinarie += propOreStraord;
                aggregazione[tipoIntervento][mansione].costo_straordinario += importoStraord;
                aggregazione[tipoIntervento][mansione].ore_totali += oreIntervento;
                aggregazione[tipoIntervento][mansione].costo_totale += (importoNormale + importoStraord);
            });
        });

        return aggregazione;
    };

    // Determina se mostrare costi basato sul layout
    const showCosts = (layoutType === 'detailed_with_costs');

    // Calcola aggregazione ore per tipo e mansione (con o senza costi)
    const orePerTipoMansione = showCosts
        ? aggregaOreECostiPerTipoEMansione(interventiData || [])
        : aggregaOrePerTipoEMansione(interventiData || []);

    // Debug: log aggregazione per verificare dati
    console.log('PDFGenerator: Aggregazione ore per tipo e mansione:', {
        interventiTotali: interventiData?.length || 0,
        showCosts,
        aggregazione: orePerTipoMansione,
        chiavi: Object.keys(orePerTipoMansione)
    });

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
                stripMarkdown(int.descrizione_attivita_svolta_intervento) || '-',
                stripMarkdown(int.osservazioni_intervento) || '-',
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
                didDrawCell: (data) => {
                    // Evidenzia il cambio giorno con una linea più spessa
                    if (data.section === 'body' && data.column.index === 0 && data.row.index > 0) {
                        const currentDate = interventiData[data.row.index].data_intervento_effettivo;
                        const previousDate = interventiData[data.row.index - 1].data_intervento_effettivo;

                        if (currentDate !== previousDate) {
                            const cellY = data.cell.y;
                            doc.setDrawColor(100, 100, 100);
                            doc.setLineWidth(0.8);
                            doc.line(marginLeft, cellY, pageWidth - marginRight, cellY);
                            doc.setLineWidth(0.2); // Reset
                        }
                    }
                },
            });
            yPosition = doc.autoTable.previous.finalY ? doc.autoTable.previous.finalY + 5 : yPosition;
        } else {
            interventiData.forEach((int, idx) => {
                // Controlla se c'è un cambio giorno rispetto all'intervento precedente
                if (idx > 0) {
                    const currentDate = int.data_intervento_effettivo;
                    const previousDate = interventiData[idx - 1].data_intervento_effettivo;

                    if (currentDate !== previousDate) {
                        // Cambio giorno: usa doppia linea più spessa
                        addDayChangeLine(doc);
                    } else {
                        // Stesso giorno: usa linea normale
                        addLine(doc);
                    }
                }

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

                // NUOVA SEZIONE: Attività Standard Svolte in questo intervento
                if (int.interventi_attivita_standard && int.interventi_attivita_standard.length > 0) {
                    checkAndAddPage(doc, 10);
                    doc.setFontSize(10);
                    doc.setFont(undefined, 'bold');
                    doc.text('Attività Standard Svolte:', marginLeft + 2, yPosition);
                    yPosition += 5;

                    doc.setFontSize(8);
                    doc.setFont(undefined, 'normal');

                    int.interventi_attivita_standard.forEach(att => {
                        checkAndAddPage(doc, 8);

                        // Codice attività e descrizione
                        const codice = att.codice_attivita || 'N/D';
                        const desc = att.descrizione || '';
                        doc.text(`  • ${codice}`, marginLeft + 4, yPosition);
                        if (desc) {
                            // Usa splitTextToSize per wrappare descrizioni lunghe
                            const descLines = doc.splitTextToSize(`: ${desc}`, contentWidth - 30);
                            descLines.forEach((line, idx) => {
                                if (idx === 0) {
                                    doc.text(line, marginLeft + 25, yPosition);
                                } else {
                                    yPosition += 3;
                                    doc.text(line, marginLeft + 25, yPosition);
                                }
                            });
                        }
                        yPosition += 4;

                        // Quantità
                        const qta = parseFloat(att.quantita) || 0;
                        const um = att.unita_misura || '';
                        doc.text(`    Quantità: ${qta.toFixed(2)} ${um}`, marginLeft + 6, yPosition);
                        yPosition += 5;
                    });

                    yPosition += 2; // Spazio extra prima della prossima sezione
                }

                // Descrizione Attività con formattazione markdown
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                checkAndAddPage(doc, 5);
                doc.text('Descrizione Attività:', marginLeft + 2, yPosition);
                yPosition += 5;
                addFormattedTextWithMarkdown(doc, int.descrizione_attivita_svolta_intervento, marginLeft + 2, contentWidth - 2);

                // Osservazioni con formattazione markdown
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                checkAndAddPage(doc, 5);
                doc.text('Osservazioni:', marginLeft + 2, yPosition);
                yPosition += 5;
                addFormattedTextWithMarkdown(doc, int.osservazioni_intervento, marginLeft + 2, contentWidth - 2);
            });
            yPosition += 3;
        }
    } else { 
        addFormattedText(doc, 'Nessun intervento specifico registrato.', marginLeft, {marginBottom: 5});
    }

    addLine(doc);
    renderBlockWithFormatting(`Materiali Forniti (Generale):`, foglioData.materiali_forniti_generale || 'Nessuno');
    renderBlockWithFormatting(`Osservazioni Generali (Foglio):`, foglioData.osservazioni_generali || 'Nessuna');
    yPosition += 5;

    addLine(doc);
    addFormattedText(doc, 'Totali Interventi:', marginLeft, { fontSize: 11, fontStyle: 'bold', marginBottom: 3 });
    addLabelAndValue(doc, 'Km Totali Percorsi:', totaleKmPercorsi.toFixed(1), marginLeft);
    addLabelAndValue(doc, 'Ore Viaggio x Tecnici:', totaleOreViaggioTecnici.toFixed(2), marginLeft);
    addLabelAndValue(doc, 'Ore Lavoro x Tecnici:', totaleOreLavoroTecnici.toFixed(2), marginLeft);
    yPosition += 5;

    // DETTAGLIO ORE PER TIPO INTERVENTO E MANSIONE
    addFormattedText(doc, 'Dettaglio Ore per Tipo Intervento e Mansione:', marginLeft, {
        fontSize: 10,
        fontStyle: 'bold',
        marginBottom: 3
    });

    // Funzione per renderizzare una sezione tipo intervento (con o senza costi)
    const renderTipoInterventoSection = (currentDoc, tipoLabel, mansioniObj, showCosts = false) => {
        // Converti oggetto in array e ordina per ore totali decrescenti
        const mansioniArray = Object.entries(mansioniObj)
            .map(([mansione, data]) => ({
                mansione,
                data: showCosts ? data : { ore_totali: data }
            }))
            .sort((a, b) => {
                const oreA = showCosts ? a.data.ore_totali : a.data.ore_totali;
                const oreB = showCosts ? b.data.ore_totali : b.data.ore_totali;
                return oreB - oreA;
            });

        if (mansioniArray.length === 0) {
            return showCosts ? { ore: 0, costo: 0 } : 0;
        }

        if (!showCosts) {
            // Rendering semplice (senza costi) - comportamento originale
            const totaleTipo = mansioniArray.reduce((sum, item) => sum + item.data.ore_totali, 0);

            const estimatedHeight = (mansioniArray.length + 3) * 6;
            checkAndAddPage(currentDoc, estimatedHeight);

            currentDoc.setFontSize(9);
            currentDoc.setFont(undefined, 'bold');
            currentDoc.text(tipoLabel + ':', marginLeft + 5, yPosition);
            yPosition += 5;

            currentDoc.setFontSize(8);
            currentDoc.setFont(undefined, 'normal');

            mansioniArray.forEach(item => {
                const mansioneText = `  • ${item.mansione}`;
                const oreText = `${item.data.ore_totali.toFixed(2)}h`;

                currentDoc.text(mansioneText, marginLeft + 8, yPosition);
                currentDoc.text(oreText, marginLeft + 85, yPosition, { align: 'right' });
                yPosition += 4;
            });

            yPosition += 1;
            currentDoc.setFont(undefined, 'bold');
            currentDoc.text(`Totale ${tipoLabel}:`, marginLeft + 8, yPosition);
            currentDoc.text(`${totaleTipo.toFixed(2)}h`, marginLeft + 85, yPosition, { align: 'right' });
            currentDoc.setFont(undefined, 'normal');
            yPosition += 6;

            return totaleTipo;
        } else {
            // Rendering con costi (tabellare esteso)
            const totaleTipoOre = mansioniArray.reduce((sum, item) => sum + item.data.ore_totali, 0);
            const totaleTipoCosto = mansioniArray.reduce((sum, item) => sum + item.data.costo_totale, 0);

            const estimatedHeight = (mansioniArray.length + 4) * 7;
            checkAndAddPage(currentDoc, estimatedHeight);

            currentDoc.setFontSize(9);
            currentDoc.setFont(undefined, 'bold');
            currentDoc.text(tipoLabel + ':', marginLeft + 5, yPosition);
            yPosition += 5;

            // Header tabella con costi
            currentDoc.setFontSize(7);
            currentDoc.setFont(undefined, 'bold');
            currentDoc.text('Mansione', marginLeft + 8, yPosition);
            currentDoc.text('Ore Norm.', marginLeft + 55, yPosition, { align: 'right' });
            currentDoc.text('Costo Norm.', marginLeft + 82, yPosition, { align: 'right' });
            currentDoc.text('Ore Straord.', marginLeft + 112, yPosition, { align: 'right' });
            currentDoc.text('Costo Straord.', marginLeft + 142, yPosition, { align: 'right' });
            currentDoc.text('Ore Tot.', marginLeft + 166, yPosition, { align: 'right' });
            currentDoc.text('Costo Tot.', marginLeft + 195, yPosition, { align: 'right' });
            yPosition += 4;

            currentDoc.setFont(undefined, 'normal');

            mansioniArray.forEach(item => {
                const mansione = item.mansione;
                const d = item.data;

                // Formatta valori con "N/D" se non hanno costo
                const costoNormText = d.has_costo ? `€${d.costo_normale.toFixed(2)}` : 'N/D';
                const costoStraordText = d.has_costo ? `€${d.costo_straordinario.toFixed(2)}` : 'N/D';
                const costoTotText = d.has_costo ? `€${d.costo_totale.toFixed(2)}` : 'N/D';

                currentDoc.text(mansione.substring(0, 20), marginLeft + 8, yPosition);
                currentDoc.text(`${d.ore_normali.toFixed(2)}h`, marginLeft + 55, yPosition, { align: 'right' });
                currentDoc.text(costoNormText, marginLeft + 82, yPosition, { align: 'right' });
                currentDoc.text(`${d.ore_straordinarie.toFixed(2)}h`, marginLeft + 112, yPosition, { align: 'right' });
                currentDoc.text(costoStraordText, marginLeft + 142, yPosition, { align: 'right' });
                currentDoc.text(`${d.ore_totali.toFixed(2)}h`, marginLeft + 166, yPosition, { align: 'right' });
                currentDoc.text(costoTotText, marginLeft + 195, yPosition, { align: 'right' });
                yPosition += 4;
            });

            // Riga totale
            yPosition += 1;
            currentDoc.setFont(undefined, 'bold');
            currentDoc.text(`Totale ${tipoLabel}:`, marginLeft + 8, yPosition);
            currentDoc.text(`${totaleTipoOre.toFixed(2)}h`, marginLeft + 166, yPosition, { align: 'right' });
            currentDoc.text(`€${totaleTipoCosto.toFixed(2)}`, marginLeft + 195, yPosition, { align: 'right' });
            currentDoc.setFont(undefined, 'normal');
            yPosition += 6;

            return { ore: totaleTipoOre, costo: totaleTipoCosto };
        }
    };

    // Renderizza sezioni per tutti i tipi di intervento
    const tipiIntervento = ['Sede Cliente', 'Sede Oilsafe', 'Teleassistenza'];
    const totaliPerTipo = {};

    tipiIntervento.forEach(tipo => {
        if (orePerTipoMansione[tipo] && Object.keys(orePerTipoMansione[tipo]).length > 0) {
            totaliPerTipo[tipo] = renderTipoInterventoSection(doc, tipo, orePerTipoMansione[tipo], showCosts);
        } else {
            totaliPerTipo[tipo] = showCosts ? { ore: 0, costo: 0 } : 0;
        }
    });

    // Se showCosts, aggiungi totale generale e nota
    if (showCosts) {
        checkAndAddPage(doc, 25);
        yPosition += 2;
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('TOTALE GENERALE:', marginLeft + 5, yPosition);
        yPosition += 5;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        const totaleOreGenerale = tipiIntervento.reduce((sum, tipo) => {
            return sum + (totaliPerTipo[tipo]?.ore || 0);
        }, 0);
        const totaleCostoGenerale = tipiIntervento.reduce((sum, tipo) => {
            return sum + (totaliPerTipo[tipo]?.costo || 0);
        }, 0);

        doc.text(`Ore Totali: ${totaleOreGenerale.toFixed(2)}h`, marginLeft + 8, yPosition);
        yPosition += 4;
        doc.text(`Costo Totale: €${totaleCostoGenerale.toFixed(2)}`, marginLeft + 8, yPosition);
        yPosition += 8;

        // Nota esplicativa straordinari
        doc.setFontSize(7);
        doc.setFont(undefined, 'italic');
        const notaText = 'Nota: Le ore straordinarie sono calcolate aggregando tutti gli interventi dello stesso tecnico ' +
            'nella stessa giornata per il cliente specificato. Quando le ore totali giornaliere superano 8 ore, ' +
            'le ore eccedenti sono considerate straordinarie e fatturate con il relativo maggiorazione.';
        const notaLines = doc.splitTextToSize(notaText, pageWidth - (2 * marginLeft));
        doc.text(notaLines, marginLeft + 5, yPosition);
        yPosition += notaLines.length * 3;
        doc.setFont(undefined, 'normal');
    } else {
        // Verifica totale (per debug) - solo per versione senza costi
        const totaleCalcolato = tipiIntervento.reduce((sum, tipo) => {
            return sum + (totaliPerTipo[tipo] || 0);
        }, 0);
        if (Math.abs(totaleCalcolato - totaleOreLavoroTecnici) > 0.1) {
            console.warn('PDFGenerator: Discrepanza totali ore:', {
                totaleOreLavoroTecnici,
                totaleCalcolato,
                diff: Math.abs(totaleCalcolato - totaleOreLavoroTecnici)
            });
        }
    }

    yPosition += 3;

    // SEZIONE ATTIVITÀ STANDARD (solo se layout detailed o detailed_with_costs)
    if ((layoutType === 'detailed' || layoutType === 'detailed_with_costs') && attivitaPreviste && attivitaPreviste.length > 0) {
        // Step 1: Aggrega attività ESEGUITE da tutti gli interventi
        const attivitaEseguiteMap = {};

        if (interventiData) {
            interventiData.forEach(int => {
                if (int.interventi_attivita_standard?.length > 0) {
                    int.interventi_attivita_standard.forEach(att => {
                        const key = att.codice_attivita;
                        if (!attivitaEseguiteMap[key]) {
                            attivitaEseguiteMap[key] = {
                                quantita_totale: 0,
                                costo_totale: 0
                            };
                        }
                        attivitaEseguiteMap[key].quantita_totale += parseFloat(att.quantita) || 0;
                        attivitaEseguiteMap[key].costo_totale += parseFloat(att.costo_totale) || 0;
                    });
                }
            });
        }

        // Step 2: Crea array completo con TUTTE le attività previste
        const attivitaCompleteArray = attivitaPreviste.map(prev => {
            const codice = prev.attivita_standard_clienti?.codice_attivita || 'N/D';
            const eseguita = attivitaEseguiteMap[codice];

            return {
                codice: codice,
                descrizione: prev.attivita_standard_clienti?.descrizione || 'N/D',
                um: prev.attivita_standard_clienti?.unita_misura?.codice || '',
                costo_unitario: parseFloat(prev.attivita_standard_clienti?.costo_unitario) || 0,
                obbligatoria: prev.obbligatoria || false,
                eseguita: !!eseguita,
                quantita_totale: eseguita ? eseguita.quantita_totale : 0,
                costo_totale: eseguita ? eseguita.costo_totale : 0
            };
        });

        // Step 2.5: Ordina attività - obbligatorie prima, poi le altre
        attivitaCompleteArray.sort((a, b) => {
            // 1° criterio: Obbligatorie prima delle non-obbligatorie
            if (a.obbligatoria !== b.obbligatoria) {
                return b.obbligatoria ? 1 : -1;
            }

            // 2° criterio: Eseguite prima delle non-eseguite (nello stesso gruppo)
            if (a.eseguita !== b.eseguita) {
                return b.eseguita ? 1 : -1;
            }

            // 3° criterio: Ordine alfabetico per codice
            return a.codice.localeCompare(b.codice);
        });

        // Step 3: Renderizza sezione
        checkAndAddPage(doc, 30);
        addLine(doc);

        addFormattedText(doc, 'Attività Standard:', marginLeft, {
            fontSize: 11,
            fontStyle: 'bold',
            marginBottom: 3
        });

        if (!showCosts) {
            // LAYOUT SENZA COSTI: Lista con checkbox
            doc.setFontSize(8);

            attivitaCompleteArray.forEach(att => {
                const stimaAltezza = att.obbligatoria && !att.eseguita ? 12 : 10;
                checkAndAddPage(doc, stimaAltezza);

                // Sfondo rosso per obbligatorie non eseguite
                if (att.obbligatoria && !att.eseguita) {
                    doc.setFillColor(255, 200, 200);
                    doc.rect(marginLeft + 3, yPosition - 3, contentWidth - 6, 6, 'F');
                }

                // Checkbox
                const checkbox = att.eseguita ? '☑' : '☐';
                doc.text(checkbox, marginLeft + 5, yPosition);

                // Applica grassetto se attività obbligatoria
                if (att.obbligatoria) {
                    doc.setFont(undefined, 'bold');
                } else {
                    doc.setFont(undefined, 'normal');
                }

                // Codice e descrizione
                doc.text(`${att.codice} - ${att.descrizione}`, marginLeft + 12, yPosition);

                // Reset font a normal
                doc.setFont(undefined, 'normal');

                yPosition += 4;

                // Quantità solo se eseguita
                if (att.eseguita) {
                    doc.text(`  Q.tà: ${att.quantita_totale.toFixed(2)} ${att.um}`, marginLeft + 15, yPosition);
                    yPosition += 5;
                } else {
                    yPosition += 3;
                }
            });

            yPosition += 5;
        } else {
            // LAYOUT CON COSTI: Tabella completa
            checkAndAddPage(doc, 15);

            // Header tabella
            doc.setFontSize(7);
            doc.setFont(undefined, 'bold');
            doc.text('✓', marginLeft + 5, yPosition);
            doc.text('Codice', marginLeft + 12, yPosition);
            doc.text('Descrizione', marginLeft + 30, yPosition);
            doc.text('Q.tà', marginLeft + 130, yPosition, { align: 'right' });
            doc.text('Costo Unit.', marginLeft + 155, yPosition, { align: 'right' });
            doc.text('Totale', marginLeft + 185, yPosition, { align: 'right' });

            // DEBUG: Ruler graduato per debug posizionamento colonne
            if (DEBUG_SHOW_RULER) {
                const rulerY = yPosition + 1;
                doc.setFontSize(5);
                doc.setTextColor(255, 0, 0); // Rosso
                doc.setDrawColor(255, 0, 0);

                // Linea orizzontale
                doc.line(marginLeft, rulerY, pageWidth - marginRight, rulerY);

                // Tacche ogni 10mm con etichette posizione
                for (let x = marginLeft; x <= pageWidth - marginRight; x += 10) {
                    doc.line(x, rulerY - 1, x, rulerY + 1);
                    doc.text(`${x}`, x, rulerY + 3, { align: 'center' });
                }

                // Reset colori e font
                doc.setTextColor(0);
                doc.setDrawColor(0);
                doc.setFontSize(7);
            }

            yPosition += 5;

            doc.setFont(undefined, 'normal');

            let totaleCostoAttivita = 0;

            attivitaCompleteArray.forEach(att => {
                // Larghezze colonne (in mm)
                const colCheckboxWidth = 7;    // Spazio per checkbox
                const colCodiceWidth = 18;     // Codice
                const colDescWidth = 65;       // Descrizione (ridotta da 75 a 65mm per evitare overflow emoji)
                const colQtaWidth = 30;        // Quantità
                const colCostoUnitWidth = 25;  // Costo unitario
                const colTotaleWidth = 25;     // Totale

                // Posizioni X (colonne numeriche ottimizzate per spazio)
                const xCheckbox = marginLeft + 6;
                const xCodice = marginLeft + 12;
                const xDesc = marginLeft + 30;
                const xQta = marginLeft + 130;        // Termina a 142mm (130+12)
                const xCostoUnit = marginLeft + 155;  // +5mm rispetto a precedente
                const xTotale = marginLeft + 185;     // +5mm rispetto a precedente

                // Calcola le righe per ogni colonna con testo lungo (senza emoji)
                const codiceLines = doc.splitTextToSize(att.codice, colCodiceWidth);
                const descLines = doc.splitTextToSize(att.descrizione, colDescWidth);

                // Calcola altezza necessaria (numero max di righe tra tutte le colonne)
                const maxLines = Math.max(codiceLines.length, descLines.length);
                const lineHeight = 4; // mm per riga
                const rowHeight = maxLines * lineHeight + 1; // +1mm padding

                // Verifica se c'è spazio sufficiente per la riga
                checkAndAddPage(doc, rowHeight + 2);

                // Sfondo rosso per obbligatorie non eseguite
                if (att.obbligatoria && !att.eseguita) {
                    doc.setFillColor(255, 200, 200);
                    doc.rect(marginLeft + 3, yPosition - 3, contentWidth - 6, rowHeight, 'F');
                }

                // Checkbox - centrata verticalmente
                const checkbox = att.eseguita ? '✓' : '';
                const checkboxY = yPosition + (maxLines * lineHeight) / 2;
                doc.text(checkbox, xCheckbox, checkboxY);

                // Applica grassetto se attività obbligatoria
                if (att.obbligatoria) {
                    doc.setFont(undefined, 'bold');
                }

                // Codice - multiline
                codiceLines.forEach((line, idx) => {
                    doc.text(line, xCodice, yPosition + idx * lineHeight);
                });

                // Descrizione - multiline
                descLines.forEach((line, idx) => {
                    doc.text(line, xDesc, yPosition + idx * lineHeight);
                });

                // Reset font a normal
                doc.setFont(undefined, 'normal');

                // Colonne numeriche - centrate verticalmente
                const valuesY = yPosition + (maxLines * lineHeight) / 2;

                if (att.eseguita) {
                    // Valori per attività eseguite
                    doc.text(`${att.quantita_totale.toFixed(2)} ${att.um}`, xQta, valuesY, { align: 'right' });
                    doc.text(`€${att.costo_unitario.toFixed(2)}`, xCostoUnit, valuesY, { align: 'right' });
                    doc.text(`€${att.costo_totale.toFixed(2)}`, xTotale, valuesY, { align: 'right' });
                    totaleCostoAttivita += att.costo_totale;
                } else {
                    // Testo "(non eseguita)" per attività non eseguite
                    doc.setFont(undefined, 'italic');
                    doc.text('(non eseguita)', xQta, valuesY);
                    doc.setFont(undefined, 'normal');
                }

                yPosition += rowHeight;
            });

            // Riga totale
            yPosition += 2;
            checkAndAddPage(doc, 8);
            doc.setFont(undefined, 'bold');
            doc.text('TOTALE ATTIVITÀ STANDARD:', marginLeft + 12, yPosition);
            doc.text(`€${totaleCostoAttivita.toFixed(2)}`, marginLeft + 185, yPosition, { align: 'right' });
            doc.setFont(undefined, 'normal');
            yPosition += 5;
        }
    }

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

    // Se è in modalità preview, ritorna il PDF come DataURL invece di salvarlo
    if (options.preview) {
        return doc.output('dataurlstring');
    }

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

