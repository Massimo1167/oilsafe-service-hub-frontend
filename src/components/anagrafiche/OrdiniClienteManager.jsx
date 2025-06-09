// src/components/Anagrafiche/OrdiniClienteManager.jsx
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../supabaseClient';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Navigate } from 'react-router-dom';

function OrdiniClienteManager({ session, clienti, commesse }) { 
    const [ordini, setOrdini] = useState([]);
    const [loadingActions, setLoadingActions] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [importProgress, setImportProgress] = useState('');

    const [formNumeroOrdine, setFormNumeroOrdine] = useState('');
    const [formDataOrdine, setFormDataOrdine] = useState('');
    const [formDescrizioneOrdine, setFormDescrizioneOrdine] = useState('');
    const [formSelectedClienteIdOrdine, setFormSelectedClienteIdOrdine] = useState('');
    const [formSelectedCommessaIdOrdine, setFormSelectedCommessaIdOrdine] = useState('');
    const [editingOrdine, setEditingOrdine] = useState(null);

    const userRole = session?.user?.role;
    const canManage = userRole === 'admin' || userRole === 'manager';
    const fileInputRef = useRef(null);

    const fetchOrdini = async () => {
        setPageLoading(true); setError(null);
        const { data, error: fetchError } = await supabase.from('ordini_cliente')
            .select(`id, numero_ordine_cliente, data_ordine, descrizione_ordine, cliente_id, commessa_id, clienti (id, nome_azienda), commesse (id, codice_commessa)`)
            .order('data_ordine', { ascending: false });
        if (fetchError) { setError(fetchError.message); console.error('Errore fetch ordini:', fetchError); }
        else { setOrdini(data || []); }
        setPageLoading(false);
    };

    useEffect(() => {
        if (session && canManage) { fetchOrdini(); }
        else { setOrdini([]); setPageLoading(false); }
    }, [session, canManage]);

    const resetForm = () => { 
        setFormNumeroOrdine(''); setFormDataOrdine(''); setFormDescrizioneOrdine(''); 
        setFormSelectedClienteIdOrdine(''); setFormSelectedCommessaIdOrdine(''); setEditingOrdine(null); 
    };

    const handleEditOrdine = (ordine) => {
        if (!canManage) { alert("Non hai i permessi."); return; }
        setEditingOrdine(ordine); setFormNumeroOrdine(ordine.numero_ordine_cliente);
        setFormDataOrdine(ordine.data_ordine ? new Date(ordine.data_ordine).toISOString().split('T')[0] : '');
        setFormDescrizioneOrdine(ordine.descrizione_ordine || ''); 
        setFormSelectedClienteIdOrdine(ordine.cliente_id);
        setFormSelectedCommessaIdOrdine(ordine.commessa_id || ''); 
        window.scrollTo(0, 0);
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!canManage) { alert("Non hai i permessi."); return; }
        if (!formNumeroOrdine.trim() || !formSelectedClienteIdOrdine) { alert("Numero ordine e cliente obbligatori."); return; }
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
            resetForm(); await fetchOrdini(); 
            setSuccessMessage(editingOrdine ? 'Ordine cliente modificato!' : 'Ordine cliente aggiunto!'); 
            setTimeout(()=> setSuccessMessage(''), 3000); 
        }
        setLoadingActions(false);
    };

    const handleDeleteOrdine = async (ordineId) => {
        if (!canManage) { alert("Non hai i permessi."); return; }
        if (window.confirm("Sei sicuro di voler eliminare questo ordine cliente?")) {
            setLoadingActions(true); setError(null); setSuccessMessage('');
            const { error: delError } = await supabase.from('ordini_cliente').delete().eq('id', ordineId);
            if (delError) { setError(delError.message); alert("Eliminazione fallita: " + delError.message); }
            else { await fetchOrdini(); if (editingOrdine && editingOrdine.id === ordineId) resetForm(); setSuccessMessage('Ordine cliente eliminato!'); setTimeout(()=> setSuccessMessage(''), 3000); }
            setLoadingActions(false);
        }
    };

    const handleExport = (format = 'csv') => {
        if (!ordini || ordini.length === 0) { alert("Nessun dato da esportare."); return; }
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
                XLSX.writeFile(workbook, "esportazione_ordini_cliente.xlsx");
                setSuccessMessage('Ordini cliente esportati in XLSX!');
            } else { 
                const csvRows = [headers.join(',')];
                for (const row of dataToExport) { const values = headers.map(h => `"${(('' + (row[h] ?? '')).replace(/"/g, '""'))}"`); csvRows.push(values.join(',')); }
                const csvString = csvRows.join('\n'); const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a"); const url = URL.createObjectURL(blob);
                link.setAttribute("href", url); link.setAttribute("download", "esportazione_ordini_cliente.csv");
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                setSuccessMessage('Ordini cliente esportati in CSV!');
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
            let processedCount = 0; let successCount = 0; let errorCount = 0;
            const errorsDetail = []; let parsedData = [];

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
                } else { throw new Error("Formato file non supportato."); }
                
                if (parsedData.length === 0) { throw new Error("Il file è vuoto o non contiene dati validi."); }
                console.log("Dati grezzi letti dal file (Ordini):", parsedData);

                const ordiniPerUpsert = [];

                for (let i = 0; i < parsedData.length; i++) {
                    const row = parsedData[i]; // row ha già chiavi normalizzate
                    processedCount++;
                    setImportProgress(`Processo riga ${processedCount} di ${parsedData.length}...`);

                    const numeroOrdineCliente = String(row.numero_ordine_cliente || '').trim();
                    const clienteNomeAzienda = String(row.cliente_nome_azienda || '').trim();
                    const commessaCodice = String(row.commessa_codice || '').trim();

                    if (!numeroOrdineCliente || !clienteNomeAzienda) {
                        errorsDetail.push(`Riga ${i+1} (Ordine ${numeroOrdineCliente || 'SCONOSCIUTO'}): numero_ordine_cliente o cliente_nome_azienda mancanti.`);
                        errorCount++; continue;
                    }

                    let clienteId = null;
                    let commessaId = null;

                    // 1. Lookup Cliente
                    const { data: existingCliente, error: clienteErr } = await supabase
                        .from('clienti').select('id').eq('nome_azienda', clienteNomeAzienda).single();
                    if (clienteErr && clienteErr.code !== 'PGRST116') {
                        errorsDetail.push(`Riga ${i+1} (Ord. ${numeroOrdineCliente}): Errore DB lookup cliente "${clienteNomeAzienda}": ${clienteErr.message}`); errorCount++; continue;
                    }
                    if (!existingCliente) {
                        errorsDetail.push(`Riga ${i+1} (Ord. ${numeroOrdineCliente}): Cliente "${clienteNomeAzienda}" NON TROVATO. Importare prima il cliente.`); errorCount++; continue;
                    }
                    clienteId = existingCliente.id;

                    // 2. Lookup Commessa (se fornito codice)
                    if (commessaCodice) {
                        const { data: existingCommessa, error: commessaErr } = await supabase
                            .from('commesse').select('id').eq('codice_commessa', commessaCodice).single();
                        if (commessaErr && commessaErr.code !== 'PGRST116') {
                            errorsDetail.push(`Riga ${i+1} (Ord. ${numeroOrdineCliente}): Errore DB lookup commessa "${commessaCodice}": ${commessaErr.message}`); errorCount++; continue;
                        }
                        if (!existingCommessa) {
                            errorsDetail.push(`Riga ${i+1} (Ord. ${numeroOrdineCliente}): Commessa "${commessaCodice}" NON TROVATA. Importare prima la commessa.`); errorCount++; continue;
                        }
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
                    else if (row.hasOwnProperty('commessa_id') && String(row.commessa_id||'').trim()) { // Se c'è un commessa_id diretto nel file
                        ordinePayload.commessa_id = String(row.commessa_id).trim();
                    }
                    
                    ordiniPerUpsert.push(ordinePayload);
                } 

                if (ordiniPerUpsert.length > 0) {
                    console.log("Ordini pronti per upsert finale:", ordiniPerUpsert);
                    const { data, error: upsertError } = await supabase
                        .from('ordini_cliente').upsert(ordiniPerUpsert, { onConflict: 'numero_ordine_cliente' }).select();
                    if (upsertError) { errorsDetail.push(`Errore upsert ordini: ${upsertError.message}`); errorCount += ordiniPerUpsert.length - (data ? data.length : 0); console.error("Err upsert ordini:", upsertError); }
                    successCount = data ? data.length : 0;
                }
                
                let finalMessage = `${successCount} ordini importati/aggiornati.`;
                if (errorCount > 0) { finalMessage += ` ${errorCount} righe con errori.`; setError(`Errori import. ${errorsDetail.slice(0,3).join('; ')}... Vedi console.`); console.error("Dettaglio errori import ordini:", errorsDetail); }
                setSuccessMessage(finalMessage); setTimeout(()=> { setSuccessMessage(''); setError(null); }, 10000);
                await fetchOrdini();

            } catch (parseOrProcessError) { 
                setError("Errore critico import: " + parseOrProcessError.message); 
                console.error("Err critico import ordini:", parseOrProcessError);
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

    const commesseFiltratePerCliente = formSelectedClienteIdOrdine && commesse
        ? commesse.filter(c => c.cliente_id === formSelectedClienteIdOrdine || !c.cliente_id)
        : (commesse || []);

    if (pageLoading) return <p>Caricamento anagrafica ordini cliente...</p>;
    if (!canManage && session) return <p>Non hai i permessi per gestire questa anagrafica.</p>;
    if (!session && !pageLoading) return <Navigate to="/login" replace />;

    return (
        <div>
            <h2>Anagrafica Ordini Cliente</h2>
            {canManage && (
                <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap:'wrap' }}>
                    <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleFileSelected} style={{ display: 'none' }} ref={fileInputRef} />
                    <button onClick={triggerFileInput} className="button secondary" disabled={loadingActions}> 
                        {loadingActions ? `Importando... ${importProgress}` : 'Importa/Aggiorna Ordini'} 
                    </button>
                    <div style={{display:'flex', gap: '5px'}}>
                        <button onClick={() => handleExport('csv')} className="button secondary small" disabled={loadingActions || ordini.length === 0}> Esporta CSV </button>
                        <button onClick={() => handleExport('xlsx')} className="button secondary small" disabled={loadingActions || ordini.length === 0}> Esporta XLSX </button>
                    </div>
                </div>
            )}
            {importProgress && !loadingActions && <p>{importProgress}</p> }
            {successMessage && <p style={{ color: 'green', fontWeight:'bold' }}>{successMessage}</p>}
            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}

            {canManage && (
                <form onSubmit={handleSubmitForm} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>{editingOrdine ? 'Modifica Ordine Cliente' : 'Nuovo Ordine Cliente'}</h3>
                    <div> <label htmlFor="formClienteOrdine">Cliente Associato (Obbligatorio):</label> <select id="formClienteOrdine" value={formSelectedClienteIdOrdine} onChange={e => { setFormSelectedClienteIdOrdine(e.target.value); setFormSelectedCommessaIdOrdine(''); }} required> <option value="">Seleziona Cliente</option> {(clienti || []).map(c => <option key={c.id} value={c.id}>{c.nome_azienda}</option>)} </select> </div>
                    <div> <label htmlFor="formNumeroOrdine">Numero Ordine Cliente:</label> <input type="text" id="formNumeroOrdine" value={formNumeroOrdine} onChange={e => setFormNumeroOrdine(e.target.value)} required /> </div>
                    <div> <label htmlFor="formDataOrdine">Data Ordine:</label> <input type="date" id="formDataOrdine" value={formDataOrdine} onChange={e => setFormDataOrdine(e.target.value)} /> </div>
                    <div> <label htmlFor="formDescrizioneOrdine">Descrizione Ordine:</label> <input type="text" id="formDescrizioneOrdine" value={formDescrizioneOrdine} onChange={e => setFormDescrizioneOrdine(e.target.value)} /> </div>
                    <div> <label htmlFor="formCommessaOrdine">Commessa Oilsafe Associata (Opzionale):</label> <select id="formCommessaOrdine" value={formSelectedCommessaIdOrdine} onChange={e => setFormSelectedCommessaIdOrdine(e.target.value)} disabled={!formSelectedClienteIdOrdine}> <option value="">Nessuna Commessa</option> {commesseFiltratePerCliente.map(c => <option key={c.id} value={c.id}>{c.codice_commessa} - {c.descrizione_commessa}</option>)} </select> </div>
                    <button type="submit" disabled={loadingActions}>{loadingActions ? 'Salvataggio...' : (editingOrdine ? 'Salva Modifiche' : 'Aggiungi Ordine')}</button>
                    {editingOrdine && ( <button type="button" className="secondary" onClick={resetForm} disabled={loadingActions} style={{marginLeft:'10px'}}> Annulla Modifica </button> )}
                </form>
            )}
            <h3>Elenco Ordini Cliente</h3>
            {ordini.length === 0 && !pageLoading ? (<p>Nessun ordine cliente trovato.</p>) : (
                <table>
                    <thead><tr><th>Numero Ordine</th><th>Data</th><th>Cliente</th><th>Commessa</th><th>Descrizione</th>{canManage && <th>Azioni</th>}</tr></thead>
                    <tbody>
                        {ordini.map(o => (
                            <tr key={o.id} style={editingOrdine && editingOrdine.id === o.id ? {backgroundColor: '#e6f7ff'} : {}}>
                                <td>{o.numero_ordine_cliente}</td><td>{o.data_ordine ? new Date(o.data_ordine).toLocaleDateString() : '-'}</td><td>{o.clienti?.nome_azienda || 'N/D'}</td><td>{o.commesse?.codice_commessa || '-'}</td><td>{o.descrizione_ordine || '-'}</td>
                                {canManage && (<td className="actions">
                                        <button className="button secondary small" onClick={() => handleEditOrdine(o)} disabled={loadingActions}>Modifica</button>
                                        <button className="button danger small" onClick={() => handleDeleteOrdine(o.id)} disabled={loadingActions} style={{marginLeft:'5px'}}>Elimina</button>
                                    </td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
export default OrdiniClienteManager;