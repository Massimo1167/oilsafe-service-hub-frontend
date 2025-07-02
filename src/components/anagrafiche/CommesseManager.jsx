/**
 * Handles listing and editing of job orders ("commesse") linked to clients.
 * Uses Supabase for CRUD operations and supports import/export through
 * CSV/XLSX files. Requires the list of clients as prop for forms.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';

const RIGHE_PER_PAGINA = 15; // Numero di commesse da visualizzare per pagina

function CommesseManager({ session, clienti }) { // `clienti` prop è usato per il dropdown nel form di modifica/aggiunta
    // --- STATI DEL COMPONENTE ---
    const [commesse, setCommesse] = useState([]); // Lista delle commesse per la pagina corrente
    const [loadingActions, setLoadingActions] = useState(false); // Per operazioni come add, update, delete, import, export
    const [pageLoading, setPageLoading] = useState(true); // Caricamento iniziale della pagina/dati
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [importProgress, setImportProgress] = useState('');

    // Stati per il form di aggiunta/modifica commessa
    const [formCodiceCommessa, setFormCodiceCommessa] = useState('');
    const [formDescrizioneCommessa, setFormDescrizioneCommessa] = useState('');
    const [formSelectedClienteId, setFormSelectedClienteId] = useState('');
    const [formStatoCommessa, setFormStatoCommessa] = useState('Aperta');
    const [editingCommessa, setEditingCommessa] = useState(null); 

    // Stati per la PAGINAZIONE
    const [currentPage, setCurrentPage] = useState(1);
    const [totalCommesse, setTotalCommesse] = useState(0); // Conteggio totale dei record filtrati

    // Stati per i FILTRI LATO SERVER
    const [filtroServerCodice, setFiltroServerCodice] = useState('');
    const [filtroServerDescrizione, setFiltroServerDescrizione] = useState('');
    const [filtroServerClienteNome, setFiltroServerClienteNome] = useState('');
    const [ricercaSbloccata, setRicercaSbloccata] = useState(false);

    // Ruolo utente e permessi
    const userRole = (session?.user?.role || '').trim().toLowerCase();
    const canManage = userRole === 'admin' || userRole === 'manager';

    // Ref per input file e debounce
    const fileInputRef = useRef(null);
    const debounceTimeoutRef = useRef(null);

    // --- FUNZIONI ---

    /**
     * Carica le commesse dal database con paginazione e filtri server-side.
     * Include un join con 'clienti' per visualizzare il nome azienda.
     * Chiede a Supabase il conteggio totale dei record che matchano i filtri.
     */
    const fetchCommesse = useCallback(async () => {
        if (!session || !canManage) { // Se non c'è sessione o l'utente non può gestire, non fare nulla
            setCommesse([]); setTotalCommesse(0); setPageLoading(false); return;
        }

        setPageLoading(true); setError(null);

        if (
            !ricercaSbloccata &&
            ![
                filtroServerCodice,
                filtroServerDescrizione,
                filtroServerClienteNome,
            ].some((f) => f && f.trim().length >= 3)
        ) {
            setCommesse([]);
            setTotalCommesse(0);
            setError('Inserire almeno 3 caratteri in uno dei filtri o sbloccare la ricerca.');
            setPageLoading(false);
            return;
        }

        const from = (currentPage - 1) * RIGHE_PER_PAGINA;
        const to = currentPage * RIGHE_PER_PAGINA - 1;

        // Se l'utente filtra per nome cliente è necessario usare un INNER JOIN
        // su "clienti" per applicare correttamente il filtro server-side.
        let selectColumns =
            'id, codice_commessa, descrizione_commessa, stato, cliente_id, clienti (id, nome_azienda)';
        if (filtroServerClienteNome) {
            selectColumns =
                'id, codice_commessa, descrizione_commessa, stato, cliente_id, clienti!inner (id, nome_azienda)';
        }

        let query = supabase
            .from('commesse')
            .select(selectColumns, { count: 'exact' })
            .order('codice_commessa', { ascending: true })
            .range(from, to);

        // Applica filtri server-side se i valori dei filtri sono presenti
        if (filtroServerCodice) query = query.ilike('codice_commessa', `%${filtroServerCodice}%`);
        if (filtroServerDescrizione) query = query.ilike('descrizione_commessa', `%${filtroServerDescrizione}%`);
        if (filtroServerClienteNome) {
            // Filtrare su una colonna di una tabella joinata (`clienti.nome_azienda`)
            // La sintassi `foreignTable(column).ilike` è per Supabase JS v2+
            // Potrebbe essere necessario un indice sulla colonna `clienti.nome_azienda` per buone performance
            // o una funzione RPC per filtri più complessi su tabelle joinate.
            query = query.ilike('clienti.nome_azienda', `%${filtroServerClienteNome}%`);
        }

        const { data, error: fetchError, count } = await query;

        if (fetchError) { 
            setError(fetchError.message); 
            console.error('Errore fetch commesse:', fetchError); 
            setCommesse([]); setTotalCommesse(0);
        } else { 
            setCommesse(data || []); 
            setTotalCommesse(count || 0); 
        }
        setPageLoading(false);
    }, [session, canManage, currentPage, filtroServerCodice, filtroServerDescrizione, filtroServerClienteNome, ricercaSbloccata]); // Dipendenze dell'hook useCallback

    // useEffect per caricare le commesse quando cambiano i filtri o la pagina, con debounce.
    useEffect(() => {
        if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = setTimeout(() => {
            fetchCommesse();
        }, 500); // Ritardo di 500ms per il debounce
        return () => { if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current); };
    }, [fetchCommesse]); // `fetchCommesse` è ora una dipendenza stabile grazie a useCallback

    // Funzione per cambiare pagina
    const goToPage = (page) => {
        const totalPagesCalculated = Math.ceil(totalCommesse / RIGHE_PER_PAGINA);
        if (page >= 1 && page <= totalPagesCalculated) {
            setCurrentPage(page); // Il cambio di currentPage triggererà il fetchCommesse
        }
    };

    // Handler per i cambi nei campi di filtro testuale (resettano la pagina a 1)
    const handleFiltroCodiceChange = (e) => { setFiltroServerCodice(e.target.value); setCurrentPage(1); };
    const handleFiltroDescrizioneChange = (e) => { setFiltroServerDescrizione(e.target.value); setCurrentPage(1); };
    const handleFiltroClienteChange = (e) => { setFiltroServerClienteNome(e.target.value); setCurrentPage(1); };
    const resetFilters = () => {
        setFiltroServerCodice(''); setFiltroServerDescrizione(''); setFiltroServerClienteNome('');
        setCurrentPage(1); // fetchCommesse verrà triggerato
        setRicercaSbloccata(false);
    };

    // Resetta i campi del form.
    const resetForm = () => { 
        setFormCodiceCommessa(''); setFormDescrizioneCommessa(''); 
        setFormSelectedClienteId(''); setFormStatoCommessa('Aperta'); 
        setEditingCommessa(null); 
    };

    // Prepara il form per la modifica di una commessa.
    const handleEditCommessa = (commessa) => {
        if (!canManage) { alert("Non hai i permessi per modificare."); return; }
        setEditingCommessa(commessa); 
        setFormCodiceCommessa(commessa.codice_commessa);
        setFormDescrizioneCommessa(commessa.descrizione_commessa || ''); 
        setFormSelectedClienteId(commessa.cliente_id || '');
        setFormStatoCommessa(commessa.stato || 'Aperta'); 
        window.scrollTo(0, 0);
    };

    // Gestisce il submit del form (aggiunta o modifica).
    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!canManage) { alert("Non hai i permessi."); return; }
        if (!formCodiceCommessa.trim()) { alert("Codice commessa obbligatorio."); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const commessaData = {
            codice_commessa: formCodiceCommessa.trim(), 
            descrizione_commessa: formDescrizioneCommessa.trim() || null,
            cliente_id: formSelectedClienteId || null, 
            stato: formStatoCommessa,
        };
        let opError;
        if (editingCommessa) { 
            const { error } = await supabase.from('commesse').update(commessaData).eq('id', editingCommessa.id); 
            opError = error; 
        } else { 
            const { error } = await supabase.from('commesse').insert([commessaData]); 
            opError = error; 
        }
        if (opError) { 
            setError(opError.message); 
            alert((editingCommessa ? 'Modifica commessa fallita: ' : 'Inserimento commessa fallito: ') + opError.message); 
        } else { 
            resetForm(); 
            setCurrentPage(1); // Torna alla prima pagina dopo aggiunta/modifica per vedere il record
            await fetchCommesse(); // Ricarica la lista
            setSuccessMessage(editingCommessa ? 'Commessa modificata con successo!' : 'Commessa aggiunta con successo!'); 
            setTimeout(()=> setSuccessMessage(''), 3000); 
        }
        setLoadingActions(false);
    };

    // Gestisce l'eliminazione di una commessa.
    const handleDeleteCommessa = async (commessaId) => {
        if (!canManage) { alert("Non hai i permessi per eliminare."); return; }
        if (window.confirm("Sei sicuro di voler eliminare questa commessa?")) {
            setLoadingActions(true); setError(null); setSuccessMessage('');
            const { error: delError } = await supabase.from('commesse').delete().eq('id', commessaId);
            if (delError) { 
                setError(delError.message); 
                alert("Eliminazione fallita: " + delError.message); 
            } else { 
                // Se l'elemento eliminato era nell'ultima pagina e quella pagina ora è vuota,
                // torna alla pagina precedente se possibile.
                if (commesse.length === 1 && currentPage > 1) {
                    setCurrentPage(currentPage - 1);
                } else {
                    await fetchCommesse(); // Altrimenti ricarica la pagina corrente
                }
                if (editingCommessa && editingCommessa.id === commessaId) resetForm(); 
                setSuccessMessage('Commessa eliminata con successo!'); 
                setTimeout(()=> setSuccessMessage(''), 3000); 
            }
            setLoadingActions(false);
        }
    };

    // Esporta i dati in CSV o XLSX.
    const handleExport = (format = 'csv') => {
        if (!commesse || commesse.length === 0) { alert("Nessun dato da esportare (nella pagina corrente). Esporta tutti i dati se necessario."); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        // Per un export completo, dovremmo fare un fetch di TUTTE le commesse senza paginazione
        // Per ora, esportiamo solo i dati visualizzati nella pagina corrente.
        // Per esportare tutto:
        // const { data: allCommesseData, error: allErr } = await supabase.from('commesse').select(`...`).order('codice_commessa');
        // if(allErr) { /* gestisci errore */ return; }
        // const dataToUse = allCommesseData;

        const headers = ["id_commessa", "codice_commessa", "descrizione_commessa", "cliente_id", "cliente_nome_azienda", "stato", "created_at"];
        const dataToExport = commesse.map(c => ({ // Usa 'commesse' (dati paginati)
            id_commessa: c.id,
            codice_commessa: c.codice_commessa,
            descrizione_commessa: c.descrizione_commessa || '',
            cliente_id: c.cliente_id || '',
            cliente_nome_azienda: c.clienti?.nome_azienda || '', 
            stato: c.stato,
            created_at: c.created_at ? new Date(c.created_at).toLocaleString('it-IT') : ''
        }));
        try {
            if (format === 'xlsx') { 
                const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
                const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Commesse");
                XLSX.writeFile(workbook, "esportazione_commesse_pagCurrent.xlsx");
                setSuccessMessage('Commesse (pagina corrente) esportate in XLSX!');
            } else { 
                const csvRows = [headers.join(',')];
                for (const row of dataToExport) { const values = headers.map(h => `"${(('' + (row[h] ?? '')).replace(/"/g, '""'))}"`); csvRows.push(values.join(',')); }
                const csvString = csvRows.join('\n'); const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a"); const url = URL.createObjectURL(blob);
                link.setAttribute("href", url); link.setAttribute("download", "esportazione_commesse_pagCurrent.csv");
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                URL.revokeObjectURL(url);
                setSuccessMessage('Commesse (pagina corrente) esportate in CSV!');
            }
            setTimeout(()=> setSuccessMessage(''), 3000);
        } catch (expError) { setError("Esportazione fallita: " + expError.message); console.error("Errore esportazione commesse:", expError); }
        setLoadingActions(false);
    };
    
    const normalizeHeader = (header) => String(header || '').trim().toLowerCase().replace(/\s+/g, '_');

    // Gestisce l'importazione da file CSV/XLSX.
    const handleFileSelected = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setLoadingActions(true); setError(null); setSuccessMessage(''); setImportProgress('');
        const reader = new FileReader();
        reader.onload = async (e) => {
            let successCount = 0; let errorCount = 0; const errorsDetail = []; 
            let parsedData = [];
            try {
                const fileContent = e.target.result;
                if (file.name.endsWith('.csv')) { /* ... (Papa.parse con normalizeHeader) ... */ }
                else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) { /* ... (XLSX.read e normalizzazione chiavi) ... */ }
                else { throw new Error("Formato file non supportato."); }
                // Logica di parsing completa
                if (file.name.endsWith('.csv')) {
                    const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true, transformHeader: normalizeHeader });
                    if (result.errors.length > 0) throw new Error("Errore CSV: " + result.errors.map(err => err.message).join(", "));
                    parsedData = result.data;
                } else { 
                    const workbook = XLSX.read(fileContent, { type: 'binary', cellDates: true });
                    const sheetName = workbook.SheetNames[0]; const worksheet = workbook.Sheets[sheetName];
                    parsedData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });
                    parsedData = parsedData.map(row => { const normRow = {}; for (const key in row) { normRow[normalizeHeader(key)] = row[key]; } return normRow; });
                }
                if (parsedData.length === 0) { throw new Error("Il file è vuoto."); }
                
                const commessePerUpsert = [];
                for (let i = 0; i < parsedData.length; i++) {
                    const row = parsedData[i];
                    setImportProgress(`Processo riga ${i + 1} di ${parsedData.length}...`);
                    const codiceCommessa = String(row.codice_commessa || '').trim();
                    const clienteNomeAzienda = String(row.cliente_nome_azienda || '').trim();
                    if (!codiceCommessa) { errorsDetail.push(`Riga ${i+1}: codice_commessa mancante.`); errorCount++; continue; }

                    let clienteIdPerCommessa = String(row.cliente_id || '').trim() || null;
                    if (!clienteIdPerCommessa && clienteNomeAzienda) {
                        const { data: foundCliente } = await supabase.from('clienti').select('id').eq('nome_azienda', clienteNomeAzienda).single();
                        if (foundCliente) clienteIdPerCommessa = foundCliente.id;
                        else { errorsDetail.push(`Riga ${i+1} (Comm. ${codiceCommessa}): Cliente "${clienteNomeAzienda}" NON TROVATO.`); errorCount++; continue; }
                    }

                    const commessaPayload = { codice_commessa: codiceCommessa };
                    if (row.hasOwnProperty('descrizione_commessa')) commessaPayload.descrizione_commessa = String(row.descrizione_commessa || '').trim() || null;
                    if (clienteIdPerCommessa) commessaPayload.cliente_id = clienteIdPerCommessa;
                    if (row.hasOwnProperty('stato')) commessaPayload.stato = String(row.stato || 'Aperta').trim();
                    commessePerUpsert.push(commessaPayload);
                }

                if (commessePerUpsert.length > 0) {
                    const { data, error: upsertError } = await supabase.from('commesse').upsert(commessePerUpsert, { onConflict: 'codice_commessa' }).select();
                    if (upsertError) { errorsDetail.push(`Errore upsert: ${upsertError.message}`); errorCount += commessePerUpsert.length - (data ? data.length : 0); }
                    successCount = data ? data.length : 0;
                }
                
                let finalMessage = `${successCount} commesse processate.`;
                if (errorCount > 0) { finalMessage += ` ${errorCount} errori.`; setError(`Errori import. ${errorsDetail.slice(0,3).join('; ')}... Vedi console.`); console.error("Err import commesse:", errorsDetail); }
                setSuccessMessage(finalMessage); setTimeout(()=> { setSuccessMessage(''); setError(null); }, 10000);
                await fetchCommesse();
            } catch (err) { setError("Errore critico import: " + err.message); console.error("Err critico import commesse:", err); } 
            finally { setLoadingActions(false); setImportProgress(''); if(fileInputRef.current) fileInputRef.current.value = ""; }
        };
        if (file.name.endsWith('.csv')) reader.readAsText(file); 
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) reader.readAsBinaryString(file);
        else { setError("Formato non supportato."); setLoadingActions(false); }
    };
    const triggerFileInput = () => fileInputRef.current?.click();

    // Calcola il numero totale di pagine
    const totalPages = Math.ceil(totalCommesse / RIGHE_PER_PAGINA);

    if (!session && !pageLoading) return <Navigate to="/login" replace />;
    if (!canManage && session && !pageLoading) return <p>Non hai i permessi per gestire questa anagrafica.</p>;

    return (
        <div>
            <h2>Anagrafica Commesse Oilsafe</h2>
             {canManage && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap:'wrap', alignItems:'center' }}>
                    <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelected} style={{ display: 'none' }} ref={fileInputRef} />
                    <button onClick={triggerFileInput} className="button secondary" disabled={loadingActions}> 
                        {loadingActions && importProgress ? importProgress : (loadingActions ? 'Attendere...' : 'Importa/Aggiorna Commesse')} 
                    </button>
                    <div style={{display:'flex', gap: '5px'}}>
                        <button onClick={() => handleExport('csv')} className="button secondary small" disabled={loadingActions || commesse.length === 0}> Esporta CSV (Pag. Corr.) </button>
                        <button onClick={() => handleExport('xlsx')} className="button secondary small" disabled={loadingActions || commesse.length === 0}> Esporta XLSX (Pag. Corr.) </button>
                    </div>
                </div>
            )}

            <div className="filtri-container" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', background: '#f9f9f9' }}>
                <h4>Filtri Ricerca Commesse</h4>
                <div className="filtri-grid">
                    <div> <label htmlFor="filtroCodiceCommessa">Codice Commessa:</label> <input type="text" id="filtroCodiceCommessa" value={filtroServerCodice} onChange={handleFiltroCodiceChange} placeholder="Filtra per codice..."/> </div>
                    <div> <label htmlFor="filtroDescrizioneCommessa">Descrizione:</label> <input type="text" id="filtroDescrizioneCommessa" value={filtroServerDescrizione} onChange={handleFiltroDescrizioneChange} placeholder="Filtra per descrizione..."/> </div>
                    <div> <label htmlFor="filtroClienteNomeCommessa">Nome Cliente:</label> <input type="text" id="filtroClienteNomeCommessa" value={filtroServerClienteNome} onChange={handleFiltroClienteChange} placeholder="Filtra per nome cliente..."/> </div>
                </div>
                <button onClick={resetFilters} className="button secondary" style={{marginTop:'10px'}} disabled={loadingActions || pageLoading}>Azzera Filtri</button>
                {!ricercaSbloccata && (
                    <button onClick={() => setRicercaSbloccata(true)} className="button warning" style={{marginLeft:'10px', marginTop:'10px'}} disabled={loadingActions || pageLoading}>Sblocca Ricerca</button>
                )}
            </div>

            {importProgress && !loadingActions && <p style={{fontStyle:'italic'}}>{importProgress}</p>}
            {successMessage && <p style={{ color: 'green', fontWeight:'bold' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}

            {canManage && (
                <form onSubmit={handleSubmitForm} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>{editingCommessa ? 'Modifica Commessa' : 'Nuova Commessa'}</h3>
                    <div> <label htmlFor="formCodiceCommessa">Codice Commessa:</label> <input type="text" id="formCodiceCommessa" value={formCodiceCommessa} onChange={e => setFormCodiceCommessa(e.target.value)} required /> </div>
                    <div> <label htmlFor="formDescrizioneCommessa">Descrizione Commessa:</label> <input type="text" id="formDescrizioneCommessa" value={formDescrizioneCommessa} onChange={e => setFormDescrizioneCommessa(e.target.value)} /> </div>
                    <div> <label htmlFor="formClienteCommessa">Cliente Associato (Opzionale):</label> 
                        <select id="formClienteCommessa" value={formSelectedClienteId} onChange={e => setFormSelectedClienteId(e.target.value)}> 
                            <option value="">Nessun Cliente</option> 
                            {(clienti || []).map(c => <option key={c.id} value={c.id}>{c.nome_azienda}</option>)} 
                        </select> 
                    </div>
                    <div> <label htmlFor="formStatoCommessa">Stato Commessa:</label> <select id="formStatoCommessa" value={formStatoCommessa} onChange={e => setFormStatoCommessa(e.target.value)}> <option value="Aperta">Aperta</option> <option value="In Lavorazione">In Lavorazione</option> <option value="Chiusa">Chiusa</option> <option value="Annullata">Annullata</option> </select> </div>
                    <button type="submit" disabled={loadingActions}>{loadingActions ? 'Salvataggio...' : (editingCommessa ? 'Salva Modifiche' : 'Aggiungi Commessa')}</button>
                    {editingCommessa && ( <button type="button" className="secondary" onClick={resetForm} disabled={loadingActions} style={{marginLeft:'10px'}}> Annulla Modifica </button> )}
                </form>
            )}

            <h3>Elenco Commesse ({pageLoading ? '...' : totalCommesse} totali)</h3>
            {pageLoading && commesse.length === 0 ? <p>Caricamento commesse...</p> : null}
            {!pageLoading && commesse.length === 0 ? (<p>Nessuna commessa trovata con i filtri applicati.</p>) : (
                <>
                <table>
                    <thead><tr><th>Codice</th><th>Descrizione</th><th>Cliente</th><th>Stato</th>{canManage && <th>Azioni</th>}</tr></thead>
                    <tbody>
                        {commesse.map(c => (
                            <tr key={c.id} style={editingCommessa && editingCommessa.id === c.id ? {backgroundColor: '#e6f7ff'} : {}}>
                                <td>{c.codice_commessa}</td><td>{c.descrizione_commessa || '-'}</td><td>{c.clienti?.nome_azienda || (c.cliente_id ? `ID: ${c.cliente_id.substring(0,8)}...` : 'N/D')}</td><td>{c.stato}</td>
                                {canManage && (<td className="actions">
                                        <button className="button secondary small" onClick={() => handleEditCommessa(c)} disabled={loadingActions}>Mod.</button>
                                        <button className="button danger small" onClick={() => handleDeleteCommessa(c.id)} disabled={loadingActions} style={{marginLeft:'5px'}}>Elim.</button>
                                    </td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {totalPages > 1 && (
                    <div className="pagination-controls">
                        <button
                            onClick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1 || loadingActions || pageLoading}
                        >
                            ‹ Indietro
                        </button>
                        <span> Pagina {currentPage} di {totalPages} </span>
                        <button
                            onClick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages || loadingActions || pageLoading}
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
export default CommesseManager;