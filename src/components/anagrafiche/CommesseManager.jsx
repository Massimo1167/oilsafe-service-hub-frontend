import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Adatta il percorso

// Questo componente si aspetta una prop `clienti` per popolare il dropdown
function CommesseManager({ clienti }) {
    const [commesse, setCommesse] = useState([]);
    const [codiceCommessa, setCodiceCommessa] = useState('');
    const [descrizioneCommessa, setDescrizioneCommessa] = useState('');
    const [selectedClienteId, setSelectedClienteId] = useState('');
    const [statoCommessa, setStatoCommessa] = useState('Aperta');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCommesse = async () => {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('commesse')
            .select(`
                *,
                clienti (nome_azienda)
            `)
            .order('codice_commessa');
        if (fetchError) {
            setError(fetchError.message);
            console.error('Errore fetch commesse:', fetchError);
        } else {
            setCommesse(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchCommesse();
    }, []);

    const handleAddCommessa = async (e) => {
        e.preventDefault();
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
        } else {
            setCodiceCommessa('');
            setDescrizioneCommessa('');
            setSelectedClienteId('');
            setStatoCommessa('Aperta');
            fetchCommesse();
        }
        setLoading(false);
    };

    const handleDeleteCommessa = async (commessaId) => {
        if (window.confirm("Sei sicuro di voler eliminare questa commessa?")) {
            setLoading(true);
            const { error: deleteError } = await supabase.from('commesse').delete().eq('id', commessaId);
            if (deleteError) {
                setError(deleteError.message);
                alert("Errore: " + deleteError.message);
            } else {
                fetchCommesse();
            }
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Anagrafica Commesse Oilsafe</h2>
            <form onSubmit={handleAddCommessa}>
                <div>
                    <label htmlFor="codiceCommessa">Codice Commessa:</label>
                    <input type="text" id="codiceCommessa" placeholder="Es. COM-2023-001" value={codiceCommessa} onChange={e => setCodiceCommessa(e.target.value)} required />
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

            {error && <p style={{ color: 'red' }}>Errore: {error}</p>}
            {loading && commesse.length === 0 && <p>Caricamento commesse...</p>}

            <h3>Elenco Commesse</h3>
             {commesse.length === 0 && !loading ? <p>Nessuna commessa inserita.</p> : (
                <table>
                    <thead>
                        <tr>
                            <th>Codice</th>
                            <th>Descrizione</th>
                            <th>Cliente</th>
                            <th>Stato</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {commesse.map(commessa => (
                            <tr key={commessa.id}>
                                <td>{commessa.codice_commessa}</td>
                                <td>{commessa.descrizione_commessa || '-'}</td>
                                <td>{commessa.clienti?.nome_azienda || 'N/D'}</td>
                                <td>{commessa.stato}</td>
                                <td className="actions">
                                    <button className="danger" onClick={() => handleDeleteCommessa(commessa.id)} disabled={loading}>Elimina</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
export default CommesseManager;