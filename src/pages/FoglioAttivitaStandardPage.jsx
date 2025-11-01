/**
 * Pagina per gestire le attività standard associate a un foglio di assistenza.
 * Permette a admin/manager di selezionare quali attività standard (già configurate
 * per il cliente) devono essere disponibili durante la compilazione degli interventi,
 * con possibilità di flaggarle come obbligatorie/opzionali.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function FoglioAttivitaStandardPage({ session }) {
    const { foglioId } = useParams();
    const navigate = useNavigate();

    const [foglio, setFoglio] = useState(null);
    const [attivitaDisponibili, setAttivitaDisponibili] = useState([]);
    const [attivitaSelezionate, setAttivitaSelezionate] = useState([]); // { attivita_standard_id, obbligatoria }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saving, setSaving] = useState(false);

    const userRole = (session?.user?.role || '').trim().toLowerCase();

    useEffect(() => {
        if (!foglioId) return;
        fetchData();
    }, [foglioId]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);

        try {
            // 1. Fetch foglio per ottenere cliente_id, numero_foglio e indirizzo_intervento_id
            const { data: foglioData, error: foglioError } = await supabase
                .from('fogli_assistenza')
                .select('id, numero_foglio, cliente_id, indirizzo_intervento_id, clienti(nome_azienda, usa_listino_unico)')
                .eq('id', foglioId)
                .single();

            if (foglioError) throw foglioError;
            if (!foglioData) throw new Error('Foglio non trovato');

            setFoglio(foglioData);

            const clienteUsaListinoUnico = foglioData.clienti?.usa_listino_unico ?? true;
            const indirizzoInterventoId = foglioData.indirizzo_intervento_id;

            // 2. Fetch attività standard disponibili per quel cliente
            // Se listino unico: mostra tutte le attività (indirizzo_cliente_id = NULL)
            // Se listino per sede: mostra attività specifiche per sede + attività generiche (fallback)
            let attivitaQuery = supabase
                .from('attivita_standard_clienti')
                .select(`
                    id,
                    codice_attivita,
                    descrizione,
                    costo_unitario,
                    unita_misura_id,
                    indirizzo_cliente_id,
                    unita_misura (
                        codice,
                        descrizione
                    )
                `)
                .eq('cliente_id', foglioData.cliente_id)
                .eq('attivo', true);

            // Applica filtro per sede se necessario
            if (!clienteUsaListinoUnico && indirizzoInterventoId) {
                // Mostra: attività specifiche per questa sede OR attività generiche (NULL)
                attivitaQuery = attivitaQuery.or(`indirizzo_cliente_id.eq.${indirizzoInterventoId},indirizzo_cliente_id.is.null`);
            } else if (clienteUsaListinoUnico) {
                // Listino unico: mostra solo attività con indirizzo_cliente_id = NULL
                attivitaQuery = attivitaQuery.is('indirizzo_cliente_id', null);
            }

            attivitaQuery = attivitaQuery.order('codice_attivita');

            const { data: attivitaData, error: attivitaError } = await attivitaQuery;

            if (attivitaError) throw attivitaError;
            setAttivitaDisponibili(attivitaData || []);

            // 3. Fetch attività già selezionate per questo foglio
            const { data: selezioniData, error: selezioniError } = await supabase
                .from('fogli_attivita_standard')
                .select('attivita_standard_id, obbligatoria')
                .eq('foglio_assistenza_id', foglioId);

            if (selezioniError) throw selezioniError;
            setAttivitaSelezionate(selezioniData || []);

        } catch (err) {
            console.error('Errore caricamento dati:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const isSelected = (attivitaId) => {
        return attivitaSelezionate.some(a => a.attivita_standard_id === attivitaId);
    };

    const isObbligatoria = (attivitaId) => {
        const att = attivitaSelezionate.find(a => a.attivita_standard_id === attivitaId);
        return att?.obbligatoria || false;
    };

    const handleToggleAttivita = (attivitaId) => {
        const exists = attivitaSelezionate.find(a => a.attivita_standard_id === attivitaId);
        if (exists) {
            // Rimuovi
            setAttivitaSelezionate(attivitaSelezionate.filter(a => a.attivita_standard_id !== attivitaId));
        } else {
            // Aggiungi (default: non obbligatoria)
            setAttivitaSelezionate([...attivitaSelezionate, {
                attivita_standard_id: attivitaId,
                obbligatoria: false
            }]);
        }
    };

    const handleToggleObbligatoria = (attivitaId) => {
        setAttivitaSelezionate(attivitaSelezionate.map(a =>
            a.attivita_standard_id === attivitaId
                ? { ...a, obbligatoria: !a.obbligatoria }
                : a
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        setError(null);

        try {
            // 1. DELETE vecchie selezioni
            const { error: deleteError } = await supabase
                .from('fogli_attivita_standard')
                .delete()
                .eq('foglio_assistenza_id', foglioId);

            if (deleteError) throw deleteError;

            // 2. INSERT nuove selezioni (se ce ne sono)
            if (attivitaSelezionate.length > 0) {
                const payload = attivitaSelezionate.map(a => ({
                    foglio_assistenza_id: foglioId,
                    attivita_standard_id: a.attivita_standard_id,
                    obbligatoria: a.obbligatoria
                }));

                const { error: insertError } = await supabase
                    .from('fogli_attivita_standard')
                    .insert(payload);

                if (insertError) throw insertError;
            }

            // Successo: torna al dettaglio foglio
            alert('Attività standard salvate con successo!');
            navigate(`/fogli-assistenza/${foglioId}`);

        } catch (err) {
            console.error('Errore salvataggio:', err);
            setError('Errore durante il salvataggio: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        navigate(`/fogli-assistenza/${foglioId}`);
    };

    // Controllo accessi
    if (userRole !== 'admin' && userRole !== 'manager') {
        return (
            <div>
                <p>Accesso negato. Solo admin e manager possono gestire le attività standard dei fogli.</p>
                <Link to={`/fogli-assistenza/${foglioId}`} className="button secondary">
                    Torna al Dettaglio Foglio
                </Link>
            </div>
        );
    }

    if (loading) {
        return <p>Caricamento...</p>;
    }

    if (error) {
        return (
            <div>
                <p style={{color: 'red', fontWeight: 'bold'}}>ERRORE: {error}</p>
                <Link to={`/fogli-assistenza/${foglioId}`} className="button secondary">
                    Torna al Dettaglio Foglio
                </Link>
            </div>
        );
    }

    if (!foglio) {
        return (
            <div>
                <p>Foglio non trovato.</p>
                <Link to="/fogli-assistenza" className="button secondary">
                    Torna alla Lista Fogli
                </Link>
            </div>
        );
    }

    const nomeCliente = foglio.clienti?.nome_azienda || 'Cliente non specificato';
    const numeroFoglio = foglio.numero_foglio || '-';

    return (
        <div>
            <h2>Gestione Attività Standard - Foglio N. {numeroFoglio}</h2>
            <p style={{fontSize: '0.95em', color: '#666', marginBottom: '10px'}}>
                Cliente: <strong>{nomeCliente}</strong>
            </p>
            <p style={{fontSize: '0.9em', color: '#555', marginBottom: '20px'}}>
                Seleziona le attività standard che verranno presentate agli user durante la compilazione degli interventi.
                Le attività marcate come "Obbligatorie" dovranno essere compilate.
            </p>

            {error && <p style={{color: 'red', fontWeight: 'bold'}}>ERRORE: {error}</p>}

            {attivitaSelezionate.length > 0 && (
                <p style={{
                    padding: '10px',
                    backgroundColor: '#d1ecf1',
                    border: '1px solid #bee5eb',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                    marginBottom: '15px'
                }}>
                    {attivitaSelezionate.length} attività selezionata/e
                    {attivitaSelezionate.filter(a => a.obbligatoria).length > 0 && (
                        <span> ({attivitaSelezionate.filter(a => a.obbligatoria).length} obbligatoria/e)</span>
                    )}
                </p>
            )}

            {attivitaDisponibili.length === 0 ? (
                <div style={{
                    padding: '20px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffc107',
                    borderRadius: '4px',
                    marginBottom: '20px'
                }}>
                    <p style={{margin: 0}}>
                        Nessuna attività standard configurata per questo cliente.
                        Vai alla sezione <Link to="/attivita-standard">"Attività Standard"</Link> per configurarle.
                    </p>
                </div>
            ) : (
                <div style={{overflowX: 'auto', marginBottom: '20px'}}>
                    <table>
                        <thead>
                            <tr>
                                <th style={{width: '50px', textAlign: 'center'}}>Seleziona</th>
                                <th>Codice</th>
                                <th>Descrizione</th>
                                <th>U.M.</th>
                                <th style={{width: '120px', textAlign: 'center'}}>Obbligatoria</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attivitaDisponibili.map(attivita => {
                                const selected = isSelected(attivita.id);
                                const obblig = isObbligatoria(attivita.id);

                                return (
                                    <tr
                                        key={attivita.id}
                                        style={{
                                            backgroundColor: obblig ? '#ffe6e6' : (selected ? '#e8f5e9' : 'transparent')
                                        }}
                                    >
                                        <td style={{textAlign: 'center'}}>
                                            <input
                                                type="checkbox"
                                                checked={selected}
                                                onChange={() => handleToggleAttivita(attivita.id)}
                                            />
                                        </td>
                                        <td>
                                            <strong>{attivita.codice_attivita}</strong>
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
                                        </td>
                                        <td>{attivita.descrizione}</td>
                                        <td style={{fontSize: '0.9em', color: '#666'}}>
                                            {attivita.unita_misura?.codice || '-'}
                                        </td>
                                        <td style={{textAlign: 'center'}}>
                                            {selected && (
                                                <label style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '5px',
                                                    cursor: 'pointer'
                                                }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={obblig}
                                                        onChange={() => handleToggleObbligatoria(attivita.id)}
                                                    />
                                                    <span style={{fontSize: '0.9em'}}>Sì</span>
                                                </label>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pulsanti Azione */}
            <div style={{display: 'flex', gap: '10px', marginTop: '30px'}}>
                <button
                    onClick={handleSave}
                    disabled={saving || attivitaDisponibili.length === 0}
                    className="button primary"
                >
                    {saving ? 'Salvataggio...' : 'Salva'}
                </button>
                <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="button secondary"
                >
                    Annulla
                </button>
            </div>

            {attivitaSelezionate.length === 0 && attivitaDisponibili.length > 0 && (
                <p style={{
                    marginTop: '20px',
                    color: '#999',
                    fontStyle: 'italic',
                    textAlign: 'center'
                }}>
                    Nessuna attività selezionata. Seleziona almeno un'attività da presentare agli user.
                </p>
            )}
        </div>
    );
}

export default FoglioAttivitaStandardPage;
