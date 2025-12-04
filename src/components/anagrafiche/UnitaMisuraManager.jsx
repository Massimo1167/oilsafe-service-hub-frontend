/**
 * Manager per gestire l'anagrafica delle unità di misura.
 * Accessibile solo da admin e manager.
 * Permette di creare, modificare ed eliminare unità di misura standardizzate.
 * Validazione: non permette eliminazione se UM in uso (solo disattivazione).
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function UnitaMisuraManager({ session, onDataChanged }) {
    const [unitaMisura, setUnitaMisura] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');
    const [showInactive, setShowInactive] = useState(false);

    // Form states
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formCodice, setFormCodice] = useState('');
    const [formDescrizione, setFormDescrizione] = useState('');
    const [formAttivo, setFormAttivo] = useState(true);

    const userRole = (session?.user?.role || '').trim().toLowerCase();

    useEffect(() => {
        fetchUnitaMisura();
    }, [showInactive]);

    const fetchUnitaMisura = async () => {
        setLoading(true);
        setError(null);
        try {
            let query = supabase
                .from('unita_misura')
                .select('*')
                .order('codice');

            if (!showInactive) {
                query = query.eq('attivo', true);
            }

            const { data, error } = await query;

            if (error) throw error;
            setUnitaMisura(data || []);
        } catch (err) {
            console.error('Errore caricamento unità di misura:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        resetForm();
        setEditingId(null);
        setShowModal(true);
    };

    const handleEdit = (um) => {
        setEditingId(um.id);
        setFormCodice(um.codice);
        setFormDescrizione(um.descrizione || '');
        setFormAttivo(um.attivo);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        setError(null);

        // Verifica se l'UM è in uso
        try {
            const { data: inUso, error: checkError } = await supabase
                .from('attivita_standard_clienti')
                .select('id')
                .eq('unita_misura_id', id)
                .limit(1);

            if (checkError) throw checkError;

            if (inUso && inUso.length > 0) {
                alert(
                    'Impossibile eliminare questa unità di misura perché è utilizzata da attività standard.\n\n' +
                    'Suggerimento: Disattivarla invece di eliminarla.'
                );
                return;
            }
        } catch (err) {
            console.error('Errore verifica utilizzo UM:', err);
            setError(err.message);
            return;
        }

        if (!window.confirm('Eliminare questa unità di misura? Questa azione è irreversibile.')) return;

        try {
            const { error } = await supabase
                .from('unita_misura')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSuccessMessage('Unità di misura eliminata con successo');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchUnitaMisura();
            if (onDataChanged) onDataChanged();
        } catch (err) {
            console.error('Errore eliminazione unità di misura:', err);
            setError(err.message);
        }
    };

    const handleToggleActive = async (um) => {
        setError(null);

        try {
            const { error } = await supabase
                .from('unita_misura')
                .update({ attivo: !um.attivo })
                .eq('id', um.id);

            if (error) throw error;

            setSuccessMessage(`Unità di misura ${um.attivo ? 'disattivata' : 'attivata'} con successo`);
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchUnitaMisura();
            if (onDataChanged) onDataChanged();
        } catch (err) {
            console.error('Errore aggiornamento stato:', err);
            setError(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validazioni
        if (!formCodice.trim()) {
            setError('Codice unità di misura obbligatorio');
            return;
        }

        const payload = {
            codice: formCodice.trim(),
            descrizione: formDescrizione.trim() || null,
            attivo: formAttivo
        };

        try {
            if (editingId) {
                // UPDATE
                const { error } = await supabase
                    .from('unita_misura')
                    .update(payload)
                    .eq('id', editingId);

                if (error) throw error;
                setSuccessMessage('Unità di misura modificata con successo');
            } else {
                // INSERT
                const { error } = await supabase
                    .from('unita_misura')
                    .insert([payload]);

                if (error) {
                    if (error.code === '23505') { // UNIQUE constraint
                        throw new Error('Codice unità di misura già esistente');
                    }
                    throw error;
                }
                setSuccessMessage('Unità di misura creata con successo');
            }

            setTimeout(() => setSuccessMessage(''), 3000);
            setShowModal(false);
            fetchUnitaMisura();
            if (onDataChanged) onDataChanged();
        } catch (err) {
            console.error('Errore salvataggio unità di misura:', err);
            setError(err.message);
        }
    };

    const resetForm = () => {
        setFormCodice('');
        setFormDescrizione('');
        setFormAttivo(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
        setEditingId(null);
        setError(null);
    };

    if (userRole !== 'admin' && userRole !== 'manager') {
        return <p>Accesso negato. Solo admin e manager possono gestire le unità di misura.</p>;
    }

    return (
        <div>
            <h2>Gestione Unità di Misura</h2>
            <p style={{color: '#666'}}>
                Gestisci le unità di misura standardizzate utilizzate nelle attività standard.
            </p>

            {error && <p style={{color: 'red', fontWeight: 'bold'}}>ERRORE: {error}</p>}
            {successMessage && <p style={{color: 'green', fontWeight: 'bold'}}>{successMessage}</p>}

            <div style={{marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center'}}>
                <button onClick={handleAdd} className="button primary">
                    Aggiungi Nuova Unità di Misura
                </button>

                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={(e) => setShowInactive(e.target.checked)}
                    />
                    Mostra anche unità disattivate
                </label>
            </div>

            {loading ? (
                <p>Caricamento unità di misura...</p>
            ) : unitaMisura.length === 0 ? (
                <p>Nessuna unità di misura configurata.</p>
            ) : (
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Codice</th>
                            <th>Descrizione</th>
                            <th>Stato</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {unitaMisura.map(um => (
                            <tr
                                key={um.id}
                                style={{
                                    opacity: um.attivo ? 1 : 0.6,
                                    backgroundColor: um.attivo ? 'transparent' : '#f9f9f9'
                                }}
                            >
                                <td><strong>{um.codice}</strong></td>
                                <td style={{fontSize: '0.9em', color: '#666'}}>
                                    {um.descrizione || '-'}
                                </td>
                                <td>
                                    <span style={{
                                        padding: '3px 8px',
                                        borderRadius: '3px',
                                        backgroundColor: um.attivo ? '#d4edda' : '#f8d7da',
                                        color: um.attivo ? '#155724' : '#721c24',
                                        fontSize: '0.85em'
                                    }}>
                                        {um.attivo ? 'Attivo' : 'Disattivato'}
                                    </span>
                                </td>
                                <td className="actions">
                                    <button
                                        onClick={() => handleEdit(um)}
                                        className="button small"
                                    >
                                        Modifica
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(um)}
                                        className="button warning small"
                                        style={{marginLeft: '5px'}}
                                    >
                                        {um.attivo ? 'Disattiva' : 'Attiva'}
                                    </button>
                                    <button
                                        onClick={() => handleDelete(um.id)}
                                        className="button small secondary"
                                        style={{marginLeft: '5px'}}
                                    >
                                        Elimina
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* Modal Form */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '30px',
                        borderRadius: '8px',
                        width: '500px',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <h3>{editingId ? 'Modifica Unità di Misura' : 'Nuova Unità di Misura'}</h3>

                        <form onSubmit={handleSubmit}>
                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Codice *
                                </label>
                                <input
                                    type="text"
                                    value={formCodice}
                                    onChange={(e) => setFormCodice(e.target.value)}
                                    required
                                    style={{width: '100%', padding: '8px'}}
                                    placeholder="es: €/h, €/prova, €/consegna"
                                />
                                <small style={{color: '#666', display: 'block', marginTop: '3px'}}>
                                    Il codice deve essere univoco e breve
                                </small>
                            </div>

                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Descrizione
                                </label>
                                <textarea
                                    value={formDescrizione}
                                    onChange={(e) => setFormDescrizione(e.target.value)}
                                    rows="2"
                                    style={{width: '100%', padding: '8px'}}
                                    placeholder="Descrizione estesa (opzionale)"
                                />
                            </div>

                            <div style={{marginBottom: '20px'}}>
                                <label style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                                    <input
                                        type="checkbox"
                                        checked={formAttivo}
                                        onChange={(e) => setFormAttivo(e.target.checked)}
                                    />
                                    <span style={{fontWeight: 'bold'}}>Attivo</span>
                                </label>
                            </div>

                            <div style={{display: 'flex', gap: '10px', justifyContent: 'flex-end'}}>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="button secondary"
                                >
                                    Annulla
                                </button>
                                <button type="submit" className="button primary">
                                    {editingId ? 'Salva Modifiche' : 'Crea Unità di Misura'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default UnitaMisuraManager;
