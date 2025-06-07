// src/utils/pdfGenerator.js
import jsPDF from 'jspdf';
import 'jspdf-autotable'; // Importa l'estensione per le tabelle

// Funzione per caricare un'immagine da URL e convertirla in DataURL
// Questo è necessario perché jspdf lavora meglio con DataURL per le immagini
// o richiede che l'immagine sia già caricata e accessibile nel DOM.
// Per semplicità, questa funzione assume che gli URL delle firme siano accessibili pubblicamente.
// In un caso reale, potresti dover gestire CORS o pre-caricare le immagini.
const loadImageAsDataURL = (url) => {
    return new Promise((resolve, reject) => {
        if (!url) {
            resolve(null); // Nessun URL, nessuna immagine
            return;
        }
        // Se è già un DataURL, restituiscilo
        if (url.startsWith('data:image')) {
            resolve(url);
            return;
        }

        // Per URL esterni, questo può essere problematico a causa di CORS nel browser
        // Una soluzione più robusta potrebbe coinvolgere un proxy server o assicurarsi che le immagini siano servite con header CORS appropriati.
        // Per ora, tentiamo un fetch. Se fallisce, l'immagine non verrà inclusa.
        // Per immagini da Supabase Storage (URL pubblici), dovrebbe funzionare se il bucket è pubblico.
        const img = new Image();
        img.crossOrigin = 'Anonymous'; // Tentativo per CORS
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
                resolve(null); // Fallback se la conversione fallisce
            }
        };
        img.onerror = (err) => {
            console.error(`Errore caricamento immagine da ${url}:`, err);
            resolve(null); // Immagine non caricata
        };
        img.src = url;
    });
};


export const generateFoglioAssistenzaPDF = async (foglioData, interventiData) => {
    if (!foglioData) {
        console.error("Dati del foglio di assistenza mancanti per la generazione PDF.");
        return;
    }

    const doc = new jsPDF();
    let yPosition = 20; // Posizione Y corrente sulla pagina

    // Funzione helper per aggiungere testo e aggiornare yPosition
    const addText = (text, x, y, options = {}) => {
        doc.text(text, x, y, options);
        // Stima approssimativa dell'altezza del testo per l'avanzamento
        // Per testi multiriga o font diversi, questa stima andrebbe migliorata
        const lineHeight = (options.fontSize || 10) / 2.83465 * 1.2; // Converti pt in mm, aggiungi un po' di interlinea
        return y + lineHeight; 
    };
    
    const addLine = (y) => {
        doc.setDrawColor(200, 200, 200); // Grigio chiaro
        doc.line(15, y, doc.internal.pageSize.getWidth() - 15, y);
        return y + 2;
    }


    // --- INTESTAZIONE AZIENDA (Oilsafe S.r.l.) ---
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    yPosition = addText('Oilsafe S.r.l.', 15, yPosition);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    yPosition = addText('Via Esempio 123, 00100 Città (RM)', 15, yPosition);
    yPosition = addText('P.IVA: 01234567890 - Tel: 06 1234567', 15, yPosition);
    yPosition += 5; // Spazio extra

    // --- TITOLO DOCUMENTO ---
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    const titolo = `FOGLIO DI ASSISTENZA N. ${foglioData.numero_foglio || `ID: ${foglioData.id.substring(0,8)}`}`;
    const titoloWidth = doc.getTextWidth(titolo);
    doc.text(titolo, (doc.internal.pageSize.getWidth() - titoloWidth) / 2, yPosition);
    yPosition += 10;
    doc.setFont(undefined, 'normal');


    // --- DATI GENERALI FOGLIO ---
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    yPosition = addText('Dati Generali del Foglio:', 15, yPosition);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    yPosition = addText(`Data Apertura: ${new Date(foglioData.data_apertura_foglio).toLocaleDateString()}`, 15, yPosition);
    yPosition = addText(`Cliente: ${foglioData.clienti?.nome_azienda || 'N/D'}`, 15, yPosition);
    if(foglioData.clienti?.indirizzo) yPosition = addText(`Indirizzo Cliente: ${foglioData.clienti.indirizzo}`, 15, yPosition);
    yPosition = addText(`Referente Richiesta: ${foglioData.referente_cliente_richiesta || 'N/D'}`, 15, yPosition);
    if (foglioData.commesse) yPosition = addText(`Commessa: ${foglioData.commesse.codice_commessa} (${foglioData.commesse.descrizione_commessa || 'N/D'})`, 15, yPosition);
    if (foglioData.ordini_cliente) yPosition = addText(`Ordine Cliente: ${foglioData.ordini_cliente.numero_ordine_cliente} (${foglioData.ordini_cliente.descrizione_ordine || 'N/D'})`, 15, yPosition);
    yPosition = addText(`Stato Foglio: ${foglioData.stato_foglio}`, 15, yPosition);
    if (foglioData.creato_da_user_id) {
        // Potresti voler recuperare il nome dell'utente se hai una tabella `profiles`
        yPosition = addText(`Creato da Utente ID: ${foglioData.creato_da_user_id.substring(0,8)}...`, 15, yPosition);
    }
    yPosition += 5;

    yPosition = addText(`Motivo Intervento Generale:`, 15, yPosition, {maxWidth: doc.internal.pageSize.getWidth() - 30});
    const motivoLines = doc.splitTextToSize(foglioData.motivo_intervento_generale || 'N/D', doc.internal.pageSize.getWidth() - 30);
    doc.text(motivoLines, 15, yPosition);
    yPosition += motivoLines.length * 4; // Stima altezza

    yPosition = addText(`Descrizione Lavoro Generale:`, 15, yPosition, {maxWidth: doc.internal.pageSize.getWidth() - 30});
    const descLavoroLines = doc.splitTextToSize(foglioData.descrizione_lavoro_generale || 'N/D', doc.internal.pageSize.getWidth() - 30);
    doc.text(descLavoroLines, 15, yPosition);
    yPosition += descLavoroLines.length * 4;
    yPosition += 5;


    // --- TABELLA INTERVENTI ---
    if (interventiData && interventiData.length > 0) {
        yPosition = addLine(yPosition);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        yPosition = addText('Dettaglio Interventi Svolti:', 15, yPosition + 3);
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        yPosition += 2;

        const head = [['Data', 'Tecnico', 'Tipo', 'Ore Lavoro', 'Ore Viaggio', 'Km', 'Descrizione Attività', 'Spese']];
        const body = interventiData.map(int => [
            new Date(int.data_intervento_effettivo).toLocaleDateString(),
            int.tecnici ? `${int.tecnici.nome} ${int.tecnici.cognome}` : 'N/D',
            int.tipo_intervento || '-',
            int.ore_lavoro_effettive || '-',
            int.ore_viaggio || '-',
            int.km_percorsi || '-',
            int.descrizione_attivita_svolta_intervento || '-',
            [ (int.vitto ? "V" : ""), (int.autostrada ? "A" : ""), (int.alloggio ? "H" : "") ].filter(Boolean).join('/') || '-'
        ]);

        doc.autoTable({
            startY: yPosition,
            head: head,
            body: body,
            theme: 'striped', // o 'grid', 'plain'
            headStyles: { fillColor: [22, 160, 133] }, // Colore intestazione
            styles: { fontSize: 8, cellPadding: 1.5 },
            columnStyles: {
                6: { cellWidth: 50 }, // Larghezza colonna descrizione attività
            },
            didDrawPage: (data) => { // Per aggiornare yPosition se la tabella va su più pagine
                yPosition = data.cursor.y;
            }
        });
        yPosition += 5; // Spazio dopo la tabella
    } else {
        yPosition = addText('Nessun intervento specifico registrato.', 15, yPosition);
        yPosition += 5;
    }


    // --- MATERIALI E OSSERVAZIONI ---
    yPosition = addLine(yPosition);
    doc.setFontSize(10);
    yPosition = addText(`Materiali Forniti (Generale):`, 15, yPosition + 3, {maxWidth: doc.internal.pageSize.getWidth() - 30});
    const matLines = doc.splitTextToSize(foglioData.materiali_forniti_generale || 'Nessuno', doc.internal.pageSize.getWidth() - 30);
    doc.text(matLines, 15, yPosition);
    yPosition += matLines.length * 4;
    yPosition += 3;

    yPosition = addText(`Osservazioni Generali:`, 15, yPosition, {maxWidth: doc.internal.pageSize.getWidth() - 30});
    const ossLines = doc.splitTextToSize(foglioData.osservazioni_generali || 'Nessuna', doc.internal.pageSize.getWidth() - 30);
    doc.text(ossLines, 15, yPosition);
    yPosition += ossLines.length * 4;
    yPosition += 10;


    // --- FIRME ---
    // Verifica se yPosition è troppo vicina alla fine della pagina
    const checkPageEnd = (neededSpace = 60) => { // Spazio stimato per le firme
        if (yPosition > doc.internal.pageSize.getHeight() - neededSpace) {
            doc.addPage();
            yPosition = 20; // Reset yPosition per la nuova pagina
        }
    };
    checkPageEnd();
    
    yPosition = addLine(yPosition);
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    yPosition = addText('Firme:', 15, yPosition + 5);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');

    const signatureWidth = 60;
    const signatureHeight = 30;
    const signatureYStart = yPosition + 5;
    const signatureXCliente = 20;
    const signatureXTecnico = doc.internal.pageSize.getWidth() - signatureWidth - 20;

    // Carica e aggiungi firma cliente
    yPosition = addText('Firma Cliente:', signatureXCliente, signatureYStart);
    const firmaClienteDataUrl = await loadImageAsDataURL(foglioData.firma_cliente_url);
    if (firmaClienteDataUrl) {
        try {
            doc.addImage(firmaClienteDataUrl, 'PNG', signatureXCliente, signatureYStart + 3, signatureWidth, signatureHeight);
        } catch (e) {
            console.error("Errore aggiunta firma cliente al PDF:", e);
            addText('[Errore caricamento firma cliente]', signatureXCliente, signatureYStart + 10);
        }
    } else {
        addText('[Firma Cliente non disponibile]', signatureXCliente, signatureYStart + 10);
    }

    // Carica e aggiungi firma tecnico
    addText('Firma Tecnico Oilsafe:', signatureXTecnico, signatureYStart);
    const firmaTecnicoDataUrl = await loadImageAsDataURL(foglioData.firma_tecnico_principale_url);
    if (firmaTecnicoDataUrl) {
        try {
            doc.addImage(firmaTecnicoDataUrl, 'PNG', signatureXTecnico, signatureYStart + 3, signatureWidth, signatureHeight);
        } catch (e) {
            console.error("Errore aggiunta firma tecnico al PDF:", e);
             addText('[Errore caricamento firma tecnico]', signatureXTecnico, signatureYStart + 10);
        }
    } else {
        addText('[Firma Tecnico non disponibile]', signatureXTecnico, signatureYStart + 10);
    }
    yPosition = signatureYStart + signatureHeight + 10; // Aggiorna yPosition dopo le firme


    // --- PIÈ DI PAGINA (Numero pagina) ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Pagina ${i} di ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    }

    // --- SALVATAGGIO PDF ---
    const fileName = `FoglioAssistenza_${foglioData.numero_foglio || foglioData.id.substring(0,8)}.pdf`;
    doc.save(fileName);
};