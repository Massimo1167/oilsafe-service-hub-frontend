/**
 * Component to manage customer orders and their relation to clients
 * and job orders. Includes pagination, import/export and CRUD features
 * via Supabase. Visibility depends on user role.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';

const RIGHE_PER_PAGINA_ORDINI = 15; // Costante per il numero di righe per pagina

function OrdiniClienteManager({ session, clienti, commesse }) {
    // --- STATI DEL COMPONENTE ---
    const [ordini, setOrdini] = useState([]); // Lista degli ordini per la pagina corrente
    const [loadingActions, setLoadingActions] = useState(false); // Per operazioni come add, update, delete, import, export
    const [pageLoading, setPageLoading] = useState(true); // Caricamento iniziale della pagina/dati
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [importProgress, setImportProgress] = useState('');

    // Stati per il form di aggiunta/modifica ordine
    const [formNumeroOrdine, setFormNumeroOrdine] = useState('');
    const [formDataOrdine, setFormDataOrdine] = useState('');
    const [formDescrizioneOrdine, setFormDescrizioneOrdine] = useState('');
    const [formSelectedClienteIdOrdine, setFormSelectedClienteIdOrdine] = useState('');
    const [formSelectedCommessaIdOrdine, setFormSelectedCommessaIdOrdine] = useState('');
    const [editingOrdine, setEditingOrdine] = useState(null); 

    // Stati per la PAGINAZIONE
    const [currentPage, setCurrentPage] = useState(1);
    const [totalOrdini, setTotalOrdini] = useState(0); // Conteggio totale dei record filtrati

    // Stati per i FILTRI LATO SERVER
    const [filtroServerNumeroOrdine, setFiltroServerNumeroOrdine] = useState('');
    const [filtroServerClienteNomeOrdine, setFiltroServerClienteNomeOrdine] = useState('');
    const [filtroServerCommessaCodice, setFiltroServerCommessaCodice] = useState('');
    const [ricercaSbloccata, setRicercaSbloccata] = useState(false);

    // Ruolo utente e permessi
    const userRole = session?.user?.role;
    const canManage = userRole === 'admin' || userRole === 'manager';

    // Ref per input file e debounce
    const fileInputRef = useRef(null);
    const debounceTimeoutRef = useRef(null);

    // --- FUNZIONI ---

    /**
     * Carica gli ordini dal database con paginazione e filtri server-side.
     * Include join con 'clienti' e 'commesse' per visualizzare nomi/codici.
     * Richiede il conteggio totale dei record che matchano i filtri per la paginazione.
     */
    const fetchOrdini = useCallback(async () => {
        if (!session || !canManage) { // Se non c'è sessione o l'utente non può gestire
            setOrdini([]); 
            setTotalOrdini(0); 
            setPageLoading(false); 
            return;
        }

        setPageLoading(true);
        setError(null);

        if (
            !ricercaSbloccata &&
            ![
                filtroServerNumeroOrdine,
                filtroServerClienteNomeOrdine,
                filtroServerCommessaCodice,
            ].some((f) => f && f.trim().length >= 3)
        ) {
            setOrdini([]);
            setTotalOrdini(0);
            setError('Inserire almeno 3 caratteri in uno dei filtri o sbloccare la ricerca.');
            setPageLoading(false);
            return;
        }

        const from = (currentPage - 1) * RIGHE_PER_PAGINA_ORDINI;
        const to = currentPage * RIGHE_PER_PAGINA_ORDINI - 1;

        let query = supabase
            .from('ordini_cliente')
            .select(`
                id, numero_ordine_cliente, data_ordine, descrizione_ordine, 
                cliente_id, commessa_id, 
                clienti (id, nome_azienda), 
                commesse (id, codice_commessa)
            `, { count: 'exact' }) // Richiedi il conteggio totale
            .order('data_ordine', { ascending: false }) // Ordina per data ordine discendente
            .order('numero_ordine_cliente', { ascending: true }) // Poi per numero ordine ascendente
            .range(from, to); // Applica paginazione

        // Applica filtri server-side
        if (filtroServerNumeroOrdine) {
            query = query.ilike('numero_ordine_cliente', `%${filtroServerNumeroOrdine}%`);
        }
        if (filtroServerClienteNomeOrdine) {
            // Filtro su colonna joinata 'clienti.nome_azienda'
            // La sintassi per filtri su tabelle relazionate può variare leggermente
            // con le versioni del client Supabase. Questa è per v2+.
            query = query.ilike('clienti.nome_azienda', `%${filtroServerClienteNomeOrdine}%`);
        }
        if (filtroServerCommessaCodice) {
            // Filtro su colonna joinata 'commesse.codice_commessa'
            query = query.ilike('commesse.codice_commessa', `%${filtroServerCommessaCodice}%`);
        }

        const { data, error: fetchError, count } = await query;

        if (fetchError) { 
            setError(fetchError.message); 
            console.error('Errore fetch ordini:', fetchError); 
            setOrdini([]);
            setTotalOrdini(0);
        } else { 
            setOrdini(data || []); 
            setTotalOrdini(count || 0); // Imposta il conteggio totale restituito da Supabase
        }
        setPageLoading(false);
    }, [session, canManage, currentPage, filtroServerNumeroOrdine, filtroServerClienteNomeOrdine, filtroServerCommessaCodice, ricercaSbloccata]); // Dipendenze del useCallback

    // useEffect per caricare gli ordini quando cambiano i filtri o la pagina, con debounce.
    useEffect(() => {
        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }
        debounceTimeoutRef.current = setTimeout(() => {
            fetchOrdini();
        }, 500); // Aspetta 500ms dopo l'ultima digitazione prima di fare il fetch

        return () => { // Funzione di pulizia per il timeout
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [fetchOrdini]); // `fetchOrdini` è ora una dipendenza stabile grazie a useCallback

    // Funzione per navigare tra le pagine
    const goToPage = (page) => {
        const totalPagesCalculated = Math.ceil(totalOrdini / RIGHE_PER_PAGINA_ORDINI);
        if (page >= 1 && page <= totalPagesCalculated) {
            setCurrentPage(page); // Il cambio di currentPage triggererà il fetchOrdini
        }
    };

    // Handler per i cambi nei campi di filtro testuale (resettano la pagina a 1)
    const handleFiltroNumeroOrdineChange = (e) => { setFiltroServerNumeroOrdine(e.target.value); setCurrentPage(1); };
    const handleFiltroClienteNomeOrdineChange = (e) => { setFiltroServerClienteNomeOrdine(e.target.value); setCurrentPage(1); };
    const handleFiltroCommessaCodiceChange = (e) => { setFiltroServerCommessaCodice(e.target.value); setCurrentPage(1); };
    
    // Resetta tutti i filtri e torna alla prima pagina.
    const resetFilters = () => {
        setFiltroServerNumeroOrdine('');
        setFiltroServerClienteNomeOrdine('');
        setFiltroServerCommessaCodice('');
        setCurrentPage(1);
        setRicercaSbloccata(false);
        // fetchOrdini verrà triggerato dall'useEffect a causa del cambio di stato dei filtri (e currentPage)
    };

    // Resetta i campi del form di aggiunta/modifica ordine.
    const resetForm = () => { 
        setFormNumeroOrdine(''); 
        setFormDataOrdine(''); 
        setFormDescrizioneOrdine(''); 
        setFormSelectedClienteIdOrdine(''); 
        setFormSelectedCommessaIdOrdine(''); 
        setEditingOrdine(null); 
    };

    // Prepara il form per la modifica di un ordine esistente.
    const handleEditOrdine = (ordine) => {
        if (!canManage) { alert("Non hai i permessi per modificare."); return; }
        setEditingOrdine(ordine); 
        setFormNumeroOrdine(ordine.numero_ordine_cliente);
        setFormDataOrdine(ordine.data_ordine ? new Date(ordine.data_ordine).toISOString().split('T')[0] : '');
        setFormDescrizioneOrdine(ordine.descrizione_ordine || ''); 
        setFormSelectedClienteIdOrdine(ordine.cliente_id);
        setFormSelectedCommessaIdOrdine(ordine.commessa_id || ''); 
        window.scrollTo(0, 0); // Scrolla in cima per vedere il form
    };

    // Gestisce il submit del form (sia per aggiunta che per modifica di un ordine).
    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!canManage) { alert("Non hai i permessi per questa operazione."); return; }
        if (!formNumeroOrdine.trim() || !formSelectedClienteIdOrdine) { alert("Numero ordine e cliente sono obbligatori."); return; }
        
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const ordineData = {
            numero_ordine_cliente: formNumeroOrdine.trim(), 
            data_ordine: formDataOrdine || null, 
            descrizione_ordine: formDescrizioneOrdine.trim() || null,
            cliente_id: formSelectedClienteIdOrdine, 
            commessa_id: formSelectedCommessaIdOrdine || null,
        };
        let opError;
        if (editingOrdine) { 
            const { error } = await supabase.from('ordini_cliente').update(ordineData).eq('id', editingOrdine.id); 
            opError = error; 
        } else { 
            const { error } = await supabase.from('ordini_cliente').insert([ordineData]); 
            opError = error; 
        }
        if (opError) { 
            setError(opError.message); 
            alert((editingOrdine ? 'Modifica ordine fallita: ' : 'Inserimento ordine fallito: ') + opError.message); 
        } else { 
            resetForm(); 
            setCurrentPage(1); // Torna alla prima pagina dopo aggiunta/modifica per vedere il record
            await fetchOrdini(); // Ricarica la lista
            setSuccessMessage(editingOrdine ? 'Ordine cliente modificato con successo!' : 'Ordine cliente aggiunto con successo!'); 
            setTimeout(()=> setSuccessMessage(''), 3000); 
        }
        setLoadingActions(false);
    };

    // Gestisce l'eliminazione di un ordine cliente.
    const handleDeleteOrdine = async (ordineId) => {
        if (!canManage) { alert("Non hai i permessi per eliminare."); return; }
        if (window.confirm("Sei sicuro di voler eliminare questo ordine cliente?")) {
            setLoadingActions(true); setError(null); setSuccessMessage('');
            const { error: delError } = await supabase.from('ordini_cliente').delete().eq('id', ordineId);
            if (delError) { 
                setError(delError.message); 
                alert("Eliminazione fallita: " + delError.message); 
            } else { 
                if (ordini.length === 1 && currentPage > 1) { // Se era l'ultimo elemento di una pagina > 1
                    setCurrentPage(currentPage - 1); // Torna alla pagina precedente
                } else {
                    await fetchOrdini(); // Altrimenti ricarica la pagina corrente
                }
                if (editingOrdine && editingOrdine.id === ordineId) resetForm(); 
                setSuccessMessage('Ordine cliente eliminato con successo!'); 
                setTimeout(()=> setSuccessMessage(''), 3000); 
            }
            setLoadingActions(false);
        }
    };

    // Esporta i dati degli ordini cliente (solo pagina corrente o tutti i dati, da decidere).
    // Per ora, esporta solo i dati visualizzati nella pagina corrente.
    const handleExport = (format = 'csv') => {
        if (!ordini || ordini.length === 0) { alert("Nessun dato da esportare (nella pagina corrente)."); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const headers = ["id", "numero_ordine_cliente", "data_ordine", "descrizione_ordine", "cliente_id", "cliente_nome_azienda", "commessa_id", "commessa_codice", "created_at"];
        const dataToExport = ordini.map(o => ({
            id: o.id,
            numero_ordine_cliente: o.numero_ordine_cliente,
            data_ordine: o.data_ordine ? new Date(o.data_ordine).toLocaleDateString('it-IT') : '',
            descrizione_ordine: o.descrizione_ordine || '',
            cliente_id: o.cliente_id,
            cliente_nome_azienda: o.clienti?.nome_azienda || '',
            commessa_id: o.commessa_id || '',
            commessa_codice: o.commesse?.codice_commessa || '',
            created_at: o.created_at ? new Date(o.created_at).toLocaleString('it-IT') : ''
        }));
        try {
            if (format === 'xlsx') { 
                const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
                const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "OrdiniCliente");
                XLSX.writeFile(workbook, "esportazione_ordini_cliente_pagCorr.xlsx");
                setSuccessMessage('Ordini cliente (pagina corrente) esportati in XLSX!');
            } else { 
                const csvRows = [headers.join(',')];
                for (const row of dataToExport) { const values = headers.map(h => `"${(('' + (row[h] ?? '')).replace(/"/g, '""'))}"`); csvRows.push(values.join(',')); }
                const csvString = csvRows.join('\n'); const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a"); const url = URL.createObjectURL(blob);
                link.setAttribute("href", url); link.setAttribute("download", "esportazione_ordini_cliente_pagCorr.csv");
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                URL.revokeObjectURL(url);
                setSuccessMessage('Ordini cliente (pagina corrente) esportati in CSV!');
            }
            setTimeout(()=> setSuccessMessage(''), 3000);
        } catch (expError) { setError("Esportazione fallita: " + expError.message); console.error("Errore esportazione ordini:", expError); }
        setLoadingActions(false);
    };
    
    // Normalizza gli header del file importato.
    const normalizeHeader = (header) => String(header || '').trim().toLowerCase().replace(/\s+/g, '_');

    // Gestisce l'importazione da file CSV/XLSX con lookup per cliente e commessa.
    const handleFileSelected = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setLoadingActions(true); setError(null); setSuccessMessage(''); setImportProgress('');
        const reader = new FileReader();
        reader.onload = async (e) => {
            let processedCount = 0; let successCount = 0; let errorCount = 0;
            const errorsDetail = []; 
            let parsedData = [];
            try {
                const fileContent = e.target.result; 
                if (file.name.endsWith('.csv')) {
                    const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true, transformHeader: normalizeHeader });
                    if (result.errors.length > 0) throw new Error("Errore CSV: " + result.errors.map(err => err.message).join(", "));
                    parsedData = result.data;
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const workbook = XLSX.read(fileContent, { type: 'binary', cellDates: true });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    parsedData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });
                    parsedData = parsedData.map(row => { const normRow = {}; for (const key in row) { normRow[normalizeHeader(key)] = row[key]; } return normRow; });
                } else { 
                    throw new Error("Formato file non supportato."); 
                }
                
                if (parsedData.length === 0) { throw new Error("Il file è vuoto o non contiene dati validi."); }
                console.log("Dati grezzi letti dal file (Ordini):", parsedData);

                const ordiniPerUpsert = [];

                for (let i = 0; i < parsedData.length; i++) {
                    const row = parsedData[i];
                    processedCount++;
                    setImportProgress(`Processo riga ${processedCount} di ${parsedData.length}...`);

                    const numeroOrdineCliente = String(row.numero_ordine_cliente || '').trim();
                    const clienteNomeAzienda = String(row.cliente_nome_azienda || '').trim();
                    const commessaCodice = String(row.commessa_codice || '').trim();

                    if (!numeroOrdineCliente || !clienteNomeAzienda) {
                        errorsDetail.push(`Riga ${i+1} (Ordine "${numeroOrdineCliente || 'N/D'}"): numero_ordine_cliente o cliente_nome_azienda mancanti.`);
                        errorCount++; continue;
                    }

                    let clienteId = null;
                    let commessaId = null;

                    // 1. Lookup Cliente
                    const { data: existingCliente, error: clienteErr } = await supabase.from('clienti').select('id').eq('nome_azienda', clienteNomeAzienda).single();
                    if (clienteErr && clienteErr.code !== 'PGRST116') { errorsDetail.push(`R ${i+1} (Ord "${numeroOrdineCliente}"): Err lookup cliente "${clienteNomeAzienda}": ${clienteErr.message}`); errorCount++; continue; }
                    if (!existingCliente) { errorsDetail.push(`R ${i+1} (Ord "${numeroOrdineCliente}"): Cliente "${clienteNomeAzienda}" NON TROVATO.`); errorCount++; continue; }
                    clienteId = existingCliente.id;

                    // 2. Lookup Commessa (se fornito codice)
                    if (commessaCodice) {
                        const { data: existingCommessa, error: commessaErr } = await supabase.from('commesse').select('id').eq('codice_commessa', commessaCodice).single();
                        if (commessaErr && commessaErr.code !== 'PGRST116') { errorsDetail.push(`R ${i+1} (Ord "${numeroOrdineCliente}"): Err lookup commessa "${commessaCodice}": ${commessaErr.message}`); errorCount++; continue; }
                        if (!existingCommessa) { errorsDetail.push(`R ${i+1} (Ord "${numeroOrdineCliente}"): Commessa "${commessaCodice}" NON TROVATA.`); errorCount++; continue; }
                        commessaId = existingCommessa.id;
                    }

                    const ordinePayload = { numero_ordine_cliente: numeroOrdineCliente, cliente_id: clienteId };
                    if (row.hasOwnProperty('data_ordine')) {
                        let dataVal = row.data_ordine;
                        if (typeof dataVal === 'number') { const d = XLSX.SSF.parse_date_code(dataVal); ordinePayload.data_ordine = d ? `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}` : null;}
                        else if (dataVal instanceof Date) { ordinePayload.data_ordine = dataVal.toISOString().split('T')[0];}
                        else { ordinePayload.data_ordine = String(dataVal || '').trim() || null;}
                    }
                    if (row.hasOwnProperty('descrizione_ordine')) ordinePayload.descrizione_ordine = String(row.descrizione_ordine || '').trim() || null;
                    if (commessaId) ordinePayload.commessa_id = commessaId;
                    else if (row.hasOwnProperty('commessa_id') && String(row.commessa_id||'').trim()) {
                        ordinePayload.commessa_id = String(row.commessa_id).trim(); // Usa commessa_id diretto se fornito e lookup per codice fallisce o non c'è codice
                    }
                    ordiniPerUpsert.push(ordinePayload);
                } 

                if (ordiniPerUpsert.length > 0) {
                    console.log("Ordini pronti per upsert finale:", ordiniPerUpsert);
                    const { data, error: upsertError } = await supabase.from('ordini_cliente').upsert(ordiniPerUpsert, { onConflict: 'numero_ordine_cliente' }).select();
                    if (upsertError) { errorsDetail.push(`Errore generale durante l'upsert degli ordini: ${upsertError.message}`); errorCount += ordiniPerUpsert.length - (data ? data.length : 0); console.error("Err upsert ordini:", upsertError); }
                    successCount = data ? data.length : 0;
                }
                
                let finalMessage = `${successCount} ordini importati/aggiornati.`;
                if (errorCount > 0) { finalMessage += ` ${errorCount} righe con errori o avvisi.`; setError(`Errori/Avvisi durante l'importazione: ${errorsDetail.slice(0,3).join('; ')}... Vedi console.`); console.error("Dettaglio errori/avvisi importazione ordini:", errorsDetail); }
                setSuccessMessage(finalMessage); setTimeout(()=> { setSuccessMessage(''); setError(null); }, 10000);
                setCurrentPage(1); // Torna alla prima pagina dopo l'importazione
                await fetchOrdini();
            } catch (parseOrProcessError) { 
                setError("Errore critico durante l'importazione: " + parseOrProcessError.message); 
                console.error("Errore critico importazione ordini:", parseOrProcessError);
            } finally { 
                setLoadingActions(false); setImportProgress('');
                if(fileInputRef.current) fileInputRef.current.value = ""; 
            }
        };
        if (file.name.endsWith('.csv')) reader.readAsText(file); 
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) reader.readAsBinaryString(file);
        else { setError("Formato non supportato."); setLoadingActions(false); }
    };

    const triggerFileInput = () => fileInputRef.current?.click();

    // Filtra le commesse disponibili per il cliente selezionato nel form manuale
    const commesseFiltratePerClienteForm = formSelectedClienteIdOrdine && commesse
        ? commesse.filter(c => c.cliente_id === formSelectedClienteIdOrdine || !c.cliente_id)
        : (commesse || []);
    
    // Calcola il numero totale di pagine
    const totalPages = Math.ceil(totalOrdini / RIGHE_PER_PAGINA_ORDINI);

    if (pageLoading && ordini.length === 0 && currentPage === 1) return <p>Caricamento anagrafica ordini cliente...</p>; // Mostra solo al primo caricamento
    if (!canManage && session && !pageLoading) return <p>Non hai i permessi per gestire questa anagrafica.</p>;
    if (!session && !pageLoading) return <Navigate to="/login" replace />;

    return (
        <div>
            <h2>Anagrafica Ordini Cliente</h2>
            {canManage && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap:'wrap', alignItems:'center' }}>
                    <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelected} style={{ display: 'none' }} ref={fileInputRef} />
                    <button onClick={triggerFileInput} className="button secondary" disabled={loadingActions}> 
                        {loadingActions && importProgress ? importProgress : (loadingActions ? 'Attendere...' : 'Importa/Aggiorna Ordini')} 
                    </button>
                    <div style={{display:'flex', gap: '5px'}}>
                        <button onClick={() => handleExport('csv')} className="button secondary small" disabled={loadingActions || ordini.length === 0}> Esporta CSV (Pag. Corr.) </button>
                        <button onClick={() => handleExport('xlsx')} className="button secondary small" disabled={loadingActions || ordini.length === 0}> Esporta XLSX (Pag. Corr.) </button>
                    </div>
                </div>
            )}
            
            {/* Filtri Server-Side */}
            <div className="filtri-container" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', background: '#f9f9f9' }}>
                <h4>Filtri Ricerca Ordini</h4>
                <div className="filtri-grid">
                    <div><label htmlFor="filtroNumOrdine">Numero Ordine:</label><input type="text" id="filtroNumOrdine" value={filtroServerNumeroOrdine} onChange={handleFiltroNumeroOrdineChange} placeholder="Filtra per numero..."/></div>
                    <div><label htmlFor="filtroNomeClienteOrdine">Nome Cliente:</label><input type="text" id="filtroNomeClienteOrdine" value={filtroServerClienteNomeOrdine} onChange={handleFiltroClienteNomeOrdineChange} placeholder="Filtra per cliente..."/></div>
                    <div><label htmlFor="filtroCodCommessaOrdine">Codice Commessa:</label><input type="text" id="filtroCodCommessaOrdine" value={filtroServerCommessaCodice} onChange={handleFiltroCommessaCodiceChange} placeholder="Filtra per commessa..."/></div>
                </div>
                <button onClick={resetFilters} className="button secondary" style={{marginTop:'10px'}} disabled={loadingActions || pageLoading}>Azzera Filtri</button>
                {!ricercaSbloccata && (
                    <button onClick={() => setRicercaSbloccata(true)} className="button warning" style={{marginLeft:'10px', marginTop:'10px'}} disabled={loadingActions || pageLoading}>Sblocca Ricerca</button>
                )}
            </div>


            {importProgress && !loadingActions && <p style={{fontStyle:'italic'}}>{importProgress}</p> }
            {successMessage && <p style={{ color: 'green', fontWeight:'bold' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red', fontWeight:'bold', whiteSpace:'pre-wrap' }}>ERRORE: {error}</p>}

            {canManage && (
                <form onSubmit={handleSubmitForm} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>{editingOrdine ? 'Modifica Ordine Cliente' : 'Nuovo Ordine Cliente'}</h3>
                    <div> <label htmlFor="formClienteOrdine">Cliente Associato (Obbligatorio):</label> <select id="formClienteOrdine" value={formSelectedClienteIdOrdine} onChange={e => { setFormSelectedClienteIdOrdine(e.target.value); setFormSelectedCommessaIdOrdine(''); }} required> <option value="">Seleziona Cliente</option> {(clienti || []).map(c => <option key={c.id} value={c.id}>{c.nome_azienda}</option>)} </select> </div>
                    <div> <label htmlFor="formNumeroOrdine">Numero Ordine Cliente:</label> <input type="text" id="formNumeroOrdine" value={formNumeroOrdine} onChange={e => setFormNumeroOrdine(e.target.value)} required /> </div>
                    <div> <label htmlFor="formDataOrdine">Data Ordine:</label> <input type="date" id="formDataOrdine" value={formDataOrdine} onChange={e => setFormDataOrdine(e.target.value)} /> </div>
                    <div> <label htmlFor="formDescrizioneOrdine">Descrizione Ordine:</label> <input type="text" id="formDescrizioneOrdine" value={formDescrizioneOrdine} onChange={e => setFormDescrizioneOrdine(e.target.value)} /> </div>
                    <div> <label htmlFor="formCommessaOrdine">Commessa Oilsafe Associata (Opzionale):</label> <select id="formCommessaOrdine" value={formSelectedCommessaIdOrdine} onChange={e => setFormSelectedCommessaIdOrdine(e.target.value)} disabled={!formSelectedClienteIdOrdine}> <option value="">Nessuna Commessa</option> {commesseFiltratePerClienteForm.map(c => <option key={c.id} value={c.id}>{c.codice_commessa} - {c.descrizione_commessa}</option>)} </select> </div>
                    <button type="submit" disabled={loadingActions}>{loadingActions ? 'Salvataggio...' : (editingOrdine ? 'Salva Modifiche' : 'Aggiungi Ordine')}</button>
                    {editingOrdine && ( <button type="button" className="secondary" onClick={resetForm} disabled={loadingActions} style={{marginLeft:'10px'}}> Annulla Modifica </button> )}
                </form>
            )}
            <h3>Elenco Ordini Cliente ({pageLoading ? '...' : totalOrdini} totali)</h3>
            {pageLoading && ordini.length === 0 ? <p>Caricamento ordini...</p> : null}
            {!pageLoading && ordini.length === 0 ? (<p>Nessun ordine cliente trovato con i filtri applicati.</p>) : (
                <>
                <table>
                    <thead><tr><th>Numero Ordine</th><th>Data</th><th>Cliente</th><th>Commessa</th><th>Descrizione</th>{canManage && <th>Azioni</th>}</tr></thead>
                    <tbody>
                        {ordini.map(o => (
                            <tr key={o.id} style={editingOrdine && editingOrdine.id === o.id ? {backgroundColor: '#e6f7ff'} : {}}>
                                <td>{o.numero_ordine_cliente}</td><td>{o.data_ordine ? new Date(o.data_ordine).toLocaleDateString() : '-'}</td><td>{o.clienti?.nome_azienda || 'N/D'}</td><td>{o.commesse?.codice_commessa || '-'}</td><td>{o.descrizione_ordine || '-'}</td>
                                {canManage && (<td className="actions">
                                        <button className="button secondary small" onClick={() => handleEditOrdine(o)} disabled={loadingActions}>Mod.</button>
                                        <button className="button danger small" onClick={() => handleDeleteOrdine(o.id)} disabled={loadingActions} style={{marginLeft:'5px'}}>Elim.</button>
                                    </td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div className="pagination-controls" style={{ marginTop: '20px', textAlign: 'center' }}>
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1 || loadingActions || pageLoading}
                            className="button small"
                        >
                            ‹ Indietro
                        </button>
                        <span style={{ margin: '0 10px' }}> Pagina {currentPage} di {totalPages} </span>
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages || loadingActions || pageLoading}
                            className="button small"
                        >
                            Avanti ›
                        </button>
                    </div>
                )}
                </>
            )}
        </div>
    );
}
export default OrdiniClienteManager;