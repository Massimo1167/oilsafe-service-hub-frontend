// src/components/Anagrafiche/CommesseManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function CommesseManager({ session, clienti }) {
    const [commesse, setCommesse] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);

    // Stati per il form
    const [formCodiceCommessa, setFormCodiceCommessa] = useState('');
    const [formDescrizioneCommessa, setFormDescrizioneCommessa] = useState('');
    const [formSelectedClienteId, setFormSelectedClienteId] = useState('');
    const [formStatoCommessa, setFormStatoCommessa] = useState('Aperta');
    const [editingCommessa, setEditingCommessa] = useState(null);

    const userRole = session?.user?.role;
    const canManage = userRole === 'admin' || userRole === 'manager';

    const fetchCommesse = async () => {
        setPageLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('commesse')
            .select(`id, codice_commessa, descrizione_commessa, stato, cliente_id, clienti (id, nome_azienda)`)
            .order('codice_commessa');
        if (fetchError) {
            setError(fetchError.message);
            console.error('Errore fetch commesse:', fetchError);
        } else {
            setCommesse(data || []);
        }
        setPageLoading(false);
    };

    useEffect(() => {
        if (session) {
            fetchCommesse();
        } else {
            setCommesse([]);
            setPageLoading(false);
        }
    }, [session]);

    const resetForm = () => {
        setFormCodiceCommessa('');
        setFormDescrizioneCommessa('');
        setFormSelectedClienteId('');
        setFormStatoCommessa('Aperta');
        setEditingCommessa(null);
    };

    const handleEditCommessa = (commessa) => {
        if (!canManage) {
            alert("Non hai i permessi per modificare commesse.");
            return;
        }
        setEditingCommessa(commessa);
        setFormCodiceCommessa(commessa.codice_commessa);
        setFormDescrizioneCommessa(commessa.descrizione_commessa || '');
        setFormSelectedClienteId(commessa.cliente_id || '');
        setFormStatoCommessa(commessa.stato || 'Aperta');
        window.scrollTo(0, 0);
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!canManage) {
            alert("Non hai i permessi per questa operazione.");
            return;
        }
        if (!formCodiceCommessa.trim()) {
            alert("Il codice commessa è obbligatorio.");
            return;
        }
        setLoading(true);
        setError(null);
        const commessaData = {
            codice_commessa: formCodiceCommessa,
            descrizione_commessa: formDescrizioneCommessa,
            cliente_id: formSelectedClienteId || null,
            stato: formStatoCommessa,
        };
        let operationError = null;

        if (editingCommessa) {
            const { error: updateError } = await supabase
                .from('commesse')
                .update(commessaData)
                .eq('id', editingCommessa.id);
            operationError = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('commesse')
                .insert([commessaData]);
            operationError = insertError;
        }

        if (operationError) {
            setError(operationError.message);
            console.error(editingCommessa ? 'Errore modifica commessa:' : 'Errore inserimento commessa:', operationError);
            alert((editingCommessa ? 'Errore modifica: ' : 'Errore inserimento: ') + operationError.message);
        } else {
            resetForm();
            await fetchCommesse();
            alert(editingCommessa ? "Commessa modificata con successo!" : "Commessa aggiunta con successo!");
        }
        setLoading(false);
    };

    const handleDeleteCommessa = async (commessaId) => {
        if (!canManage) {
            alert("Non hai i permessi per eliminare commesse.");
            return;
        }
        if (window.confirm("Sei sicuro di voler eliminare questa commessa?")) {
            setLoading(true);
            setError(null);
            const { error: deleteError } = await supabase.from('commesse').delete().eq('id', commessaId);
            if (deleteError) {
                setError(deleteError.message);
                console.error("Errore eliminazione commessa:", deleteError);
                alert("Errore durante l'eliminazione: " + deleteError.message);
            } else {
                await fetchCommesse();
                if (editingCommessa && editingCommessa.id === commessaId) {
                    resetForm();
                }
                alert("Commessa eliminata con successo.");
            }
            setLoading(false);
        }
    };

    if (pageLoading) {
        return <p>Caricamento anagrafica commesse...</p>;
    }

    return (
        <div>
            <h2>Anagrafica Commesse Oilsafe</h2>
            {canManage && (
                <form onSubmit={handleSubmitForm} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>{editingCommessa ? 'Modifica Commessa' : 'Nuova Commessa'}</h3>
                    <div>
                        <label htmlFor="formCodiceCommessa">Codice Commessa:</label>
                        <input type="text" id="formCodiceCommessa" value={formCodiceCommessa} onChange={e => setFormCodiceCommessa(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="formDescrizioneCommessa">Descrizione Commessa:</label>
                        <input type="text" id="formDescrizioneCommessa" value={formDescrizioneCommessa} onChange={e => setFormDescrizioneCommessa(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="formClienteCommessa">Cliente Associato (Opzionale):</label>
                        <select id="formClienteCommessa" value={formSelectedClienteId} onChange={e => setFormSelectedClienteId(e.target.value)}>
                            <option value="">Nessun Cliente Specifico</option>
                            {(clienti || []).map(c => <option key={c.id} value={c.id}>{c.nome_azienda}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="formStatoCommessa">Stato Commessa:</label>
                        <select id="formStatoCommessa" value={formStatoCommessa} onChange={e => setFormStatoCommessa(e.target.value)}>
                            <option value="Aperta">Aperta</option>
                            <option value="In Lavorazione">In Lavorazione</option>
                            <option value="Chiusa">Chiusa</option>
                            <option value="Annullata">Annullata</option>
                        </select>
                    </div>
                    <button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : (editingCommessa ? 'Salva Modifiche' : 'Aggiungi Commessa')}</button>
                    {editingCommessa && (
                        <button type="button" className="secondary" onClick={resetForm} disabled={loading} style={{marginLeft:'10px'}}>
                            Annulla Modifica
                        </button>
                    )}
                </form>
            )}

            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}

            <h3>Elenco Commesse</h3>
            {commesse.length === 0 && !pageLoading ? (
                <p>Nessuna commessa trovata o non hai i permessi per visualizzarle.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Codice</th>
                            <th>Descrizione</th>
                            <th>Cliente</th>
                            <th>Stato</th>
                            {canManage && <th>Azioni</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {commesse.map(commessa => (
                            <tr key={commessa.id} style={editingCommessa && editingCommessa.id === commessa.id ? {backgroundColor: '#e6f7ff'} : {}}>
                                <td>{commessa.codice_commessa}</td>
                                <td>{commessa.descrizione_commessa || '-'}</td>
                                <td>{commessa.clienti?.nome_azienda || 'N/D'}</td>
                                <td>{commessa.stato}</td>
                                {canManage && (
                                    <td className="actions">
                                        <button className="secondary" onClick={() => handleEditCommessa(commessa)} disabled={loading}>Modifica</button>
                                        <button className="danger" onClick={() => handleDeleteCommessa(commessa.id)} disabled={loading} style={{marginLeft:'5px'}}>Elimina</button>
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
export default CommesseManager;