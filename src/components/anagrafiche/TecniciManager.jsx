// src/components/Anagrafiche/TecniciManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Assicurati che il percorso sia corretto

function TecniciManager({ session }) {
    const [tecnici, setTecnici] = useState([]);
    const [loading, setLoading] = useState(false); // Loading per azioni specifiche (add/delete/update)
    const [pageLoading, setPageLoading] = useState(true); // Loading per il fetch iniziale
    const [error, setError] = useState(null);

    // Stati per il form (sia per aggiunta che per modifica)
    const [formNome, setFormNome] = useState('');
    const [formCognome, setFormCognome] = useState('');
    const [formEmail, setFormEmail] = useState(''); 
    const [editingTecnico, setEditingTecnico] = useState(null); // Oggetto tecnico o null

    const userRole = session?.user?.role;
    const canManage = userRole === 'admin' || userRole === 'manager';

    const fetchTecnici = async () => {
        setPageLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase
            .from('tecnici')
            .select('*') 
            .order('cognome')
            .order('nome');
        if (fetchError) {
            setError(fetchError.message);
            console.error('Errore fetch tecnici:', fetchError);
        } else {
            setTecnici(data || []);
        }
        setPageLoading(false);
    };

    useEffect(() => {
        if (session) {
            fetchTecnici();
        } else {
            setTecnici([]);
            setPageLoading(false);
        }
    }, [session]);

    // Funzione per resettare i campi del form
    const resetForm = () => {
        setFormNome('');
        setFormCognome('');
        setFormEmail(''); 
        setEditingTecnico(null); 
    };

    // Funzione per impostare la modalità modifica
    const handleEditTecnico = (tecnico) => {
        if (!canManage) {
            alert("Non hai i permessi per modificare tecnici.");
            return;
        }
        setEditingTecnico(tecnico);
        setFormNome(tecnico.nome);
        setFormCognome(tecnico.cognome);
        setFormEmail(tecnico.email || ''); 
        window.scrollTo(0, 0); 
    };


    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!canManage) {
            alert("Non hai i permessi per questa operazione.");
            return;
        }
        if (!formNome.trim() || !formCognome.trim()) {
            alert("Nome e cognome sono obbligatori.");
            return;
        }
        
        setLoading(true);
        setError(null);

        const tecnicoData = { 
            nome: formNome.trim(), 
            cognome: formCognome.trim(),
            email: formEmail.trim() || null 
        };
        let operationError = null;

        if (editingTecnico) {
            // Modalità Modifica
            const { error: updateError } = await supabase
                .from('tecnici')
                .update(tecnicoData)
                .eq('id', editingTecnico.id);
            operationError = updateError;
        } else {
            // Modalità Aggiunta
            const { error: insertError } = await supabase
                .from('tecnici')
                .insert([tecnicoData]);
            operationError = insertError;
        }

        if (operationError) {
            setError(operationError.message);
            console.error(editingTecnico ? 'Errore modifica tecnico:' : 'Errore inserimento tecnico:', operationError);
            alert((editingTecnico ? 'Errore modifica tecnico: ' : 'Errore inserimento tecnico: ') + operationError.message);
        } else {
            resetForm();
            await fetchTecnici(); // Ricarica la lista
            alert(editingTecnico ? "Tecnico modificato con successo!" : "Tecnico aggiunto con successo!");
        }
        setLoading(false);
    };

    const handleDeleteTecnico = async (tecnicoId) => {
        if (!canManage) {
            alert("Non hai i permessi per eliminare tecnici.");
            return;
        }
        if (window.confirm("Sei sicuro di voler eliminare questo tecnico? Questa azione potrebbe influire sugli interventi di assistenza associati.")) {
            setLoading(true);
            setError(null);
            const { error: deleteError } = await supabase
                .from('tecnici')
                .delete()
                .eq('id', tecnicoId);

            if (deleteError) {
                setError(deleteError.message);
                console.error("Errore eliminazione tecnico:", deleteError);
                alert("Errore durante l'eliminazione del tecnico: " + deleteError.message);
            } else {
                await fetchTecnici(); // Ricarica la lista dei tecnici
                // Se il tecnico eliminato era quello in modifica, resetta il form
                if (editingTecnico && editingTecnico.id === tecnicoId) {
                    resetForm();
                }
                alert("Tecnico eliminato con successo.");
            }
            setLoading(false);
        }
    };

    if (pageLoading) {
        return <p>Caricamento anagrafica tecnici...</p>;
    }

    return (
        <div>
            <h2>Anagrafica Tecnici Oilsafe</h2>
            {canManage && (
                <form onSubmit={handleSubmitForm} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>{editingTecnico ? 'Modifica Tecnico' : 'Nuovo Tecnico'}</h3>
                    <div>
                        <label htmlFor="formNomeTecnico">Nome:</label>
                        <input type="text" id="formNomeTecnico" value={formNome} onChange={e => setFormNome(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="formCognomeTecnico">Cognome:</label>
                        <input type="text" id="formCognomeTecnico" value={formCognome} onChange={e => setFormCognome(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="formEmailTecnico">Email (Opzionale):</label>
                        <input type="email" id="formEmailTecnico" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                    </div>
                    <button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : (editingTecnico ? 'Salva Modifiche' : 'Aggiungi Tecnico')}</button>
                    {editingTecnico && (
                        <button type="button" className="secondary" onClick={resetForm} disabled={loading} style={{marginLeft:'10px'}}>
                            Annulla Modifica
                        </button>
                    )}
                </form>
            )}

            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}

            <h3>Elenco Tecnici</h3>
            {tecnici.length === 0 && !pageLoading ? (
                 <p>Nessun tecnico trovato o non hai i permessi per visualizzarli.</p>
            ) : (
                <table>
                    <thead>
                        <tr>
                            <th>Cognome</th>
                            <th>Nome</th>
                            <th>Email</th>
                            {canManage && <th>Azioni</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {tecnici.map(tecnico => (
                            <tr key={tecnico.id} style={editingTecnico && editingTecnico.id === tecnico.id ? {backgroundColor: '#e6f7ff'} : {}}>
                                <td>{tecnico.cognome}</td>
                                <td>{tecnico.nome}</td>
                                <td>{tecnico.email || '-'}</td>
                                 {canManage && (
                                    <td className="actions">
                                        <button className="secondary" onClick={() => handleEditTecnico(tecnico)} disabled={loading}>Modifica</button>
                                        <button className="danger" onClick={() => handleDeleteTecnico(tecnico.id)} disabled={loading} style={{marginLeft:'5px'}}>Elimina</button>
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
export default TecniciManager;