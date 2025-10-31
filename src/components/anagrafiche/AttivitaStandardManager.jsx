/**
 * Manager per gestire l'anagrafica delle attività standard per cliente.
 * Accessibile solo da admin e manager.
 * Permette di creare, modificare ed eliminare attività standard con prezzi predefiniti.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

function AttivitaStandardManager({ session, onDataChanged }) {
    const [attivita, setAttivita] = useState([]);
    const [clienti, setClienti] = useState([]);
    const [selectedClienteId, setSelectedClienteId] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState('');

    // Form states
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formCodice, setFormCodice] = useState('');
    const [formNormativa, setFormNormativa] = useState('');
    const [formDescrizione, setFormDescrizione] = useState('');
    const [formUnitaMisura, setFormUnitaMisura] = useState('');
    const [formCostoUnitario, setFormCostoUnitario] = useState('');
    const [formAttivo, setFormAttivo] = useState(true);

    const userRole = (session?.user?.role || '').trim().toLowerCase();

    // Fetch clienti
    useEffect(() => {
        fetchClienti();
    }, []);

    // Fetch attività quando cambia il cliente selezionato
    useEffect(() => {
        if (selectedClienteId) {
            fetchAttivita();
        } else {
            setAttivita([]);
        }
    }, [selectedClienteId]);

    const fetchClienti = async () => {
        try {
            const { data, error } = await supabase
                .from('clienti')
                .select('id, nome_azienda')
                .order('nome_azienda');

            if (error) throw error;
            setClienti(data || []);
        } catch (err) {
            console.error('Errore caricamento clienti:', err);
            setError(err.message);
        }
    };

    const fetchAttivita = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('attivita_standard_clienti')
                .select('*')
                .eq('cliente_id', selectedClienteId)
                .order('codice_attivita');

            if (error) throw error;
            setAttivita(data || []);
        } catch (err) {
            console.error('Errore caricamento attività:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        if (!selectedClienteId) {
            alert('Seleziona un cliente prima di aggiungere un\'attività');
            return;
        }
        resetForm();
        setEditingId(null);
        setShowModal(true);
    };

    const handleEdit = (attivita) => {
        setEditingId(attivita.id);
        setFormCodice(attivita.codice_attivita);
        setFormNormativa(attivita.normativa || '');
        setFormDescrizione(attivita.descrizione);
        setFormUnitaMisura(attivita.unita_misura);
        setFormCostoUnitario(attivita.costo_unitario.toString());
        setFormAttivo(attivita.attivo);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Eliminare questa attività standard? Questa azione è irreversibile.')) return;

        setError(null);
        try {
            const { error } = await supabase
                .from('attivita_standard_clienti')
                .delete()
                .eq('id', id);

            if (error) throw error;

            setSuccessMessage('Attività eliminata con successo');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchAttivita();
            if (onDataChanged) onDataChanged();
        } catch (err) {
            console.error('Errore eliminazione attività:', err);
            setError(err.message);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validazioni
        if (!formCodice.trim()) {
            setError('Codice attività obbligatorio');
            return;
        }
        if (!formDescrizione.trim()) {
            setError('Descrizione obbligatoria');
            return;
        }
        if (!formUnitaMisura.trim()) {
            setError('Unità di misura obbligatoria');
            return;
        }
        const costoNum = parseFloat(formCostoUnitario);
        if (isNaN(costoNum) || costoNum < 0) {
            setError('Costo unitario deve essere >= 0');
            return;
        }

        const payload = {
            cliente_id: selectedClienteId,
            codice_attivita: formCodice.trim(),
            normativa: formNormativa.trim() || null,
            descrizione: formDescrizione.trim(),
            unita_misura: formUnitaMisura.trim(),
            costo_unitario: costoNum,
            attivo: formAttivo
        };

        try {
            if (editingId) {
                // UPDATE
                const { error } = await supabase
                    .from('attivita_standard_clienti')
                    .update(payload)
                    .eq('id', editingId);

                if (error) throw error;
                setSuccessMessage('Attività modificata con successo');
            } else {
                // INSERT
                const { error } = await supabase
                    .from('attivita_standard_clienti')
                    .insert([payload]);

                if (error) {
                    if (error.code === '23505') { // UNIQUE constraint
                        throw new Error('Codice attività già esistente per questo cliente');
                    }
                    throw error;
                }
                setSuccessMessage('Attività creata con successo');
            }

            setTimeout(() => setSuccessMessage(''), 3000);
            setShowModal(false);
            fetchAttivita();
            if (onDataChanged) onDataChanged();
        } catch (err) {
            console.error('Errore salvataggio attività:', err);
            setError(err.message);
        }
    };

    const resetForm = () => {
        setFormCodice('');
        setFormNormativa('');
        setFormDescrizione('');
        setFormUnitaMisura('');
        setFormCostoUnitario('');
        setFormAttivo(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        resetForm();
        setEditingId(null);
        setError(null);
    };

    if (userRole !== 'admin' && userRole !== 'manager') {
        return <p>Accesso negato. Solo admin e manager possono gestire le attività standard.</p>;
    }

    return (
        <div>
            <h2>Gestione Attività Standard per Cliente</h2>
            <p style={{color: '#666'}}>
                Crea e gestisci attività standard con prezzi predefiniti per contratti di manutenzione.
            </p>

            {error && <p style={{color: 'red', fontWeight: 'bold'}}>ERRORE: {error}</p>}
            {successMessage && <p style={{color: 'green', fontWeight: 'bold'}}>{successMessage}</p>}

            {/* Selezione Cliente */}
            <div style={{marginBottom: '20px'}}>
                <label htmlFor="clienteSelect" style={{marginRight: '10px', fontWeight: 'bold'}}>
                    Seleziona Cliente:
                </label>
                <select
                    id="clienteSelect"
                    value={selectedClienteId}
                    onChange={(e) => setSelectedClienteId(e.target.value)}
                    style={{padding: '8px', minWidth: '300px'}}
                >
                    <option value="">-- Seleziona un cliente --</option>
                    {clienti.map(c => (
                        <option key={c.id} value={c.id}>{c.nome_azienda}</option>
                    ))}
                </select>
            </div>

            {selectedClienteId && (
                <>
                    <button onClick={handleAdd} className="button primary" style={{marginBottom: '20px'}}>
                        Aggiungi Nuova Attività
                    </button>

                    {loading ? (
                        <p>Caricamento attività...</p>
                    ) : attivita.length === 0 ? (
                        <p>Nessuna attività standard configurata per questo cliente.</p>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Codice</th>
                                    <th>Descrizione</th>
                                    <th>Normativa</th>
                                    <th>U.M.</th>
                                    {userRole === 'admin' && <th>Costo Unitario</th>}
                                    <th>Attivo</th>
                                    <th>Azioni</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attivita.map(att => (
                                    <tr key={att.id}>
                                        <td><strong>{att.codice_attivita}</strong></td>
                                        <td>{att.descrizione}</td>
                                        <td style={{fontSize: '0.9em', color: '#666'}}>
                                            {att.normativa || '-'}
                                        </td>
                                        <td>{att.unita_misura}</td>
                                        {userRole === 'admin' && (
                                            <td style={{textAlign: 'right'}}>
                                                €{parseFloat(att.costo_unitario).toFixed(2)}
                                            </td>
                                        )}
                                        <td>
                                            <span style={{
                                                padding: '3px 8px',
                                                borderRadius: '3px',
                                                backgroundColor: att.attivo ? '#d4edda' : '#f8d7da',
                                                color: att.attivo ? '#155724' : '#721c24',
                                                fontSize: '0.85em'
                                            }}>
                                                {att.attivo ? 'Sì' : 'No'}
                                            </span>
                                        </td>
                                        <td className="actions">
                                            <button
                                                onClick={() => handleEdit(att)}
                                                className="button small"
                                            >
                                                Modifica
                                            </button>
                                            <button
                                                onClick={() => handleDelete(att.id)}
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
                </>
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
                        width: '600px',
                        maxHeight: '90vh',
                        overflow: 'auto'
                    }}>
                        <h3>{editingId ? 'Modifica Attività Standard' : 'Nuova Attività Standard'}</h3>

                        <form onSubmit={handleSubmit}>
                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Codice Attività *
                                </label>
                                <input
                                    type="text"
                                    value={formCodice}
                                    onChange={(e) => setFormCodice(e.target.value)}
                                    required
                                    style={{width: '100%', padding: '8px'}}
                                    placeholder="es: MANT-001"
                                />
                            </div>

                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Normativa (opzionale)
                                </label>
                                <input
                                    type="text"
                                    value={formNormativa}
                                    onChange={(e) => setFormNormativa(e.target.value)}
                                    style={{width: '100%', padding: '8px'}}
                                    placeholder="es: UNI EN 1234:2020"
                                />
                            </div>

                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Descrizione *
                                </label>
                                <textarea
                                    value={formDescrizione}
                                    onChange={(e) => setFormDescrizione(e.target.value)}
                                    required
                                    rows="3"
                                    style={{width: '100%', padding: '8px'}}
                                    placeholder="Descrizione dettagliata dell'attività"
                                />
                            </div>

                            <div style={{marginBottom: '15px'}}>
                                <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                    Unità di Misura *
                                </label>
                                <input
                                    type="text"
                                    value={formUnitaMisura}
                                    onChange={(e) => setFormUnitaMisura(e.target.value)}
                                    required
                                    style={{width: '100%', padding: '8px'}}
                                    placeholder="es: €/prova, €/h, €/consegna, €/giorno"
                                />
                                <small style={{color: '#666'}}>
                                    Esempi: €/prova, €/h, €/consegna, €/giorno, €/ritiro, €/pezzo, €*mc/giorno
                                </small>
                            </div>

                            {userRole === 'admin' && (
                                <div style={{marginBottom: '15px'}}>
                                    <label style={{display: 'block', marginBottom: '5px', fontWeight: 'bold'}}>
                                        Costo Unitario (€) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={formCostoUnitario}
                                        onChange={(e) => setFormCostoUnitario(e.target.value)}
                                        required
                                        style={{width: '100%', padding: '8px'}}
                                        placeholder="0.00"
                                    />
                                </div>
                            )}

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
                                    {editingId ? 'Salva Modifiche' : 'Crea Attività'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AttivitaStandardManager;
