// src/components/Anagrafiche/OrdiniClienteManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function OrdiniClienteManager({ session, clienti, commesse }) {
    const [ordini, setOrdini] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);

    // Stati per il form
    const [formNumeroOrdine, setFormNumeroOrdine] = useState('');
    const [formDataOrdine, setFormDataOrdine] = useState('');
    const [formDescrizioneOrdine, setFormDescrizioneOrdine] = useState('');
    const [formSelectedClienteIdOrdine, setFormSelectedClienteIdOrdine] = useState('');
    const [formSelectedCommessaIdOrdine, setFormSelectedCommessaIdOrdine] = useState('');
    const [editingOrdine, setEditingOrdine] = useState(null);

    const userRole = session?.user?.role;
    const canManage = userRole === 'admin' || userRole === 'manager';

    const fetchOrdini = async () => {
        setPageLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('ordini_cliente')
            .select(`id, numero_ordine_cliente, data_ordine, descrizione_ordine, cliente_id, commessa_id, clienti (id, nome_azienda), commesse (id, codice_commessa)`)
            .order('data_ordine', { ascending: false });
        if (fetchError) {
            setError(fetchError.message);
            console.error('Errore fetch ordini:', fetchError);
        } else {
            setOrdini(data || []);
        }
        setPageLoading(false);
    };

    useEffect(() => {
        if (session) {
            fetchOrdini();
        } else {
            setOrdini([]);
            setPageLoading(false);
        }
    }, [session]);

    const resetForm = () => {
        setFormNumeroOrdine('');
        setFormDataOrdine('');
        setFormDescrizioneOrdine('');
        setFormSelectedClienteIdOrdine('');
        setFormSelectedCommessaIdOrdine('');
        setEditingOrdine(null);
    };

    const handleEditOrdine = (ordine) => {
        if (!canManage) {
            alert("Non hai i permessi per modificare ordini.");
            return;
        }
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
        if (!canManage) {
            alert("Non hai i permessi per questa operazione.");
            return;
        }
        if (!formNumeroOrdine.trim() || !formSelectedClienteIdOrdine) {
            alert("Numero ordine e cliente sono obbligatori.");
            return;
        }
        setLoading(true);
        setError(null);
        const ordineData = {
            numero_ordine_cliente: formNumeroOrdine,
            data_ordine: formDataOrdine || null,
            descrizione_ordine: formDescrizioneOrdine,
            cliente_id: formSelectedClienteIdOrdine,
            commessa_id: formSelectedCommessaIdOrdine || null,
        };
        let operationError = null;

        if (editingOrdine) {
            const { error: updateError } = await supabase
                .from('ordini_cliente')
                .update(ordineData)
                .eq('id', editingOrdine.id);
            operationError = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('ordini_cliente')
                .insert([ordineData]);
            operationError = insertError;
        }

        if (operationError) {
            setError(operationError.message);
            console.error(editingOrdine ? 'Errore modifica ordine:' : 'Errore inserimento ordine:', operationError);
            alert((editingOrdine ? 'Errore modifica: ' : 'Errore inserimento: ') + operationError.message);
        } else {
            resetForm();
            await fetchOrdini();
            alert(editingOrdine ? "Ordine cliente modificato con successo!" : "Ordine cliente aggiunto con successo!");
        }
        setLoading(false);
    };
    
    const handleDeleteOrdine = async (ordineId) => {
        if (!canManage) {
            alert("Non hai i permessi per eliminare ordini.");
            return;
        }
        if (window.confirm("Sei sicuro di voler eliminare questo ordine cliente?")) {
            setLoading(true);
            setError(null);
            const { error: deleteError } = await supabase.from('ordini_cliente').delete().eq('id', ordineId);
            if (deleteError) {
                setError(deleteError.message);
                console.error("Errore eliminazione ordine:", deleteError);
                alert("Errore durante l'eliminazione: " + deleteError.message);
            } else {
                await fetchOrdini();
                if (editingOrdine && editingOrdine.id === ordineId) {
                    resetForm();
                }
                alert("Ordine cliente eliminato con successo.");
            }
            setLoading(false);
        }
    };

    const commesseFiltratePerCliente = formSelectedClienteIdOrdine && commesse
        ? commesse.filter(c => c.cliente_id === formSelectedClienteIdOrdine || !c.cliente_id)
        : (commesse || []);

    if (pageLoading) {
        return <p>Caricamento anagrafica ordini cliente...</p>;
    }

    return (
        <div>
            <h2>Anagrafica Ordini Cliente</h2>
            {canManage && (
                <form onSubmit={handleSubmitForm} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>{editingOrdine ? 'Modifica Ordine Cliente' : 'Nuovo Ordine Cliente'}</h3>
                    <div>
                        <label htmlFor="formClienteOrdine">Cliente Associato (Obbligatorio):</label>
                        <select id="formClienteOrdine" value={formSelectedClienteIdOrdine} onChange={e => {
                            setFormSelectedClienteIdOrdine(e.target.value);
                            setFormSelectedCommessaIdOrdine(''); 
                        }} required>
                            <option value="">Seleziona Cliente</option>
                            {(clienti || []).map(c => <option key={c.id} value={c.id}>{c.nome_azienda}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="formNumeroOrdine">Numero Ordine Cliente:</label>
                        <input type="text" id="formNumeroOrdine" value={formNumeroOrdine} onChange={e => setFormNumeroOrdine(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="formDataOrdine">Data Ordine:</label>
                        <input type="date" id="formDataOrdine" value={formDataOrdine} onChange={e => setFormDataOrdine(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="formDescrizioneOrdine">Descrizione Ordine:</label>
                        <input type="text" id="formDescrizioneOrdine" value={formDescrizioneOrdine} onChange={e => setFormDescrizioneOrdine(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="formCommessaOrdine">Commessa Oilsafe Associata (Opzionale):</label>
                        <select id="formCommessaOrdine" value={formSelectedCommessaIdOrdine} onChange={e => setFormSelectedCommessaIdOrdine(e.target.value)} disabled={!formSelectedClienteIdOrdine}>
                            <option value="">Nessuna Commessa Specifica</option>
                            {commesseFiltratePerCliente.map(c => <option key={c.id} value={c.id}>{c.codice_commessa} - {c.descrizione_commessa}</option>)}
                        </select>
                    </div>
                    <button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : (editingOrdine ? 'Salva Modifiche' : 'Aggiungi Ordine')}</button>
                    {editingOrdine && (
                        <button type="button" className="secondary" onClick={resetForm} disabled={loading} style={{marginLeft:'10px'}}>
                            Annulla Modifica
                        </button>
                    )}
                </form>
            )}

            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}

            <h3>Elenco Ordini Cliente</h3>
            {ordini.length === 0 && !pageLoading ? (
                 <p>Nessun ordine cliente trovato o non hai i permessi per visualizzarli.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Numero Ordine</th>
                            <th>Data</th>
                            <th>Cliente</th>
                            <th>Commessa</th>
                            <th>Descrizione</th>
                            {canManage && <th>Azioni</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {ordini.map(ordine => (
                            <tr key={ordine.id} style={editingOrdine && editingOrdine.id === ordine.id ? {backgroundColor: '#e6f7ff'} : {}}>
                                <td>{ordine.numero_ordine_cliente}</td>
                                <td>{ordine.data_ordine ? new Date(ordine.data_ordine).toLocaleDateString() : '-'}</td>
                                <td>{ordine.clienti?.nome_azienda || 'N/D'}</td>
                                <td>{ordine.commesse?.codice_commessa || '-'}</td>
                                <td>{ordine.descrizione_ordine || '-'}</td>
                                {canManage && (
                                    <td className="actions">
                                        <button className="secondary" onClick={() => handleEditOrdine(ordine)} disabled={loading}>Modifica</button>
                                        <button className="danger" onClick={() => handleDeleteOrdine(ordine.id)} disabled={loading} style={{marginLeft:'5px'}}>Elimina</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
export default OrdiniClienteManager;