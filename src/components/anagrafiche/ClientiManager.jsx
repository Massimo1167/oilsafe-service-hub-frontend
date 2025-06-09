// src/components/Anagrafiche/ClientiManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';

function ClientiManager({ session }) {
    const [clienti, setClienti] = useState([]);
    const [loadingActions, setLoadingActions] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [importProgress, setImportProgress] = useState('');

    const [formNomeAzienda, setFormNomeAzienda] = useState('');
    const [formIndirizzo, setFormIndirizzo] = useState('');
    const [editingCliente, setEditingCliente] = useState(null);

    const userRole = session?.user?.role;
    const canManage = userRole === 'admin' || userRole === 'manager';
    const fileInputRef = useRef(null);

    const fetchClienti = async () => {
        setPageLoading(true); setError(null);
        const { data, error: fetchError } = await supabase.from('clienti').select('*').order('nome_azienda');
        if (fetchError) { setError(fetchError.message); console.error('Errore fetch clienti:', fetchError); }
        else { setClienti(data || []); }
        setPageLoading(false);
    };

    useEffect(() => {
        if (session && canManage) { fetchClienti(); }
        else { setClienti([]); setPageLoading(false); }
    }, [session, canManage]);

    const resetForm = () => { setFormNomeAzienda(''); setFormIndirizzo(''); setEditingCliente(null); };
    
    const handleEditCliente = (cliente) => {
        if (!canManage) { alert("Non hai i permessi per modificare."); return; }
        setEditingCliente(cliente);
        setFormNomeAzienda(cliente.nome_azienda);
        setFormIndirizzo(cliente.indirizzo || '');
        window.scrollTo(0, 0);
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!canManage) { alert("Non hai i permessi."); return; }
        if (!formNomeAzienda.trim()) { alert("Nome azienda obbligatorio."); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const clienteData = { nome_azienda: formNomeAzienda.trim(), indirizzo: formIndirizzo.trim() || null };
        let opError;
        if (editingCliente) { const { error } = await supabase.from('clienti').update(clienteData).eq('id', editingCliente.id); opError = error; }
        else { const { error } = await supabase.from('clienti').insert([clienteData]); opError = error; }
        if (opError) { setError(opError.message); alert((editingCliente ? 'Modifica ' : 'Inserimento ') + 'fallito: ' + opError.message); }
        else { resetForm(); await fetchClienti(); setSuccessMessage(editingCliente ? 'Cliente modificato!' : 'Cliente aggiunto!'); setTimeout(()=> setSuccessMessage(''), 3000); }
        setLoadingActions(false);
    };

    const handleDeleteCliente = async (clienteId) => {
        if (!canManage) { alert("Non hai i permessi."); return; }
        if (window.confirm("Eliminare questo cliente?")) {
            setLoadingActions(true); setError(null); setSuccessMessage('');
            const { error: delError } = await supabase.from('clienti').delete().eq('id', clienteId);
            if (delError) { setError(delError.message); alert("Eliminazione fallita: " + delError.message); }
            else { await fetchClienti(); if (editingCliente && editingCliente.id === clienteId) resetForm(); setSuccessMessage('Cliente eliminato!'); setTimeout(()=> setSuccessMessage(''), 3000);}
            setLoadingActions(false);
        }
    };

    const handleExport = (format = 'csv') => {
        if (!clienti || clienti.length === 0) { alert("Nessun dato da esportare."); return; }
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const headers = ["id", "nome_azienda", "indirizzo", "created_at"];
        const dataToExport = clienti.map(c => ({ id: c.id, nome_azienda: c.nome_azienda, indirizzo: c.indirizzo || '', created_at: c.created_at }));
        try {
            if (format === 'xlsx') {
                const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
                const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "Clienti");
                XLSX.writeFile(workbook, "esportazione_clienti.xlsx");
                setSuccessMessage('Clienti esportati in XLSX!');
            } else { 
                const csvRows = [headers.join(',')];
                for (const row of dataToExport) { const values = headers.map(h => `"${(('' + (row[h] ?? '')).replace(/"/g, '""'))}"`); csvRows.push(values.join(',')); }
                const csvString = csvRows.join('\n'); const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a"); const url = URL.createObjectURL(blob);
                link.setAttribute("href", url); link.setAttribute("download", "esportazione_clienti.csv");
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                setSuccessMessage('Clienti esportati in CSV!');
            }
            setTimeout(()=> setSuccessMessage(''), 3000);
        } catch (expError) { setError("Esportazione fallita: " + expError.message); console.error("Errore esportazione:", expError); }
        setLoadingActions(false);
    };
    
    const normalizeHeader = (header) => String(header || '').trim().toLowerCase().replace(/\s+/g, '_');

    const handleFileSelected = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setLoadingActions(true); setError(null); setSuccessMessage(''); setImportProgress('');
        const reader = new FileReader();
        reader.onload = async (e) => {
            let processedCount = 0;
            let successCount = 0;
            let errorCount = 0;
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
                    parsedData = XLSX.utils.sheet_to_json(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' }); // Lascia che xlsx gestisca gli header
                    parsedData = parsedData.map(row => { // Normalizza le chiavi DOPO
                        const normalizedRow = {};
                        for (const key in row) {
                            normalizedRow[normalizeHeader(key)] = row[key];
                        }
                        return normalizedRow;
                    });
                } else { throw new Error("Formato file non supportato."); }
                
                if (parsedData.length === 0) { throw new Error("Il file è vuoto o non è stato possibile leggerne i dati."); }
                console.log("Dati letti e normalizzati (Clienti):", parsedData);

                const datiDaUpsert = parsedData.map(row => {
                    const cliente = {};
                    if (row.hasOwnProperty('nome_azienda')) cliente.nome_azienda = String(row.nome_azienda || '').trim();
                    if (row.hasOwnProperty('indirizzo')) cliente.indirizzo = String(row.indirizzo || '').trim() || null;
                    return cliente;
                }).filter(item => item.nome_azienda); 

                if (datiDaUpsert.length === 0) {
                    setError("Nessun dato valido da importare (richiesto: nome_azienda). Controlla gli header e i dati del file."); 
                    setLoadingActions(false); if(fileInputRef.current) fileInputRef.current.value = ""; return;
                }
                console.log("Dati pronti per upsert (Clienti):", datiDaUpsert);

                // Gestione upsert per blocchi per performance migliori con molti dati
                const batchSize = 100; // Puoi aggiustare questo valore
                for (let i = 0; i < datiDaUpsert.length; i += batchSize) {
                    const batch = datiDaUpsert.slice(i, i + batchSize);
                    setImportProgress(`Processo ${i + batch.length} di ${datiDaUpsert.length}...`);
                    const { data, error: upsertError } = await supabase
                        .from('clienti')
                        .upsert(batch, { onConflict: 'nome_azienda' })
                        .select();
                    if (upsertError) {
                        errorsDetail.push(`Errore upsert batch (righe ${i+1}-${i+batch.length}): ${upsertError.message}`);
                        errorCount += batch.length - (data ? data.length : 0); // Stima
                        console.error("Errore upsert batch clienti:", upsertError);
                    } else {
                        successCount += data ? data.length : 0;
                    }
                }

                let finalMessage = `${successCount} clienti importati/aggiornati.`;
                if (errorCount > 0) {
                    finalMessage += ` ${errorCount} righe con errori.`;
                    setError(`Errori durante l'importazione. ${errorsDetail.slice(0,3).join('; ')}... Vedi console.`);
                    console.error("Dettaglio errori importazione clienti:", errorsDetail);
                }
                setSuccessMessage(finalMessage);
                setTimeout(()=> { setSuccessMessage(''); setError(null); }, 10000);
                await fetchClienti();

            } catch (parseOrProcessError) { 
                setError("Errore critico durante l'importazione: " + parseOrProcessError.message); 
                console.error("Errore critico importazione clienti:", parseOrProcessError);
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
    const triggerFileInput = () => fileInputRef.current?.click();

    if (pageLoading) return <p>Caricamento anagrafica clienti...</p>;
    if (!canManage && session) return <p>Non hai i permessi per gestire questa anagrafica.</p>;
    if (!session && !pageLoading) return <Navigate to="/login" replace />;

    return (
        <div>
            <h2>Anagrafica Clienti</h2>
            {canManage && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap:'wrap' }}>
                    <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelected} style={{ display: 'none' }} ref={fileInputRef} />
                    <button onClick={triggerFileInput} className="button secondary" disabled={loadingActions}>
                        {loadingActions ? `Importando... ${importProgress}` : 'Importa/Aggiorna Clienti'}
                    </button>
                    <div style={{display:'flex', gap: '5px'}}>
                        <button onClick={() => handleExport('csv')} className="button secondary small" disabled={loadingActions || clienti.length === 0}> Esporta CSV </button>
                        <button onClick={() => handleExport('xlsx')} className="button secondary small" disabled={loadingActions || clienti.length === 0}> Esporta XLSX </button>
                    </div>
                </div>
            )}
            {importProgress && !loadingActions && <p>{importProgress}</p> } {/* Mostra il progresso solo se non c'è un caricamento di azione principale */}
            {successMessage && <p style={{ color: 'green', fontWeight:'bold' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}

            {canManage && (
                <form onSubmit={handleSubmitForm} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>{editingCliente ? 'Modifica Cliente' : 'Nuovo Cliente'}</h3>
                    <div> <label htmlFor="formNomeAzienda">Nome Azienda:</label> <input type="text" id="formNomeAzienda" value={formNomeAzienda} onChange={e => setFormNomeAzienda(e.target.value)} required /> </div>
                    <div> <label htmlFor="formIndirizzo">Indirizzo:</label> <input type="text" id="formIndirizzo" value={formIndirizzo} onChange={e => setFormIndirizzo(e.target.value)} /> </div>
                    <button type="submit" disabled={loadingActions}>{loadingActions ? 'Salvataggio...' : (editingCliente ? 'Salva Modifiche' : 'Aggiungi Cliente')}</button>
                    {editingCliente && ( <button type="button" className="secondary" onClick={resetForm} disabled={loadingActions} style={{marginLeft:'10px'}}> Annulla Modifica </button> )}
                </form>
            )}

            <h3>Elenco Clienti</h3>
            {clienti.length === 0 && !pageLoading ? ( <p>Nessun cliente trovato.</p> ) : (
                 <table>
                    <thead><tr><th>Nome Azienda</th><th>Indirizzo</th>{canManage && <th>Azioni</th>}</tr></thead>
                    <tbody>
                        {clienti.map(cliente => (
                            <tr key={cliente.id} style={editingCliente && editingCliente.id === cliente.id ? {backgroundColor: '#e6f7ff'} : {}}>
                                <td>{cliente.nome_azienda}</td><td>{cliente.indirizzo || '-'}</td>
                                {canManage && (<td className="actions">
                                       <button className="button secondary small" onClick={() => handleEditCliente(cliente)} disabled={loadingActions}>Modifica</button>
                                       <button className="button danger small" onClick={() => handleDeleteCliente(cliente.id)} disabled={loadingActions} style={{marginLeft:'5px'}}>Elimina</button>
                                   </td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
export default ClientiManager;