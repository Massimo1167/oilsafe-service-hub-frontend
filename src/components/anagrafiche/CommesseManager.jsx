// src/components/Anagrafiche/CommesseManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function CommesseManager({ session, clienti }) { // Riceve session e clienti come props
    const [commesse, setCommesse] = useState([]);
    const [codiceCommessa, setCodiceCommessa] = useState('');
    const [descrizioneCommessa, setDescrizioneCommessa] = useState('');
    const [selectedClienteId, setSelectedClienteId] = useState('');
    const [statoCommessa, setStatoCommessa] = useState('Aperta');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);

    const userRole = session?.user?.role;
    const canManage = userRole === 'admin' || userRole === 'manager';

    const fetchCommesse = async () => {
        setPageLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('commesse')
            .select(`
                id,
                codice_commessa,
                descrizione_commessa,
                stato,
                clienti (id, nome_azienda)
            `)
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

    const handleAddCommessa = async (e) => {
        e.preventDefault();
        if (!canManage) {
            alert("Non hai i permessi per aggiungere commesse.");
            return;
        }
        if (!codiceCommessa.trim()) {
            alert("Il codice commessa è obbligatorio.");
            return;
        }
        setLoading(true);
        setError(null);
        const { error: insertError } = await supabase.from('commesse').insert([{
            codice_commessa: codiceCommessa,
            descrizione_commessa: descrizioneCommessa,
            cliente_id: selectedClienteId || null,
            stato: statoCommessa,
        }]);

        if (insertError) {
            setError(insertError.message);
            console.error('Errore inserimento commessa:', insertError);
            alert('Errore inserimento commessa: ' + insertError.message);
        } else {
            setCodiceCommessa('');
            setDescrizioneCommessa('');
            setSelectedClienteId('');
            setStatoCommessa('Aperta');
            await fetchCommesse();
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
                <form onSubmit={handleAddCommessa} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>Nuova Commessa</h3>
                    <div>
                        <label htmlFor="codiceCommessa">Codice Commessa:</label>
                        <input type="text" id="codiceCommessa" placeholder="Es. COM-2024-001" value={codiceCommessa} onChange={e => setCodiceCommessa(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="descrizioneCommessa">Descrizione Commessa:</label>
                        <input type="text" id="descrizioneCommessa" placeholder="Descrizione" value={descrizioneCommessa} onChange={e => setDescrizioneCommessa(e.target.value)} />
                    </div>
                    <div>
                        <label htmlFor="clienteCommessa">Cliente Associato (Opzionale):</label>
                        <select id="clienteCommessa" value={selectedClienteId} onChange={e => setSelectedClienteId(e.target.value)}>
                            <option value="">Nessun Cliente Specifico</option>
                            {(clienti || []).map(c => <option key={c.id} value={c.id}>{c.nome_azienda}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="statoCommessa">Stato Commessa:</label>
                        <select id="statoCommessa" value={statoCommessa} onChange={e => setStatoCommessa(e.target.value)}>
                            <option value="Aperta">Aperta</option>
                            <option value="In Lavorazione">In Lavorazione</option>
                            <option value="Chiusa">Chiusa</option>
                            <option value="Annullata">Annullata</option>
                        </select>
                    </div>
                    <button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : 'Aggiungi Commessa'}</button>
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
                            <tr key={commessa.id}>
                                <td>{commessa.codice_commessa}</td>
                                <td>{commessa.descrizione_commessa || '-'}</td>
                                <td>{commessa.clienti?.nome_azienda || 'N/D'}</td>
                                <td>{commessa.stato}</td>
                                {canManage && (
                                    <td className="actions">
                                        {/* <button className="secondary" disabled={loading}>Modifica</button> */}
                                        <button className="danger" onClick={() => handleDeleteCommessa(commessa.id)} disabled={loading}>Elimina</button>
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