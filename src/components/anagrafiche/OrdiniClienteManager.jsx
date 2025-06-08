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
        setFormNumeroOrdine(''); 
        setFormDataOrdine(''); 
        setFormDescrizioneOrdine(''); 
        setFormSelectedClienteIdOrdine(''); 
        setFormSelectedCommessaIdOrdine(''); 
        setEditingOrdine(null); 
    };

    const handleEditOrdine = (ordine) => {
        if (!canManage) { alert("Non hai i permessi."); return; }
        setEditingOrdine(ordine); 
        setFormNumeroOrdine(ordine.numero_ordine_cliente);
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
            resetForm(); 
            await fetchOrdini(); 
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
            if (delError) { 
                setError(delError.message); 
                alert("Eliminazione fallita: " + delError.message); 
            } else { 
                await fetchOrdini(); 
                if (editingOrdine && editingOrdine.id === ordineId) resetForm(); 
                setSuccessMessage('Ordine cliente eliminato!'); 
                setTimeout(()=> setSuccessMessage(''), 3000); 
            }
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
            data_ordine: o.data_ordine,
            descrizione_ordine: o.descrizione_ordine || '',
            cliente_id: o.cliente_id,
            cliente_nome_azienda: o.clienti?.nome_azienda || '',
            commessa_id: o.commessa_id || '',
            commessa_codice: o.commesse?.codice_commessa || '',
            created_at: o.created_at
        }));

        try {
            if (format === 'xlsx') { /* ... (logica XLSX) ... */ 
                const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
                const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, worksheet, "OrdiniCliente");
                XLSX.writeFile(workbook, "esportazione_ordini_cliente.xlsx");
                setSuccessMessage('Ordini cliente esportati in XLSX!');
            } else { /* ... (logica CSV) ... */ 
                const csvRows = [headers.join(',')];
                for (const row of dataToExport) { const values = headers.map(h => `"${(('' + (row[h] === null || typeof row[h] === 'undefined' ? '' : row[h])).replace(/"/g, '""'))}"`); csvRows.push(values.join(',')); }
                const csvString = csvRows.join('\n'); const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a"); const url = URL.createObjectURL(blob);
                link.setAttribute("href", url); link.setAttribute("download", "esportazione_ordini_cliente.csv");
                document.body.appendChild(link); link.click(); document.body.removeChild(link);
                setSuccessMessage('Ordini cliente esportati in CSV!');
            }
            setTimeout(()=> setSuccessMessage(''), 3000);
        } catch (expError) { setError("Esportazione fallita: " + expError.message); }
        setLoadingActions(false);
    };

    const handleFileSelected = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setLoadingActions(true); setError(null); setSuccessMessage('');
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const fileContent = e.target.result; let parsedData = [];
                if (file.name.endsWith('.csv')) { /* ... (Papa.parse) ... */ } 
                else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) { /* ... (XLSX.read) ... */ } 
                else { throw new Error("Formato file non supportato."); }

                const datiDaUpsert = parsedData.map(row => {
                    const ordine = {};
                    if(row.hasOwnProperty('numero_ordine_cliente')) ordine.numero_ordine_cliente = row.numero_ordine_cliente?.trim();
                    if(row.hasOwnProperty('data_ordine')) ordine.data_ordine = row.data_ordine?.trim() || null;
                    if(row.hasOwnProperty('descrizione_ordine')) ordine.descrizione_ordine = row.descrizione_ordine?.trim() || null;
                    if(row.hasOwnProperty('cliente_id')) ordine.cliente_id = row.cliente_id?.trim(); 
                    // Per importare tramite nome_azienda_cliente, servirebbe una lookup:
                    // const clienteTrovato = clienti.find(c => c.nome_azienda.toLowerCase() === row.cliente_nome_azienda?.trim().toLowerCase());
                    // if (clienteTrovato) ordine.cliente_id = clienteTrovato.id;
                    // else if (row.cliente_nome_azienda) console.warn(`Cliente "${row.cliente_nome_azienda}" non trovato`);
                    if(row.hasOwnProperty('commessa_id')) ordine.commessa_id = row.commessa_id?.trim() || null;
                    // Per importare tramite codice_commessa, servirebbe lookup
                    return ordine;
                }).filter(item => item.numero_ordine_cliente && item.cliente_id);

                if (datiDaUpsert.length === 0) { setError("Nessun dato valido (richiesti: numero_ordine_cliente, cliente_id)."); setLoadingActions(false); if(fileInputRef.current) fileInputRef.current.value = ""; return; }
                console.log("Dati pronti per upsert (Ordini Cliente):", datiDaUpsert);
                const { data, error: upsertError } = await supabase.from('ordini_cliente')
                    .upsert(datiDaUpsert, { onConflict: 'numero_ordine_cliente' }).select();
                if (upsertError) { setError("Import/Update fallito: " + upsertError.message); console.error("Errore upsert ordini:", upsertError); } 
                else { setSuccessMessage(`${data ? data.length : 0} ordini importati/aggiornati!`); await fetchOrdini(); setTimeout(()=> setSuccessMessage(''), 5000); }
            } catch (parseError) { setError("Errore elaborazione file: " + parseError.message); } 
            finally { setLoadingActions(false); if(fileInputRef.current) fileInputRef.current.value = ""; }
        };
        if (file.name.endsWith('.csv')) reader.readAsText(file); else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) reader.readAsBinaryString(file);
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
                    <button onClick={triggerFileInput} className="button secondary" disabled={loadingActions}> {loadingActions ? 'Attendere...' : 'Importa/Aggiorna Ordini'} </button>
                    <div style={{display:'flex', gap: '5px'}}>
                        <button onClick={() => handleExport('csv')} className="button secondary small" disabled={loadingActions || ordini.length === 0}> Esporta CSV </button>
                        <button onClick={() => handleExport('xlsx')} className="button secondary small" disabled={loadingActions || ordini.length === 0}> Esporta XLSX </button>
                    </div>
                </div>
            )}
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