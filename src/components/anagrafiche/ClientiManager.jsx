// src/components/Anagrafiche/ClientiManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function ClientiManager({ session }) {
    const [clienti, setClienti] = useState([]);
    const [loading, setLoading] = useState(false); // Loading per azioni specifiche (add/delete/update)
    const [pageLoading, setPageLoading] = useState(true); // Loading per il fetch iniziale
    const [error, setError] = useState(null);

    // Stati per il form (sia per aggiunta che per modifica)
    const [formNomeAzienda, setFormNomeAzienda] = useState('');
    const [formIndirizzo, setFormIndirizzo] = useState('');

    // Stato per tenere traccia del cliente attualmente in modifica
    const [editingCliente, setEditingCliente] = useState(null); // Oggetto cliente o null

    const userRole = session?.user?.role;
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
        if (session) {
            fetchClienti();
        } else {
            setClienti([]);
            setPageLoading(false);
        }
    }, [session]);

    // Funzione per resettare i campi del form
    const resetForm = () => {
        setFormNomeAzienda('');
        setFormIndirizzo('');
        setEditingCliente(null); // Esci dalla modalità modifica
    };

    // Funzione per impostare la modalità modifica
    const handleEditCliente = (cliente) => {
        if (!canManage) {
            alert("Non hai i permessi per modificare clienti.");
            return;
        }
        setEditingCliente(cliente);
        setFormNomeAzienda(cliente.nome_azienda);
        setFormIndirizzo(cliente.indirizzo || '');
        window.scrollTo(0, 0); // Scrolla in cima alla pagina per vedere il form
    };


    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!canManage) {
            alert("Non hai i permessi per questa operazione.");
            return;
        }
        if (!formNomeAzienda.trim()) {
            alert("Il nome azienda è obbligatorio.");
            return;
        }

        setLoading(true);
        setError(null);

        const clienteData = {
            nome_azienda: formNomeAzienda,
            indirizzo: formIndirizzo,
        };

        let operationError = null;

        if (editingCliente) {
            // Modalità Modifica
            const { error: updateError } = await supabase
                .from('clienti')
                .update(clienteData)
                .eq('id', editingCliente.id);
            operationError = updateError;
        } else {
            // Modalità Aggiunta
            const { error: insertError } = await supabase
                .from('clienti')
                .insert([clienteData]);
            operationError = insertError;
        }

        if (operationError) {
            setError(operationError.message);
            console.error(editingCliente ? 'Errore modifica cliente:' : 'Errore inserimento cliente:', operationError);
            alert((editingCliente ? 'Errore modifica: ' : 'Errore inserimento: ') + operationError.message);
        } else {
            resetForm();
            await fetchClienti(); // Ricarica la lista
            alert(editingCliente ? "Cliente modificato con successo!" : "Cliente aggiunto con successo!");
        }
        setLoading(false);
    };

    const handleDeleteCliente = async (clienteId) => {
        if (!canManage) {
            alert("Non hai i permessi per eliminare clienti.");
            return;
        }
        if (window.confirm("Sei sicuro di voler eliminare questo cliente? Questa azione non può essere annullata.")) {
            setLoading(true);
            setError(null);
            const { error: deleteError } = await supabase.from('clienti').delete().eq('id', clienteId);
            if (deleteError) {
                setError(deleteError.message);
                console.error("Errore eliminazione cliente:", deleteError);
                alert("Errore durante l'eliminazione: " + deleteError.message);
            } else {
                await fetchClienti();
                if (editingCliente && editingCliente.id === clienteId) {
                    resetForm(); // Se il cliente eliminato era in modifica, resetta il form
                }
                alert("Cliente eliminato con successo.");
            }
            setLoading(false);
        }
    };

    if (pageLoading) {
        return <p>Caricamento anagrafica clienti...</p>;
    }

    return (
        <div>
            <h2>Anagrafica Clienti</h2>
            {canManage && (
                <form onSubmit={handleSubmitForm} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>{editingCliente ? 'Modifica Cliente' : 'Nuovo Cliente'}</h3>
                    <div>
                        <label htmlFor="formNomeAzienda">Nome Azienda:</label>
                        <input type="text" id="formNomeAzienda" value={formNomeAzienda} onChange={e => setFormNomeAzienda(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="formIndirizzo">Indirizzo:</label>
                        <input type="text" id="formIndirizzo" value={formIndirizzo} onChange={e => setFormIndirizzo(e.target.value)} />
                    </div>
                    <button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : (editingCliente ? 'Salva Modifiche' : 'Aggiungi Cliente')}</button>
                    {editingCliente && (
                        <button type="button" className="secondary" onClick={resetForm} disabled={loading} style={{marginLeft:'10px'}}>
                            Annulla Modifica
                        </button>
                    )}
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
                            {canManage && <th>Azioni</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {clienti.map(cliente => (
                            <tr key={cliente.id} style={editingCliente && editingCliente.id === cliente.id ? {backgroundColor: '#e6f7ff'} : {}}>
                                <td>{cliente.nome_azienda}</td>
                                <td>{cliente.indirizzo || '-'}</td>
                                {canManage && (
                                   <td className="actions">
                                       <button className="secondary" onClick={() => handleEditCliente(cliente)} disabled={loading}>Modifica</button>
                                       <button className="danger" onClick={() => handleDeleteCliente(cliente.id)} disabled={loading} style={{marginLeft:'5px'}}>Elimina</button>
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