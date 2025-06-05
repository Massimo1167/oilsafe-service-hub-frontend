import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Adatta il percorso

// Questo componente si aspetta `clienti` e `commesse` come props
function OrdiniClienteManager({ clienti, commesse }) {
    const [ordini, setOrdini] = useState([]);
    const [numeroOrdine, setNumeroOrdine] = useState('');
    const [dataOrdine, setDataOrdine] = useState('');
    const [descrizioneOrdine, setDescrizioneOrdine] = useState('');
    const [selectedClienteIdOrdine, setSelectedClienteIdOrdine] = useState('');
    const [selectedCommessaIdOrdine, setSelectedCommessaIdOrdine] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchOrdini = async () => {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('ordini_cliente')
            .select(`
                *,
                clienti (nome_azienda),
                commesse (codice_commessa)
            `)
            .order('data_ordine', { ascending: false });
        if (fetchError) {
            setError(fetchError.message);
            console.error('Errore fetch ordini:', fetchError);
        } else {
            setOrdini(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchOrdini();
    }, []);

    useEffect(() => {
        // Pre-seleziona il primo cliente se la lista clienti è disponibile e nessuno è selezionato
        if (clienti && clienti.length > 0 && !selectedClienteIdOrdine) {
            // setSelectedClienteIdOrdine(clienti[0].id); // Commentato per non forzare la selezione iniziale
        }
    }, [clienti, selectedClienteIdOrdine]);

    const handleAddOrdine = async (e) => {
        e.preventDefault();
        if (!numeroOrdine.trim() || !selectedClienteIdOrdine) {
            alert("Numero ordine e cliente sono obbligatori.");
            return;
        }
        setLoading(true);
        setError(null);
        const { error: insertError } = await supabase.from('ordini_cliente').insert([{
            numero_ordine_cliente: numeroOrdine,
            data_ordine: dataOrdine || null,
            descrizione_ordine: descrizioneOrdine,
            cliente_id: selectedClienteIdOrdine,
            commessa_id: selectedCommessaIdOrdine || null,
        }]);
        if (insertError) {
            setError(insertError.message);
            console.error('Errore inserimento ordine:', insertError);
        } else {
            setNumeroOrdine('');
            setDataOrdine('');
            setDescrizioneOrdine('');
            // Non resettare cliente e commessa per facilitare inserimenti multipli
            fetchOrdini();
        }
        setLoading(false);
    };
    
    const handleDeleteOrdine = async (ordineId) => {
        if (window.confirm("Sei sicuro di voler eliminare questo ordine?")) {
            setLoading(true);
            const { error: deleteError } = await supabase.from('ordini_cliente').delete().eq('id', ordineId);
            if (deleteError) {
                setError(deleteError.message);
                alert("Errore: " + deleteError.message);
            } else {
                fetchOrdini();
            }
            setLoading(false);
        }
    };


    // Filtra le commesse in base al cliente selezionato (se presente)
    const commesseFiltratePerCliente = selectedClienteIdOrdine && commesse
        ? commesse.filter(c => c.cliente_id === selectedClienteIdOrdine || !c.cliente_id)
        : (commesse || []);


    return (
        <div>
            <h2>Anagrafica Ordini Cliente</h2>
            <form onSubmit={handleAddOrdine}>
                <div>
                    <label htmlFor="clienteOrdine">Cliente Associato (Obbligatorio):</label>
                    <select id="clienteOrdine" value={selectedClienteIdOrdine} onChange={e => {
                        setSelectedClienteIdOrdine(e.target.value);
                        setSelectedCommessaIdOrdine(''); // Resetta commessa se cambia cliente
                    }} required>
                        <option value="">Seleziona Cliente</option>
                        {(clienti || []).map(c => <option key={c.id} value={c.id}>{c.nome_azienda}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="numeroOrdine">Numero Ordine Cliente:</label>
                    <input type="text" id="numeroOrdine" placeholder="Es. ORD-CL-001" value={numeroOrdine} onChange={e => setNumeroOrdine(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="dataOrdine">Data Ordine:</label>
                    <input type="date" id="dataOrdine" value={dataOrdine} onChange={e => setDataOrdine(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="descrizioneOrdine">Descrizione Ordine:</label>
                    <input type="text" id="descrizioneOrdine" placeholder="Descrizione" value={descrizioneOrdine} onChange={e => setDescrizioneOrdine(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="commessaOrdine">Commessa Oilsafe Associata (Opzionale, filtrata per cliente):</label>
                    <select id="commessaOrdine" value={selectedCommessaIdOrdine} onChange={e => setSelectedCommessaIdOrdine(e.target.value)} disabled={!selectedClienteIdOrdine}>
                        <option value="">Nessuna Commessa Specifica</option>
                        {commesseFiltratePerCliente.map(c => <option key={c.id} value={c.id}>{c.codice_commessa} - {c.descrizione_commessa}</option>)}
                    </select>
                </div>
                <button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : 'Aggiungi Ordine'}</button>
            </form>

            {error && <p style={{ color: 'red' }}>Errore: {error}</p>}
            {loading && ordini.length === 0 && <p>Caricamento ordini...</p>}

            <h3>Elenco Ordini Cliente</h3>
            {ordini.length === 0 && !loading ? <p>Nessun ordine inserito.</p> : (
                <table>
                    <thead>
                        <tr>
                            <th>Numero Ordine</th>
                            <th>Data</th>
                            <th>Cliente</th>
                            <th>Commessa</th>
                            <th>Descrizione</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ordini.map(ordine => (
                            <tr key={ordine.id}>
                                <td>{ordine.numero_ordine_cliente}</td>
                                <td>{ordine.data_ordine ? new Date(ordine.data_ordine).toLocaleDateString() : '-'}</td>
                                <td>{ordine.clienti?.nome_azienda || 'N/D'}</td>
                                <td>{ordine.commesse?.codice_commessa || '-'}</td>
                                <td>{ordine.descrizione_ordine || '-'}</td>
                                <td className="actions">
                                    <button className="danger" onClick={() => handleDeleteOrdine(ordine.id)} disabled={loading}>Elimina</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
export default OrdiniClienteManager;