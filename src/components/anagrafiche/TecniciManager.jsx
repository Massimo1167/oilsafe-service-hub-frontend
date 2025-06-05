import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient'; // Adatta il percorso

function TecniciManager() {
    const [tecnici, setTecnici] = useState([]);
    const [nome, setNome] = useState('');
    const [cognome, setCognome] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchTecnici = async () => {
        setLoading(true);
        setError(null);
        const { data, error: fetchError } = await supabase.from('tecnici').select('*').order('cognome').order('nome');
        if (fetchError) {
            setError(fetchError.message);
            console.error('Errore fetch tecnici:', fetchError);
        } else {
            setTecnici(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchTecnici();
    }, []);

    const handleAddTecnico = async (e) => {
        e.preventDefault();
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
        } else {
            setNome('');
            setCognome('');
            fetchTecnici();
        }
        setLoading(false);
    };

    const handleDeleteTecnico = async (tecnicoId) => {
        if (window.confirm("Sei sicuro di voler eliminare questo tecnico?")) {
            setLoading(true);
            const { error: deleteError } = await supabase.from('tecnici').delete().eq('id', tecnicoId);
            if (deleteError) {
                setError(deleteError.message);
                alert("Errore: " + deleteError.message);
            } else {
                fetchTecnici();
            }
            setLoading(false);
        }
    };


    return (
        <div>
            <h2>Anagrafica Tecnici Oilsafe</h2>
            <form onSubmit={handleAddTecnico}>
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

            {error && <p style={{ color: 'red' }}>Errore: {error}</p>}
            {loading && tecnici.length === 0 && <p>Caricamento tecnici...</p>}

            <h3>Elenco Tecnici</h3>
            {tecnici.length === 0 && !loading ? <p>Nessun tecnico inserito.</p> : (
                <table>
                    <thead>
                        <tr>
                            <th>Cognome</th>
                            <th>Nome</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tecnici.map(tecnico => (
                            <tr key={tecnico.id}>
                                <td>{tecnico.cognome}</td>
                                <td>{tecnico.nome}</td>
                                 <td className="actions">
                                    <button className="danger" onClick={() => handleDeleteTecnico(tecnico.id)} disabled={loading}>Elimina</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
export default TecniciManager;