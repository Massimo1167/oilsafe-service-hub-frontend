import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Adatta il percorso se necessario

function ClientiManager() {
    const [clienti, setClienti] = useState([]);
    const [nomeAzienda, setNomeAzienda] = useState('');
    const [indirizzo, setIndirizzo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Per la modifica (opzionale per ora)
    // const [editingCliente, setEditingCliente] = useState(null);

    const fetchClienti = async () => {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase.from('clienti').select('*').order('nome_azienda');
        if (fetchError) {
            setError(fetchError.message);
            console.error('Errore fetch clienti:', fetchError);
        } else {
            setClienti(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchClienti();
    }, []);

    const handleAddCliente = async (e) => {
        e.preventDefault();
        if (!nomeAzienda.trim()) {
            alert("Il nome azienda è obbligatorio.");
            return;
        }
        setLoading(true);
        setError(null);
        const { error: insertError } = await supabase.from('clienti').insert([{ nome_azienda: nomeAzienda, indirizzo }]);
        if (insertError) {
            setError(insertError.message);
            console.error('Errore inserimento cliente:', insertError);
        } else {
            setNomeAzienda('');
            setIndirizzo('');
            fetchClienti(); // Ricarica la lista
        }
        setLoading(false);
    };

    const handleDeleteCliente = async (clienteId) => {
        if (window.confirm("Sei sicuro di voler eliminare questo cliente? Potrebbe avere dati associati.")) {
            setLoading(true);
            const { error: deleteError } = await supabase.from('clienti').delete().eq('id', clienteId);
            if (deleteError) {
                setError(deleteError.message);
                alert("Errore durante l'eliminazione: " + deleteError.message);
            } else {
                fetchClienti();
            }
            setLoading(false);
        }
    };

    return (
        <div>
            <h2>Anagrafica Clienti</h2>
            <form onSubmit={handleAddCliente}>
                <div>
                    <label htmlFor="nomeAzienda">Nome Azienda:</label>
                    <input type="text" id="nomeAzienda" placeholder="Nome Azienda" value={nomeAzienda} onChange={e => setNomeAzienda(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="indirizzoCliente">Indirizzo:</label>
                    <input type="text" id="indirizzoCliente" placeholder="Indirizzo" value={indirizzo} onChange={e => setIndirizzo(e.target.value)} />
                </div>
                <button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : 'Aggiungi Cliente'}</button>
            </form>

            {error && <p style={{ color: 'red' }}>Errore: {error}</p>}
            {loading && clienti.length === 0 && <p>Caricamento clienti...</p>}

            <h3>Elenco Clienti</h3>
            {clienti.length === 0 && !loading ? <p>Nessun cliente inserito.</p> : (
                 <table>
                    <thead>
                        <tr>
                            <th>Nome Azienda</th>
                            <th>Indirizzo</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {clienti.map(cliente => (
                            <tr key={cliente.id}>
                                <td>{cliente.nome_azienda}</td>
                                <td>{cliente.indirizzo || '-'}</td>
                                <td className="actions">
                                    {/* <button className="secondary" onClick={() => setEditingCliente(cliente)}>Modifica</button> */}
                                    <button className="danger" onClick={() => handleDeleteCliente(cliente.id)} disabled={loading}>Elimina</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
            {/* Qui andrebbe il form di modifica se editingCliente è settato */}
        </div>
    );
}
export default ClientiManager;