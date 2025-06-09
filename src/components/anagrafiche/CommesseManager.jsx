// src/components/Anagrafiche/CommesseManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';

function CommesseManager({ session, clienti }) {
    const [commesse, setCommesse] = useState([]);
    const [loadingActions, setLoadingActions] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [importProgress, setImportProgress] = useState('');

    const [formCodiceCommessa, setFormCodiceCommessa] = useState('');
    const [formDescrizioneCommessa, setFormDescrizioneCommessa] = useState('');
    const [formSelectedClienteId, setFormSelectedClienteId] = useState('');
    const [formStatoCommessa, setFormStatoCommessa] = useState('Aperta');
    const [editingCommessa, setEditingCommessa] = useState(null);

    const userRole = session?.user?.role;
    const canManage = userRole === 'admin' || userRole === 'manager';
    const fileInputRef = useRef(null);

    const fetchCommesse = async () => {
        setPageLoading(true); setError(null);
        const { data, error: fetchError } = await supabase.from('commesse')
            .select(`id, codice_commessa, descrizione_commessa, stato, cliente_id, clienti (id, nome_azienda)`)
            .order('codice_commessa');
        if (fetchError) { setError(fetchError.message); console.error('Errore fetch commesse:', fetchError); }
        else { setCommesse(data || []); }
        setPageLoading(false);
    };

    useEffect(() => {
        if (session && canManage) { fetchCommesse(); }
        else { setCommesse([]); setPageLoading(false); }
    }, [session, canManage]);

    const resetForm = () => { 
        setFormCodiceCommessa(''); setFormDescrizioneCommessa(''); 
        setFormSelectedClienteId(''); setFormStatoCommessa('Aperta'); 
        setEditingCommessa(null); 
    };

    const handleEditCommessa = (commessa) => {
        if (!canManage) { alert("Non hai i permessi."); return; }
        setEditingCommessa(commessa); 
        setFormCodiceCommessa(commessa.codice_commessa);
        setFormDescrizioneCommessa(commessa.descrizione_commessa || ''); 
        setFormSelectedClienteId(commessa.cliente_id || '');
        setFormStatoCommessa(commessa.stato || 'Aperta'); 
        window.scrollTo(0, 0);
    };

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
            await fetchCommesse(); 
            setSuccessMessage(editingCommessa ? 'Commessa modificata!' : 'Commessa aggiunta!'); 
            setTimeout(()=> setSuccessMessage(''), 3000); 
        }
        setLoadingActions(false);
    };

    const handleDeleteCommessa = async (commessaId) => {
        if (!canManage) { alert("Non hai i permessi."); return; }
        if (window.confirm("Sei sicuro di voler eliminare questa commessa?")) {
            setLoadingActions(true); setError(null); setSuccessMessage('');
            const { error: delError } = await supabase.from('commesse').delete().eq('id', commessaId);
            if (delError) { 
                setError(delError.message); 
                alert("Eliminazione fallita: " + delError.message); 
            } else { 
                await fetchCommesse(); 
                if (editingCommessa && editingCommessa.id === commessaId) resetForm(); 
                setSuccessMessage('Commessa eliminata!'); 
                setTimeout(()=> setSuccessMessage(''), 3000); 
            }
            setLoadingActions(false);
        }
    };

    const handleExport = (format = 'csv') => {
        if (!commesse || commesse.length === 0) { alert("Nessun dato da esportare."); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const headers = ["id", "codice_commessa", "descrizione_commessa", "cliente_id", "cliente_nome_azienda", "stato", "created_at"];
        const dataToExport = commesse.map(c => ({
            id: c.id, codice_commessa: c.codice_commessa, descrizione_commessa: c.descrizione_commessa || '',
            cliente_id: c.cliente_id || '', cliente_nome_azienda: c.clienti?.nome_azienda || '', 
            stato: c.stato, created_at: c.created_at
        }));
        try {
            if (format === 'xlsx') { 
                const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
                const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Commesse");
                XLSX.writeFile(workbook, "esportazione_commesse.xlsx");
                setSuccessMessage('Commesse esportate in XLSX!');
            } else { 
                const csvRows = [headers.join(',')];
                for (const row of dataToExport) { const values = headers.map(h => `"${(('' + (row[h] ?? '')).replace(/"/g, '""'))}"`); csvRows.push(values.join(',')); }
                const csvString = csvRows.join('\n'); const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a"); const url = URL.createObjectURL(blob);
                link.setAttribute("href", url); link.setAttribute("download", "esportazione_commesse.csv");
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                setSuccessMessage('Commesse esportate in CSV!');
            }
            setTimeout(()=> setSuccessMessage(''), 3000);
        } catch (expError) { setError("Esportazione fallita: " + expError.message); console.error("Errore esportazione commesse:", expError); }
        setLoadingActions(false);
    };
    
    const normalizeHeader = (header) => String(header || '').trim().toLowerCase().replace(/\s+/g, '_');

    const handleFileSelected = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setLoadingActions(true); setError(null); setSuccessMessage(''); setImportProgress('');
        const reader = new FileReader();
        reader.onload = async (e) => {
            let processedCount = 0; let successCount = 0; let errorCount = 0;
            const errorsDetail = []; let parsedData = [];
            try {
                const fileContent = e.target.result;
                if (file.name.endsWith('.csv')) { /* ... (Papa.parse con normalizeHeader) ... */ }
                else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) { /* ... (XLSX.read e normalizzazione chiavi) ... */ }
                else { throw new Error("Formato file non supportato."); }
                 // Parsing Logic (copied and adapted from ClientiManager, ensure headers match)
                if (file.name.endsWith('.csv')) {
                    const result = Papa.parse(fileContent, { header: true, skipEmptyLines: true, transformHeader: normalizeHeader });
                    if (result.errors.length > 0) throw new Error("Errore CSV: " + result.errors.map(err => err.message).join(", "));
                    parsedData = result.data;
                } else { // XLSX
                    const workbook = XLSX.read(fileContent, { type: 'binary', cellDates: true });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    parsedData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });
                    parsedData = parsedData.map(row => { const normRow = {}; for (const key in row) { normRow[normalizeHeader(key)] = row[key]; } return normRow; });
                }
                if (parsedData.length === 0) { throw new Error("Il file è vuoto o non è stato possibile leggerne i dati."); }
                console.log("Dati letti e normalizzati (Commesse):", parsedData);

                const commessePerUpsert = [];
                for (let i = 0; i < parsedData.length; i++) {
                    const row = parsedData[i];
                    processedCount++;
                    setImportProgress(`Processo riga ${processedCount} di ${parsedData.length}...`);
                    
                    const codiceCommessa = String(row.codice_commessa || '').trim();
                    const clienteNomeAzienda = String(row.cliente_nome_azienda || '').trim();

                    if (!codiceCommessa) {
                        errorsDetail.push(`Riga ${i+1}: codice_commessa mancante.`); errorCount++; continue;
                    }

                    let clienteIdPerCommessa = null;
                    if (row.hasOwnProperty('cliente_id') && String(row.cliente_id || '').trim()) {
                        clienteIdPerCommessa = String(row.cliente_id).trim();
                    } else if (clienteNomeAzienda) { // Lookup cliente by nome_azienda se cliente_id non è fornito
                        const { data: foundCliente, error: clienteLookupErr } = await supabase
                            .from('clienti')
                            .select('id')
                            .eq('nome_azienda', clienteNomeAzienda)
                            .single();
                        if (clienteLookupErr && clienteLookupErr.code !== 'PGRST116') {
                            errorsDetail.push(`Riga ${i+1} (Comm. ${codiceCommessa}): Errore DB lookup cliente "${clienteNomeAzienda}": ${clienteLookupErr.message}`); errorCount++; continue;
                        }
                        if (foundCliente) {
                            clienteIdPerCommessa = foundCliente.id;
                        } else {
                            // Opzione: Creare il cliente se non esiste? Per ora, lo segnaliamo come errore.
                            // Se si volesse creare:
                            // const { data: newCliente, error: newClienteErr } = await supabase.from('clienti').insert({ nome_azienda: clienteNomeAzienda }).select('id').single();
                            // if (newClienteErr) { errorsDetail.push(...); errorCount++; continue; }
                            // clienteIdPerCommessa = newCliente.id;
                            errorsDetail.push(`Riga ${i+1} (Comm. ${codiceCommessa}): Cliente "${clienteNomeAzienda}" non trovato. Importare prima il cliente o fornire cliente_id.`); errorCount++; continue;
                        }
                    }

                    const commessaPayload = { codice_commessa: codiceCommessa };
                    if (row.hasOwnProperty('descrizione_commessa')) commessaPayload.descrizione_commessa = String(row.descrizione_commessa || '').trim() || null;
                    if (clienteIdPerCommessa) commessaPayload.cliente_id = clienteIdPerCommessa;
                    else if (row.hasOwnProperty('cliente_id') && !String(row.cliente_id || '').trim() && clienteNomeAzienda) {
                        // Se cliente_id è esplicitamente vuoto ma c'era un nome azienda, significa che il lookup è fallito
                        // e abbiamo già gestito l'errore sopra. Non impostare cliente_id.
                    } else if (row.hasOwnProperty('cliente_id')) { // Se c'è cliente_id nel file ma non nome_azienda
                        commessaPayload.cliente_id = String(row.cliente_id || '').trim() || null;
                    }


                    if (row.hasOwnProperty('stato')) commessaPayload.stato = String(row.stato || 'Aperta').trim();
                    
                    commessePerUpsert.push(commessaPayload);
                }


                if (commessePerUpsert.length > 0) {
                    console.log("Dati pronti per upsert (Commesse):", commessePerUpsert);
                    const { data, error: upsertError } = await supabase.from('commesse')
                        .upsert(commessePerUpsert, { onConflict: 'codice_commessa' }).select();
                    if (upsertError) { errorsDetail.push(`Errore generale upsert commesse: ${upsertError.message}`); errorCount += commessePerUpsert.length - (data ? data.length : 0); console.error("Err upsert commesse:", upsertError); }
                    else { successCount += data ? data.length : 0; }
                }
                
                let finalMessage = `${successCount} commesse importate/aggiornate.`;
                if (errorCount > 0) { finalMessage += ` ${errorCount} errori.`; setError(`Errori import. ${errorsDetail.slice(0,3).join('; ')}... Vedi console.`); console.error("Err import commesse:", errorsDetail); }
                setSuccessMessage(finalMessage); setTimeout(()=> { setSuccessMessage(''); setError(null); }, 10000);
                await fetchCommesse();

            } catch (parseOrProcessError) { setError("Errore critico import: " + parseOrProcessError.message); console.error("Err critico import commesse:", parseOrProcessError); } 
            finally { setLoadingActions(false); setImportProgress(''); if(fileInputRef.current) fileInputRef.current.value = ""; }
        };
        if (file.name.endsWith('.csv')) reader.readAsText(file); 
        else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) reader.readAsBinaryString(file);
        else { setError("Formato non supportato."); setLoadingActions(false); }
    };
    const triggerFileInput = () => fileInputRef.current?.click();

    if (pageLoading) return <p>Caricamento anagrafica commesse...</p>;
    if (!canManage && session) return <p>Non hai i permessi per gestire questa anagrafica.</p>;
    if (!session && !pageLoading) return <Navigate to="/login" replace />;

    return (
        <div>
            <h2>Anagrafica Commesse Oilsafe</h2>
             {canManage && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap:'wrap' }}>
                    <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelected} style={{ display: 'none' }} ref={fileInputRef} />
                    <button onClick={triggerFileInput} className="button secondary" disabled={loadingActions}> 
                        {loadingActions ? `Importando... ${importProgress}` : 'Importa/Aggiorna Commesse'} 
                    </button>
                    <div style={{display:'flex', gap: '5px'}}>
                        <button onClick={() => handleExport('csv')} className="button secondary small" disabled={loadingActions || commesse.length === 0}> Esporta CSV </button>
                        <button onClick={() => handleExport('xlsx')} className="button secondary small" disabled={loadingActions || commesse.length === 0}> Esporta XLSX </button>
                    </div>
                </div>
            )}
            {importProgress && !loadingActions && <p>{importProgress}</p>}
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
            <h3>Elenco Commesse</h3>
            {commesse.length === 0 && !pageLoading ? (<p>Nessuna commessa trovata.</p>) : (
                <table>
                    <thead><tr><th>Codice</th><th>Descrizione</th><th>Cliente</th><th>Stato</th>{canManage && <th>Azioni</th>}</tr></thead>
                    <tbody>
                        {commesse.map(c => (
                            <tr key={c.id} style={editingCommessa && editingCommessa.id === c.id ? {backgroundColor: '#e6f7ff'} : {}}>
                                <td>{c.codice_commessa}</td><td>{c.descrizione_commessa || '-'}</td><td>{c.clienti?.nome_azienda || 'N/D'}</td><td>{c.stato}</td>
                                {canManage && (<td className="actions">
                                        <button className="button secondary small" onClick={() => handleEditCommessa(c)} disabled={loadingActions}>Modifica</button>
                                        <button className="button danger small" onClick={() => handleDeleteCommessa(c.id)} disabled={loadingActions} style={{marginLeft:'5px'}}>Elimina</button>
                                    </td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
export default CommesseManager;