// src/components/Anagrafiche/ClientiManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';

const RIGHE_PER_PAGINA_CLIENTI = 15;

function ClientiManager({ session }) {
    const [clienti, setClienti] = useState([]);
    const [loadingActions, setLoadingActions] = useState(false); 
    const [pageLoading, setPageLoading] = useState(true); 
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [importProgress, setImportProgress] = useState('');
    const [filtroNomeAzienda, setFiltroNomeAzienda] = useState('');
    const [ricercaSbloccata, setRicercaSbloccata] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);

    const [formNuovoNomeAzienda, setFormNuovoNomeAzienda] = useState('');
    const [selectedCliente, setSelectedCliente] = useState(null); 
    const [formEditNomeAzienda, setFormEditNomeAzienda] = useState('');
    
    const [indirizziClienteCorrente, setIndirizziClienteCorrente] = useState([]);
    const [loadingIndirizzi, setLoadingIndirizzi] = useState(false);
    const [formNuovoIndirizzoCompleto, setFormNuovoIndirizzoCompleto] = useState('');
    const [formNuovaDescrizioneIndirizzo, setFormNuovaDescrizioneIndirizzo] = useState('');
    
    const [editingIndirizzo, setEditingIndirizzo] = useState(null); 
    const [formEditIndirizzoCompleto, setFormEditIndirizzoCompleto] = useState('');
    const [formEditIndirizzoDescrizione, setFormEditIndirizzoDescrizione] = useState('');

    const userRole = session?.user?.role;
    const canManage = userRole === 'admin' || userRole === 'manager';
    const fileInputRef = useRef(null);

    // --- FUNZIONI CRUD E FETCH (come l'ultima versione completa e corretta) ---
    const fetchClienti = async (nomeFiltro) => {
        if (!ricercaSbloccata && (!nomeFiltro || nomeFiltro.trim().length < 3)) {
            setClienti([]);
            setError('Inserire almeno 3 caratteri o sbloccare la ricerca.');
            setPageLoading(false);
            return;
        }
        setPageLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('clienti')
            .select(
                `id, nome_azienda, created_at, indirizzi_clienti (id, indirizzo_completo, is_default, descrizione)`
            )
            .ilike('nome_azienda', `%${nomeFiltro}%`)
            .order('nome_azienda');
        if (fetchError) { setError(fetchError.message); console.error('Errore fetch clienti:', fetchError); } 
        else { 
            const clientiMappati = (data || []).map(c => {
                const defaultAddr = c.indirizzi_clienti.find(addr => addr.is_default);
                return { ...c, indirizzo_default_visualizzato: defaultAddr?.indirizzo_completo || (c.indirizzi_clienti.length > 0 ? c.indirizzi_clienti[0].indirizzo_completo : '') };
            });
            setClienti(clientiMappati);
            setCurrentPage(1);
        }
        setPageLoading(false);
    };
    useEffect(() => {
        setClienti([]);
        setPageLoading(false);
    }, [session, canManage]);
    useEffect(() => {
        const fetchIndirizzi = async () => {
            if (selectedCliente?.id) {
                setLoadingIndirizzi(true);
                const { data, error: err } = await supabase.from('indirizzi_clienti').select('*').eq('cliente_id', selectedCliente.id).order('is_default', {ascending:false}).order('descrizione');
                if(err) setError("Errore indirizzi: "+err.message); else setIndirizziClienteCorrente(data||[]);
                setLoadingIndirizzi(false);
            } else setIndirizziClienteCorrente([]);
        };
        fetchIndirizzi();
    }, [selectedCliente]);
    const resetFormNuovoCliente = () => setFormNuovoNomeAzienda('');
    const resetFormIndirizzi = () => { setFormNuovoIndirizzoCompleto(''); setFormNuovaDescrizioneIndirizzo(''); setEditingIndirizzo(null); setFormEditIndirizzoCompleto(''); setFormEditIndirizzoDescrizione(''); };
    const handleSelectClienteForManagement = (cliente) => {
        if (!canManage) return;
        if (selectedCliente?.id === cliente.id) { setSelectedCliente(null); setFormEditNomeAzienda(''); resetFormIndirizzi(); }
        else { setSelectedCliente(cliente); setFormEditNomeAzienda(cliente.nome_azienda); resetFormIndirizzi(); }
    };
    const handleAddNuovoCliente = async (e) => { /* ...come prima... */ };
    const handleUpdateNomeClienteSelezionato = async (e) => { /* ...come prima... */ };
    const handleAddIndirizzoCliente = async () => { /* ...come prima... */ };
    const handleDeleteIndirizzoCliente = async (indirizzoId) => { /* ...come prima... */ };
    const handleSetDefaultIndirizzoCliente = async (idDefault) => { /* ...come prima... */ };
    const handleStartEditIndirizzo = (indirizzo) => { /* ...come prima... */ };
    const handleCancelEditIndirizzo = () => { /* ...come prima... */ };
    const handleSaveEditIndirizzo = async () => { /* ...come prima... */ };
    const handleDeleteCliente = async (clienteId) => { /* ...come prima... */ };
    const handleExport = (format = 'csv') => { /* ... (Logica di esportazione completa come l'ultima versione corretta) ... */ };
    const normalizeHeader = (header) => String(header || '').trim().toLowerCase().replace(/\s+/g, '_');
    const triggerFileInput = () => fileInputRef.current?.click();

    const handleSearchClienti = () => {
        setError(null);
        fetchClienti(filtroNomeAzienda.trim());
    };

    const resetFiltro = () => {
        setFiltroNomeAzienda('');
        setClienti([]);
        setError(null);
        setRicercaSbloccata(false);
        setCurrentPage(1);
    };

    // --- NUOVA LOGICA DI IMPORTAZIONE CON FEEDBACK DETTAGLIATO ---
    const handleFileSelected = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setLoadingActions(true); 
        setError(null); 
        setSuccessMessage(''); 
        setImportProgress('Inizio elaborazione file...');

        const reader = new FileReader();
        reader.onload = async (e) => {
            let parsedData = [];
            const errorsDetail = [];
            let processedCount = 0;
            let successfullyUpsertedClienti = 0;
            let successfullyManagedIndirizzi = 0;
            let fileReadError = null;

            try {
                const fileContent = e.target.result; 
                if (file.name.endsWith('.csv')) {
                    const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true, transformHeader: normalizeHeader });
                    if (result.errors.length > 0) {
                        fileReadError = "Errore parsing CSV: " + result.errors.map(err => err.message).join(", ");
                    } else {
                        parsedData = result.data;
                    }
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const workbook = XLSX.read(fileContent, { type: 'binary', cellDates: true });
                    const sheetName = workbook.SheetNames[0]; 
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });
                    parsedData = jsonData.map(row => { 
                        const normRow = {}; 
                        for (const key in row) { normRow[normalizeHeader(key)] = row[key]; } 
                        return normRow; 
                    });
                } else { 
                    fileReadError = "Formato file non supportato. Usare .csv o .xlsx";
                }
                
                if (fileReadError) throw new Error(fileReadError);
                if (parsedData.length === 0) { throw new Error("Il file è vuoto o non contiene dati interpretabili."); }
                
                console.log("Dati letti e normalizzati:", parsedData);
                setImportProgress(`Lette ${parsedData.length} righe. Inizio elaborazione database...`);

                for (let i = 0; i < parsedData.length; i++) {
                    const row = parsedData[i];
                    processedCount++;
                    setImportProgress(`Processo riga ${processedCount} di ${parsedData.length}...`);
                    
                    const nomeAzienda = String(row.nome_azienda || '').trim();
                    const indirizzoCompleto = String(row.indirizzo_default || row.indirizzo || '').trim(); // Cerca 'indirizzo_default' o 'indirizzo'
                    const descIndirizzo = String(row.descrizione_default || row.descrizione_indirizzo || row.descrizione || 'Sede Principale (da import)').trim(); // Cerca più varianti per descrizione

                    if (!nomeAzienda) {
                        errorsDetail.push(`Riga ${i+1}: nome_azienda mancante. Riga saltata.`);
                        continue; 
                    }

                    // 1. Upsert del Cliente
                    const { data: clienteUpserted, error: clienteErr } = await supabase
                        .from('clienti')
                        .upsert({ nome_azienda: nomeAzienda }, { onConflict: 'nome_azienda' })
                        .select('id')
                        .single();
                    
                    if (clienteErr) {
                        errorsDetail.push(`Riga ${i+1} (Cliente "${nomeAzienda}"): Errore DB: ${clienteErr.message}`);
                        console.error(`Errore upsert cliente ${nomeAzienda}:`, clienteErr);
                        continue; // Salta alla prossima riga se l'upsert del cliente fallisce
                    }
                    
                    if (!clienteUpserted) {
                        errorsDetail.push(`Riga ${i+1} (Cliente "${nomeAzienda}"): Upsert cliente non ha restituito un ID.`);
                        continue;
                    }
                    successfullyUpsertedClienti++;
                    
                    // 2. Gestione Indirizzo di Default (se fornito)
                    if (indirizzoCompleto) {
                        // A. Rimuovi il flag is_default da tutti gli altri indirizzi per questo cliente
                        const { error: updateOldDefaultsError } = await supabase
                            .from('indirizzi_clienti')
                            .update({ is_default: false })
                            .eq('cliente_id', clienteUpserted.id)
                            .eq('is_default', true);

                        if (updateOldDefaultsError) {
                            console.warn(`Attenzione per cliente ${nomeAzienda}: Errore nel resettare vecchi indirizzi default - ${updateOldDefaultsError.message}`);
                            // Non blocchiamo per questo, ma lo segnaliamo
                        }

                        // B. Upsert del nuovo (o esistente) indirizzo di default
                        // Per fare un upsert efficace sull'indirizzo, idealmente avremmo un constraint UNIQUE su (cliente_id, indirizzo_completo)
                        // o (cliente_id, descrizione) se la descrizione è univoca per cliente.
                        // Altrimenti, se non c'è un modo univoco per identificare l'indirizzo da aggiornare (oltre al suo ID, che non abbiamo nel CSV),
                        // l'operazione più sicura è cancellare il vecchio default (se diverso) e inserirne uno nuovo.
                        // Qui, proviamo un upsert sull'indirizzo completo, assumendo che sia univoco per cliente.
                        // Se non lo è, potresti avere indirizzi duplicati.
                        // Un'alternativa è: se c'è un indirizzo default, lo si aggiorna, altrimenti si inserisce.
                        const { data: existingDefaultAddr, error: findDefaultErr } = await supabase
                            .from('indirizzi_clienti')
                            .select('id')
                            .eq('cliente_id', clienteUpserted.id)
                            .eq('is_default', true) // Cerchiamo un indirizzo già default
                            .maybeSingle(); // Può restituire null se non trovato

                        if (findDefaultErr && findDefaultErr.code !== 'PGRST116') {
                            console.error(`Errore ricerca indirizzo default esistente per ${nomeAzienda}: ${findDefaultErr.message}`);
                        }

                        let indirizzoOpError;
                        if (existingDefaultAddr) {
                            // Aggiorna l'indirizzo default esistente
                           const { error } = await supabase
                                .from('indirizzi_clienti')
                                .update({ indirizzo_completo: indirizzoCompleto, descrizione: descIndirizzo, is_default: true })
                                .eq('id', existingDefaultAddr.id);
                            indirizzoOpError = error;
                        } else {
                            // Inserisci come nuovo indirizzo default
                            const { error } = await supabase
                                .from('indirizzi_clienti')
                                .insert({
                                    cliente_id: clienteUpserted.id,
                                    indirizzo_completo: indirizzoCompleto,
                                    descrizione: descIndirizzo,
                                    is_default: true
                                });
                            indirizzoOpError = error;
                        }

                        if (indirizzoOpError) {
                            errorsDetail.push(`Riga ${i+1} (Cliente ${nomeAzienda}): Errore gestione indirizzo default - ${indirizzoOpError.message}`);
                            console.warn(`Attenzione per cliente ${nomeAzienda}: Errore gestione indirizzo default - ${indirizzoOpError.message}`);
                        } else {
                            successfullyManagedIndirizzi++;
                        }
                    }
                } // Fine ciclo for

                let finalMessage = `${successfullyUpsertedClienti} clienti processati. ${successfullyManagedIndirizzi} indirizzi di default gestiti.`;
                if (errorsDetail.length > 0) {
                    finalMessage += ` ${errorsDetail.length} righe con errori o avvisi.`;
                    setError(`Errori/Avvisi durante l'importazione: ${errorsDetail.slice(0,3).join('; ')}... Vedi console per tutti i dettagli.`);
                    console.error("Dettaglio errori/avvisi importazione clienti:", errorsDetail);
                }
                setSuccessMessage(finalMessage);
                setTimeout(()=> { setSuccessMessage(''); setError(null); }, 15000); // Più tempo per leggere
                await fetchClienti(filtroNomeAzienda.trim());

            } catch (err) { 
                setError("Errore critico durante l'importazione: " + err.message); 
                console.error("Errore critico importazione clienti:", err); 
            } finally { 
                setLoadingActions(false); 
                setImportProgress('');
                if(fileInputRef.current) fileInputRef.current.value = ""; 
            }
        };
        if (file.name.endsWith('.csv')) reader.readAsText(file); 
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) reader.readAsBinaryString(file);
        else { setError("Formato non supportato."); setLoadingActions(false); }
    };
    

    // ---- RENDER ----
    if (pageLoading) return <p>Caricamento anagrafica clienti...</p>;
    if (!canManage && session) return <p>Non hai i permessi per gestire questa anagrafica.</p>;
    if (!session && !pageLoading) return <Navigate to="/login" replace />;

    const totalPages = Math.ceil(clienti.length / RIGHE_PER_PAGINA_CLIENTI) || 1;
    const displayedClienti = clienti.slice(
        (currentPage - 1) * RIGHE_PER_PAGINA_CLIENTI,
        currentPage * RIGHE_PER_PAGINA_CLIENTI
    );

    return (
        <div>
            <h2>Anagrafica Clienti</h2>
            {canManage && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap:'wrap', alignItems:'center' }}>
                    <input 
                        type="file" 
                        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                        onChange={handleFileSelected} 
                        style={{ display: 'none' }} 
                        ref={fileInputRef} 
                    />
                    <button onClick={triggerFileInput} className="button secondary" disabled={loadingActions}>
                        {loadingActions && importProgress ? importProgress : (loadingActions ? 'Attendere...' : 'Importa/Aggiorna Clienti')}
                    </button>
                    <div style={{display:'flex', gap: '5px'}}>
                        <button onClick={() => handleExport('csv')} className="button secondary small" disabled={loadingActions || clienti.length === 0}> 
                            Esporta CSV 
                        </button>
                        <button onClick={() => handleExport('xlsx')} className="button secondary small" disabled={loadingActions || clienti.length === 0}> 
                            Esporta XLSX 
                        </button>
                    </div>
                </div>
            )}
            
            {successMessage && <p style={{ color: 'green', fontWeight:'bold', border: '1px solid green', padding: '10px', borderRadius:'5px' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red', fontWeight:'bold', border: '1px solid red', padding: '10px', borderRadius:'5px', whiteSpace:'pre-wrap' }}>ERRORE: {error}</p>}

            <div className="filtri-container" style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ddd', borderRadius: '5px', background: '#f9f9f9' }}>
                <h4>Filtro Clienti</h4>
                <div className="filtri-grid" style={{display:'flex', gap:'10px', alignItems:'flex-end'}}>
                    <div>
                        <label htmlFor="filtroNomeCliente">Nome Azienda:</label>
                        <input
                            type="text"
                            id="filtroNomeCliente"
                            value={filtroNomeAzienda}
                            onChange={e => setFiltroNomeAzienda(e.target.value)}
                            placeholder="Min 3 caratteri"
                        />
                    </div>
                    <button onClick={handleSearchClienti} className="button secondary" disabled={loadingActions || pageLoading}>Cerca</button>
                    <button onClick={resetFiltro} className="button secondary" disabled={loadingActions || pageLoading}>Azzera</button>
                    {!ricercaSbloccata && (
                        <button onClick={() => setRicercaSbloccata(true)} className="button warning" disabled={loadingActions || pageLoading}>Sblocca Ricerca</button>
                    )}
                </div>
            </div>

            {canManage && !selectedCliente && (
                <form onSubmit={handleAddNuovoCliente} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px', background:'#f9f9f9' }}>
                    <h3>Nuovo Cliente</h3>
                    <div> 
                        <label htmlFor="formNuovoNomeAzienda">Nome Azienda:</label> 
                        <input type="text" id="formNuovoNomeAzienda" value={formNuovoNomeAzienda} onChange={e => setFormNuovoNomeAzienda(e.target.value)} required /> 
                    </div>
                    <button type="submit" disabled={loadingActions} style={{marginTop:'10px'}} className="button primary">
                        {loadingActions ? 'Creazione...' : 'Crea Nuovo Cliente'}
                    </button>
                </form>
            )}

            <h3>Elenco Clienti</h3>
            {clienti.length === 0 && !pageLoading ? ( <p>Nessun cliente trovato.</p> ) : (
                 <table>
                    <thead>
                        <tr>
                            <th>Nome Azienda</th>
                            <th>Indirizzo Principale</th> 
                            {canManage && <th>Azioni</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedClienti.map(cliente => (
                            <React.Fragment key={cliente.id}>
                                <tr style={selectedCliente && selectedCliente.id === cliente.id ? {backgroundColor: '#e6f7ff', fontWeight:'bold'} : {}}>
                                    <td>{cliente.nome_azienda}</td>
                                    <td>{cliente.indirizzo_default_visualizzato || '-'}</td> 
                                    {canManage && (
                                    <td className="actions">
                                        <button 
                                            className={`button small ${selectedCliente && selectedCliente.id === cliente.id ? 'primary' : 'secondary'}`} 
                                            onClick={() => handleSelectClienteForManagement(cliente)} 
                                            disabled={loadingActions}
                                            title={selectedCliente && selectedCliente.id === cliente.id ? 'Nascondi dettagli e gestione indirizzi' : 'Modifica nome e gestisci indirizzi'}
                                        >
                                            {selectedCliente && selectedCliente.id === cliente.id ? 'Nascondi Dettagli' : 'Gestisci Cliente'}
                                        </button>
                                        <button 
                                            className="button danger small" 
                                            onClick={() => handleDeleteCliente(cliente.id)} 
                                            disabled={loadingActions}
                                            style={{marginLeft:'5px'}}
                                            title="Elimina cliente e tutti i suoi dati associati"
                                        >
                                            Elimina
                                        </button>
                                    </td>
                                    )}
                                </tr>
                                {/* Sezione Dettaglio e Gestione Indirizzi */}
                                {selectedCliente && selectedCliente.id === cliente.id && (
                                    <tr>
                                        <td colSpan={canManage ? 3 : 2} style={{padding: '20px', backgroundColor: '#f0f8ff', borderTop: '2px solid #007bff'}}>
                                            <h4>Gestione Cliente: {selectedCliente.nome_azienda}</h4>
                                            <form onSubmit={handleUpdateNomeClienteSelezionato} style={{display:'flex', gap:'10px', alignItems:'flex-end', marginBottom:'15px', paddingBottom:'15px', borderBottom:'1px dashed #ccc'}}>
                                                <div style={{flexGrow:1}}>
                                                    <label htmlFor={`formEditNomeAzienda-${selectedCliente.id}`}>Modifica Nome Azienda:</label>
                                                    <input style={{width:'100%'}} type="text" id={`formEditNomeAzienda-${selectedCliente.id}`} value={formEditNomeAzienda} onChange={e => setFormEditNomeAzienda(e.target.value)} required />
                                                </div>
                                                <button type="submit" disabled={loadingActions} className="button small primary">Salva Nome</button>
                                            </form>
                                            
                                            <h5>Indirizzi Associati:</h5>
                                            {loadingIndirizzi ? <p>Caricamento indirizzi...</p> : (
                                                indirizziClienteCorrente.length > 0 ? (
                                                    <ul style={{listStyle:'none', padding:0, margin:0}}>
                                                        {indirizziClienteCorrente.map(addr => (
                                                            <li key={addr.id} style={{borderBottom:'1px solid #eee', padding:'10px 0', display:'flex', flexWrap:'wrap', alignItems:'center', gap:'10px'}}>
                                                                {editingIndirizzo && editingIndirizzo.id === addr.id ? (
                                                                    <>
                                                                        <input type="text" value={formEditIndirizzoDescrizione} onChange={e => setFormEditIndirizzoDescrizione(e.target.value)} placeholder="Descrizione" style={{flex:'1 1 150px', padding:'6px', border:'1px solid #ccc', borderRadius:'3px', marginBottom:'5px'}}/>
                                                                        <input type="text" value={formEditIndirizzoCompleto} onChange={e => setFormEditIndirizzoCompleto(e.target.value)} placeholder="Indirizzo completo" required style={{flex:'2 1 250px', padding:'6px', border:'1px solid #ccc', borderRadius:'3px', marginBottom:'5px'}}/>
                                                                        <div style={{display:'flex', gap:'5px', width:'100%', justifyContent:'flex-start', marginTop:'5px'}}>
                                                                            <button onClick={handleSaveEditIndirizzo} className="button success small" disabled={loadingActions}>Salva</button>
                                                                            <button type="button" onClick={handleCancelEditIndirizzo} className="button secondary small" disabled={loadingActions}>Annulla</button>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <div style={{flexGrow:1}}>
                                                                            <strong>{addr.descrizione || 'Indirizzo'}:</strong> {addr.indirizzo_completo}
                                                                            {addr.is_default && <span className="status-badge status-default" style={{marginLeft:'10px'}}>Default</span>}
                                                                        </div>
                                                                        {!addr.is_default && <button onClick={() => handleSetDefaultIndirizzoCliente(addr.id)} className="button outline small" disabled={loadingActions}>Imposta Default</button>}
                                                                        <button onClick={() => handleStartEditIndirizzo(addr)} className="button secondary small" disabled={loadingActions}>Mod.</button>
                                                                        <button onClick={() => handleDeleteIndirizzoCliente(addr.id)} className="button danger small" disabled={loadingActions}>Elim.</button>
                                                                    </>
                                                                )}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                ) : <p>Nessun indirizzo specifico. Aggiungine uno sotto.</p>
                                            )}
                                            
                                            {!editingIndirizzo && ( 
                                                <div style={{marginTop:'20px', paddingTop:'15px', borderTop:'1px solid #ccc'}}>
                                                    <h6>Aggiungi Nuovo Indirizzo a "{selectedCliente.nome_azienda}"</h6>
                                                    <form onSubmit={(e) => {e.preventDefault(); handleAddIndirizzoCliente();}} style={{display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end'}}>
                                                        <div style={{flex:'1 1 200px'}}>
                                                            <label htmlFor={`formNuovaDescrizioneIndirizzo-${selectedCliente.id}`}>Descrizione</label>
                                                            <input type="text" id={`formNuovaDescrizioneIndirizzo-${selectedCliente.id}`} value={formNuovaDescrizioneIndirizzo} onChange={e=> setFormNuovaDescrizioneIndirizzo(e.target.value)} placeholder="Es. Sede Operativa"/>
                                                        </div>
                                                        <div style={{flex:'2 1 300px'}}>
                                                            <label htmlFor={`formNuovoIndirizzoCompleto-${selectedCliente.id}`}>Indirizzo Completo</label>
                                                            <input type="text" id={`formNuovoIndirizzoCompleto-${selectedCliente.id}`} value={formNuovoIndirizzoCompleto} onChange={e=> setFormNuovoIndirizzoCompleto(e.target.value)} placeholder="Via, n°, CAP, Città (Prov)" required />
                                                        </div>
                                                        <button type="submit" disabled={loadingActions} className="button primary">Aggiungi Indirizzo</button>
                                                    </form>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            )}
            {totalPages > 1 && (
                <div className="pagination-controls" style={{ marginTop: '20px', textAlign: 'center' }}>
                    <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1 || loadingActions || pageLoading}
                        className="button small"
                    >
                        Inizio
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1 || loadingActions || pageLoading}
                        className="button small"
                        style={{ marginLeft: '5px' }}
                    >
                        Indietro
                    </button>
                    <span style={{ margin: '0 10px' }}>Pagina {currentPage} di {totalPages}</span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || loadingActions || pageLoading}
                        className="button small"
                    >
                        Avanti
                    </button>
                    <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages || loadingActions || pageLoading}
                        className="button small"
                        style={{ marginLeft: '5px' }}
                    >
                        Fine
                    </button>
                </div>
            )}
        </div>
    );
}
export default ClientiManager;