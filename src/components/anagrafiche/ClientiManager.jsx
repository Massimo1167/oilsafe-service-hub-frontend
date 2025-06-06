// src/components/Anagrafiche/ClientiManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function ClientiManager({ session }) { // Riceve session come prop
    const [clienti, setClienti] = useState([]);
    const [nomeAzienda, setNomeAzienda] = useState('');
    const [indirizzo, setIndirizzo] = useState('');
    const [loading, setLoading] = useState(false); // Loading per azioni specifiche (add/delete)
    const [pageLoading, setPageLoading] = useState(true); // Loading per il fetch iniziale
    const [error, setError] = useState(null);

    // Ottieni il ruolo dell'utente dalla sessione
    const userRole = session?.user?.role;
    // Determina se l'utente ha i permessi per gestire (admin o manager)
    const canManage = userRole === 'admin' || userRole === 'manager';

    const fetchClienti = async () => {
        setPageLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('clienti')
            .select('*')
            .order('nome_azienda');

        if (fetchError) {
            setError(fetchError.message);
            console.error('Errore fetch clienti:', fetchError);
        } else {
            setClienti(data || []);
        }
        setPageLoading(false);
    };

    useEffect(() => {
        // Se non c'è sessione o ruolo, non fare nulla (o gestisci diversamente)
        // Le RLS proteggeranno comunque il backend, ma è bene non fare chiamate non necessarie
        if (session) {
            fetchClienti();
        } else {
            setClienti([]); // Svuota i clienti se non c'è sessione
            setPageLoading(false);
        }
    }, [session]); // Riesegui se la sessione cambia

    const handleAddCliente = async (e) => {
        e.preventDefault();
        if (!canManage) {
            alert("Non hai i permessi per aggiungere clienti.");
            return;
        }
        if (!nomeAzienda.trim()) {
            alert("Il nome azienda è obbligatorio.");
            return;
        }
        setLoading(true); // Loading per l'azione specifica
        setError(null);
        const { error: insertError } = await supabase.from('clienti').insert([{ nome_azienda: nomeAzienda, indirizzo }]);
        if (insertError) {
            setError(insertError.message);
            console.error('Errore inserimento cliente:', insertError);
            alert('Errore inserimento cliente: ' + insertError.message);
        } else {
            setNomeAzienda('');
            setIndirizzo('');
            await fetchClienti(); // Ricarica la lista dopo l'inserimento
        }
        setLoading(false);
    };

    const handleDeleteCliente = async (clienteId) => {
        if (!canManage) {
            alert("Non hai i permessi per eliminare clienti.");
            return;
        }
        if (window.confirm("Sei sicuro di voler eliminare questo cliente? Questa azione non può essere annullata e potrebbe influire sui fogli di assistenza associati.")) {
            setLoading(true); // Loading per l'azione specifica
            setError(null);
            const { error: deleteError } = await supabase.from('clienti').delete().eq('id', clienteId);
            if (deleteError) {
                setError(deleteError.message);
                console.error("Errore eliminazione cliente:", deleteError);
                alert("Errore durante l'eliminazione: " + deleteError.message);
            } else {
                await fetchClienti(); // Ricarica la lista
            }
            setLoading(false);
        }
    };

    if (pageLoading) {
        return <p>Caricamento anagrafica clienti...</p>;
    }

    // Se l'utente non è admin o manager, potresti mostrare un messaggio di accesso negato
    // o semplicemente non renderizzare nulla/parte del componente.
    // Le RLS sul backend bloccheranno comunque le operazioni non autorizzate.
    // Qui, la visualizzazione della tabella è permessa anche a 'head' e 'user' secondo le policy,
    // ma le azioni di gestione (form e pulsanti elimina) sono nascoste.

    return (
        <div>
            <h2>Anagrafica Clienti</h2>
            {canManage && ( // Mostra il form solo se l'utente può gestire
                <form onSubmit={handleAddCliente} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>Nuovo Cliente</h3>
                    <div>
                        <label htmlFor="nomeAzienda">Nome Azienda:</label>
                        <input type="text" id="nomeAzienda" placeholder="Nome Azienda" value={nomeAzienda} onChange={e => setNomeAzienda(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="indirizzoCliente">Indirizzo:</label>
                        <input type="text" id="indirizzoCliente" placeholder="Indirizzo (Via, CAP, Città)" value={indirizzo} onChange={e => setIndirizzo(e.target.value)} />
                    </div>
                    <button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : 'Aggiungi Cliente'}</button>
                </form>
            )}

            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}

            <h3>Elenco Clienti</h3>
            {clienti.length === 0 && !pageLoading ? (
                <p>Nessun cliente trovato o non hai i permessi per visualizzarli.</p> 
            ) : (
                 <table>
                    <thead>
                        <tr>
                            <th>Nome Azienda</th>
                            <th>Indirizzo</th>
                            {canManage && <th>Azioni</th>} {/* Mostra colonna azioni solo se può gestire */}
                        </tr>
                    </thead>
                    <tbody>
                        {clienti.map(cliente => (
                            <tr key={cliente.id}>
                                <td>{cliente.nome_azienda}</td>
                                <td>{cliente.indirizzo || '-'}</td>
                                {canManage && (
                                   <td className="actions">
                                       {/* <button className="secondary" onClick={() => setEditingCliente(cliente)} disabled={loading}>Modifica</button> */}
                                       <button className="danger" onClick={() => handleDeleteCliente(cliente.id)} disabled={loading}>Elimina</button>
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
export default ClientiManager;