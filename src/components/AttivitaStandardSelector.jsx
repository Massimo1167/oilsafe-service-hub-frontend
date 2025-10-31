/**
 * Componente per selezionare attività standard nel foglio di assistenza.
 * Usato da admin/manager nell'intestazione del foglio per scegliere quali
 * attività standard presentare agli user durante la compilazione degli interventi.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function AttivitaStandardSelector({ clienteId, selectedAttivita, onChange, readOnly = false }) {
    const [attivitaDisponibili, setAttivitaDisponibili] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (clienteId) {
            fetchAttivitaCliente();
        } else {
            setAttivitaDisponibili([]);
            setLoading(false);
        }
    }, [clienteId]);

    const fetchAttivitaCliente = async () => {
        setLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('attivita_standard_clienti')
                .select('id, codice_attivita, descrizione, unita_misura')
                .eq('cliente_id', clienteId)
                .eq('attivo', true)
                .order('codice_attivita');

            if (error) throw error;
            setAttivitaDisponibili(data || []);
        } catch (err) {
            console.error('Errore caricamento attività:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAttivita = (attivitaId) => {
        if (readOnly) return;

        const exists = selectedAttivita.find(a => a.attivita_standard_id === attivitaId);
        if (exists) {
            // Rimuovi
            onChange(selectedAttivita.filter(a => a.attivita_standard_id !== attivitaId));
        } else {
            // Aggiungi (default: non obbligatoria)
            onChange([...selectedAttivita, {
                attivita_standard_id: attivitaId,
                obbligatoria: false
            }]);
        }
    };

    const handleToggleObbligatoria = (attivitaId) => {
        if (readOnly) return;

        onChange(selectedAttivita.map(a =>
            a.attivita_standard_id === attivitaId
                ? { ...a, obbligatoria: !a.obbligatoria }
                : a
        ));
    };

    const isSelected = (attivitaId) => {
        return selectedAttivita.some(a => a.attivita_standard_id === attivitaId);
    };

    const isObbligatoria = (attivitaId) => {
        const att = selectedAttivita.find(a => a.attivita_standard_id === attivitaId);
        return att?.obbligatoria || false;
    };

    if (!clienteId) {
        return (
            <p style={{color: '#666', fontStyle: 'italic'}}>
                Seleziona prima un cliente per visualizzare le attività standard disponibili.
            </p>
        );
    }

    if (loading) {
        return <p>Caricamento attività standard...</p>;
    }

    if (error) {
        return <p style={{color: 'red'}}>Errore: {error}</p>;
    }

    if (attivitaDisponibili.length === 0) {
        return (
            <p style={{color: '#666', fontStyle: 'italic'}}>
                Nessuna attività standard configurata per questo cliente.
                {!readOnly && ' Vai alla sezione "Attività Standard" per configurarle.'}
            </p>
        );
    }

    return (
        <div style={{
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '15px',
            backgroundColor: '#f9f9f9'
        }}>
            <p style={{marginTop: 0, marginBottom: '10px', fontSize: '0.95em', color: '#444'}}>
                Seleziona le attività standard che verranno presentate durante la compilazione degli interventi.
                {!readOnly && ' Le attività marcate come "Obbligatorie" dovranno essere compilate.'}
            </p>

            {selectedAttivita.length > 0 && (
                <p style={{
                    padding: '8px',
                    backgroundColor: '#d1ecf1',
                    border: '1px solid #bee5eb',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    marginBottom: '10px'
                }}>
                    {selectedAttivita.length} attività selezionata/e
                    {selectedAttivita.filter(a => a.obbligatoria).length > 0 && (
                        <span> ({selectedAttivita.filter(a => a.obbligatoria).length} obbligatoria/e)</span>
                    )}
                </p>
            )}

            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                {attivitaDisponibili.map(attivita => {
                    const selected = isSelected(attivita.id);
                    const obblig = isObbligatoria(attivita.id);

                    return (
                        <div
                            key={attivita.id}
                            style={{
                                padding: '10px',
                                marginBottom: '8px',
                                border: `2px solid ${obblig ? '#ff6b6b' : (selected ? '#28a745' : '#ddd')}`,
                                borderRadius: '4px',
                                backgroundColor: selected ? '#f0f8f0' : 'white',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '10px'
                            }}
                        >
                            {/* Checkbox principale */}
                            <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => handleToggleAttivita(attivita.id)}
                                disabled={readOnly}
                                style={{marginTop: '2px'}}
                            />

                            {/* Informazioni attività */}
                            <div style={{flex: 1}}>
                                <div style={{fontWeight: 'bold', marginBottom: '4px'}}>
                                    {attivita.codice_attivita}
                                    {obblig && (
                                        <span style={{
                                            marginLeft: '8px',
                                            padding: '2px 6px',
                                            backgroundColor: '#ff6b6b',
                                            color: 'white',
                                            borderRadius: '3px',
                                            fontSize: '0.75em'
                                        }}>
                                            OBBLIGATORIA
                                        </span>
                                    )}
                                </div>
                                <div style={{fontSize: '0.9em', color: '#555', marginBottom: '4px'}}>
                                    {attivita.descrizione}
                                </div>
                                <div style={{fontSize: '0.85em', color: '#888'}}>
                                    U.M: {attivita.unita_misura}
                                </div>
                            </div>

                            {/* Checkbox obbligatoria (solo se attività è selezionata) */}
                            {selected && !readOnly && (
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}>
                                    <label style={{
                                        fontSize: '0.85em',
                                        color: '#666',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <input
                                            type="checkbox"
                                            checked={obblig}
                                            onChange={() => handleToggleObbligatoria(attivita.id)}
                                        />
                                        Obbligatoria
                                    </label>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {selectedAttivita.length === 0 && !readOnly && (
                <p style={{
                    textAlign: 'center',
                    color: '#999',
                    fontStyle: 'italic',
                    marginTop: '15px'
                }}>
                    Nessuna attività selezionata. Seleziona almeno un'attività da presentare agli user.
                </p>
            )}
        </div>
    );
}

export default AttivitaStandardSelector;
