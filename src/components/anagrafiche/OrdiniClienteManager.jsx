// src/components/Anagrafiche/OrdiniClienteManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function OrdiniClienteManager({ session, clienti, commesse }) { // Riceve session, clienti, commesse
    const [ordini, setOrdini] = useState([]);
    const [numeroOrdine, setNumeroOrdine] = useState('');
    const [dataOrdine, setDataOrdine] = useState('');
    const [descrizioneOrdine, setDescrizioneOrdine] = useState('');
    const [selectedClienteIdOrdine, setSelectedClienteIdOrdine] = useState('');
    const [selectedCommessaIdOrdine, setSelectedCommessaIdOrdine] = useState('');
    const [loading, setLoading] = useState(false);
    const [pageLoading, setPageLoading] = useState(true);
    const [error, setError] = useState(null);

    const userRole = session?.user?.role;
    const canManage = userRole === 'admin' || userRole === 'manager';

    const fetchOrdini = async () => {
        setPageLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('ordini_cliente')
            .select(`
                id,
                numero_ordine_cliente,
                data_ordine,
                descrizione_ordine,
                clienti (id, nome_azienda),
                commesse (id, codice_commessa)
            `)
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

    const handleAddOrdine = async (e) => {
        e.preventDefault();
        if (!canManage) {
            alert("Non hai i permessi per aggiungere ordini.");
            return;
        }
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
            alert('Errore inserimento ordine: ' + insertError.message);
        } else {
            setNumeroOrdine('');
            setDataOrdine('');
            setDescrizioneOrdine('');
            // Non resettare cliente e commessa per facilitare inserimenti multipli se si vuole
            // setSelectedClienteIdOrdine(''); 
            // setSelectedCommessaIdOrdine('');
            await fetchOrdini();
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
            }
            setLoading(false);
        }
    };

    const commesseFiltratePerCliente = selectedClienteIdOrdine && commesse
        ? commesse.filter(c => c.cliente_id === selectedClienteIdOrdine || !c.cliente_id) // Mostra commesse del cliente o quelle generiche
        : (commesse || []);

    if (pageLoading) {
        return <p>Caricamento anagrafica ordini cliente...</p>;
    }

    return (
        <div>
            <h2>Anagrafica Ordini Cliente</h2>
            {canManage && (
                <form onSubmit={handleAddOrdine} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>Nuovo Ordine Cliente</h3>
                    <div>
                        <label htmlFor="clienteOrdine">Cliente Associato (Obbligatorio):</label>
                        <select id="clienteOrdine" value={selectedClienteIdOrdine} onChange={e => {
                            setSelectedClienteIdOrdine(e.target.value);
                            setSelectedCommessaIdOrdine(''); 
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
                        <label htmlFor="commessaOrdine">Commessa Oilsafe Associata (Opzionale):</label>
                        <select id="commessaOrdine" value={selectedCommessaIdOrdine} onChange={e => setSelectedCommessaIdOrdine(e.target.value)} disabled={!selectedClienteIdOrdine}>
                            <option value="">Nessuna Commessa Specifica</option>
                            {commesseFiltratePerCliente.map(c => <option key={c.id} value={c.id}>{c.codice_commessa} - {c.descrizione_commessa}</option>)}
                        </select>
                    </div>
                    <button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : 'Aggiungi Ordine'}</button>
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
                            <tr key={ordine.id}>
                                <td>{ordine.numero_ordine_cliente}</td>
                                <td>{ordine.data_ordine ? new Date(ordine.data_ordine).toLocaleDateString() : '-'}</td>
                                <td>{ordine.clienti?.nome_azienda || 'N/D'}</td>
                                <td>{ordine.commesse?.codice_commessa || '-'}</td>
                                <td>{ordine.descrizione_ordine || '-'}</td>
                                {canManage && (
                                    <td className="actions">
                                        {/* <button className="secondary" disabled={loading}>Modifica</button> */}
                                        <button className="danger" onClick={() => handleDeleteOrdine(ordine.id)} disabled={loading}>Elimina</button>
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