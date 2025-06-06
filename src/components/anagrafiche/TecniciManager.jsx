// src/components/Anagrafiche/TecniciManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function TecniciManager({ session }) { // Riceve session come prop
    const [tecnici, setTecnici] = useState([]);
    const [nome, setNome] = useState('');
    const [cognome, setCognome] = useState('');
    const [loading, setLoading] = useState(false); // Loading per azioni specifiche
    const [pageLoading, setPageLoading] = useState(true); // Loading per il fetch iniziale
    const [error, setError] = useState(null);

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

    const handleAddTecnico = async (e) => {
        e.preventDefault();
        if (!canManage) {
            alert("Non hai i permessi per aggiungere tecnici.");
            return;
        }
        if (!nome.trim() || !cognome.trim()) {
            alert("Nome e cognome sono obbligatori.");
            return;
        }
        setLoading(true);
        setError(null);
        const { error: insertError } = await supabase.from('tecnici').insert([{ nome, cognome }]);
        if (insertError) {
            setError(insertError.message);
            console.error('Errore inserimento tecnico:', insertError);
            alert('Errore inserimento tecnico: ' + insertError.message);
        } else {
            setNome('');
            setCognome('');
            await fetchTecnici();
        }
        setLoading(false);
    };

    const handleDeleteTecnico = async (tecnicoId) => {
        if (!canManage) {
            alert("Non hai i permessi per eliminare tecnici.");
            return;
        }
        if (window.confirm("Sei sicuro di voler eliminare questo tecnico? Potrebbe essere associato a interventi esistenti.")) {
            setLoading(true);
            setError(null);
            const { error: deleteError } = await supabase.from('tecnici').delete().eq('id', tecnicoId);
            if (deleteError) {
                setError(deleteError.message);
                console.error("Errore eliminazione tecnico:", deleteError);
                alert("Errore durante l'eliminazione: " + deleteError.message);
            } else {
                await fetchTecnici();
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
                <form onSubmit={handleAddTecnico} style={{ marginBottom: '20px', padding: '15px', border: '1px solid #eee', borderRadius: '5px' }}>
                    <h3>Nuovo Tecnico</h3>
                    <div>
                        <label htmlFor="nomeTecnico">Nome:</label>
                        <input type="text" id="nomeTecnico" placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} required />
                    </div>
                    <div>
                        <label htmlFor="cognomeTecnico">Cognome:</label>
                        <input type="text" id="cognomeTecnico" placeholder="Cognome" value={cognome} onChange={e => setCognome(e.target.value)} required />
                    </div>
                    <button type="submit" disabled={loading}>{loading ? 'Salvataggio...' : 'Aggiungi Tecnico'}</button>
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
                            {canManage && <th>Azioni</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {tecnici.map(tecnico => (
                            <tr key={tecnico.id}>
                                <td>{tecnico.cognome}</td>
                                <td>{tecnico.nome}</td>
                                 {canManage && (
                                    <td className="actions">
                                        {/* <button className="secondary" disabled={loading}>Modifica</button> */}
                                        <button className="danger" onClick={() => handleDeleteTecnico(tecnico.id)} disabled={loading}>Elimina</button>
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