// src/pages/FoglioAssistenzaDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import InterventoAssistenzaForm from '../components/InterventoAssistenzaForm';

function FoglioAssistenzaDetailPage({ session, tecnici }) {
    const { foglioId } = useParams();
    const navigate = useNavigate();
    const [foglio, setFoglio] = useState(null);
    const [interventi, setInterventi] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showInterventoForm, setShowInterventoForm] = useState(false);

    const userRole = session?.user?.role;
    const currentUserId = session?.user?.id;

    // Determina i permessi per questo specifico foglio
    // L'utente può modificare se è admin, manager, o se è un 'user' e il foglio è suo
    const canEditThisFoglioOverall = foglio && (
        userRole === 'admin' ||
        userRole === 'manager' ||
        (userRole === 'user' && foglio.creato_da_user_id === currentUserId)
    );
    
    // Admin può eliminare qualsiasi foglio. User può eliminare solo i propri. Manager no (secondo le policy RLS attuali).
    const canDeleteThisFoglio = foglio && (
        userRole === 'admin' ||
        (userRole === 'user' && foglio.creato_da_user_id === currentUserId)
    );

    const fetchFoglioData = useCallback(async () => {
        if (!session) { // Non fare fetch se non c'è sessione
            setLoading(false);
            setError("Sessione non valida o scaduta.");
            return;
        }
        setLoading(true);
        setError(null);
        const { data: foglioData, error: foglioError } = await supabase
          .from('fogli_assistenza')
          .select(`
            *,
            clienti (nome_azienda),
            commesse (codice_commessa, descrizione_commessa),
            ordini_cliente (numero_ordine_cliente, descrizione_ordine)
          `)
          .eq('id', foglioId)
          .single();

        if (foglioError) {
          setError("Errore caricamento foglio: " + foglioError.message);
          console.error("Errore fetch foglio:", foglioError);
          setFoglio(null); // Assicurati che foglio sia null in caso di errore
          setLoading(false);
          return;
        }
        setFoglio(foglioData);

        const { data: interventiData, error: interventiError } = await supabase
          .from('interventi_assistenza')
          .select(`
            *,
            tecnici (nome, cognome)
          `)
          .eq('foglio_assistenza_id', foglioId)
          .order('data_intervento_effettivo', { ascending: true });

        if (interventiError) {
          // Non bloccare la visualizzazione del foglio se fallisce il fetch degli interventi
          console.error("Errore fetch interventi:", interventiError.message);
          setInterventi([]);
        } else {
          setInterventi(interventiData || []);
        }
        setLoading(false);
    }, [foglioId, session]);

    useEffect(() => {
        fetchFoglioData();
    }, [fetchFoglioData]);

    const handleInterventoAdded = () => {
        setShowInterventoForm(false);
        fetchFoglioData(); // Ricarica tutto per semplicità (foglio e interventi)
    };
    
    const handleDeleteFoglio = async () => {
        if (!canDeleteThisFoglio) {
            alert("Non hai i permessi per eliminare questo foglio di assistenza.");
            return;
        }
        if (window.confirm("Sei sicuro di voler eliminare questo foglio di assistenza e tutti i suoi interventi? L'azione è irreversibile.")) {
            setLoading(true);
            const { error: deleteError } = await supabase
                .from('fogli_assistenza')
                .delete()
                .eq('id', foglioId);
            
            if (deleteError) {
                setError("Errore eliminazione foglio: " + deleteError.message);
                alert("Errore eliminazione foglio: " + deleteError.message);
                setLoading(false);
            } else {
                alert("Foglio di assistenza eliminato con successo.");
                navigate('/fogli-assistenza');
            }
        }
    };

    const handleDeleteIntervento = async (interventoId) => {
        if (!canEditThisFoglioOverall) { // Usiamo il permesso generale di modifica del foglio per gli interventi
            alert("Non hai i permessi per eliminare interventi su questo foglio.");
            return;
        }
        if (window.confirm("Sei sicuro di voler eliminare questo intervento?")) {
            setLoading(true); // Usiamo il loading generale della pagina per ora
            const { error: deleteError } = await supabase
                .from('interventi_assistenza')
                .delete()
                .eq('id', interventoId);
            if (deleteError) {
                setError("Errore eliminazione intervento: " + deleteError.message);
                alert("Errore eliminazione intervento: " + deleteError.message);
            } else {
                await fetchFoglioData(); // Ricarica gli interventi
            }
            setLoading(false);
        }
    };

    if (loading) return <p>Caricamento dati foglio di assistenza...</p>;
    if (error) return <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>;
    if (!foglio) return <p>Foglio di assistenza non trovato o accesso negato.</p>; // Modificato messaggio

    return (
        <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'1rem'}}>
                <Link to="/fogli-assistenza">← Torna alla lista</Link>
                <div>
                    {/* Pulsante Modifica Intestazione (da implementare con rotta a FoglioAssistenzaFormPage in edit mode) */}
                    {canEditThisFoglioOverall && (
                        <Link to={`/fogli-assistenza/${foglioId}/modifica`} className="button secondary" style={{marginRight:'10px'}}>
                            Modifica Intestazione
                        </Link>
                    )}
                    {canDeleteThisFoglio && (
                        <button onClick={handleDeleteFoglio} className="danger" disabled={loading}>
                            Elimina Foglio
                        </button>
                    )}
                </div>
            </div>

            <h2>Dettaglio Foglio Assistenza N. {foglio.numero_foglio || `ID: ${foglio.id.substring(0,8)}`}</h2>
            
            <div className="foglio-details-grid"> {/* Potresti usare CSS Grid per layout migliore */}
                <div><strong>Data Apertura:</strong> {new Date(foglio.data_apertura_foglio).toLocaleDateString()}</div>
                <div><strong>Cliente:</strong> {foglio.clienti?.nome_azienda || 'N/D'}</div>
                <div><strong>Referente Richiesta:</strong> {foglio.referente_cliente_richiesta || 'N/D'}</div>
                {foglio.commesse && <div><strong>Commessa:</strong> {foglio.commesse.codice_commessa} ({foglio.commesse.descrizione_commessa || 'N/D'})</div>}
                {foglio.ordini_cliente && <div><strong>Ordine Cliente:</strong> {foglio.ordini_cliente.numero_ordine_cliente} ({foglio.ordini_cliente.descrizione_ordine || 'N/D'})</div>}
                <div><strong>Motivo Intervento:</strong> {foglio.motivo_intervento_generale || 'N/D'}</div>
                <div style={{gridColumn: '1 / -1'}}><strong>Descrizione Lavoro Generale:</strong> <pre style={{whiteSpace:'pre-wrap', fontFamily:'inherit'}}>{foglio.descrizione_lavoro_generale || 'N/D'}</pre></div>
                <div style={{gridColumn: '1 / -1'}}><strong>Materiali Forniti:</strong> <pre style={{whiteSpace:'pre-wrap', fontFamily:'inherit'}}>{foglio.materiali_forniti_generale || 'N/D'}</pre></div>
                <div style={{gridColumn: '1 / -1'}}><strong>Osservazioni Generali:</strong> <pre style={{whiteSpace:'pre-wrap', fontFamily:'inherit'}}>{foglio.osservazioni_generali || 'N/D'}</pre></div>
                <div><strong>Stato Foglio:</strong> {foglio.stato_foglio}</div>
                {foglio.creato_da_user_id && <div><small><em>Creato da ID: {foglio.creato_da_user_id.substring(0,8)}...</em></small></div>}
            </div>

            <h4>Firme</h4>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{textAlign:'center'}}>
                    <p>Firma Cliente:</p>
                    {foglio.firma_cliente_url ? (
                    <img src={foglio.firma_cliente_url} alt="Firma Cliente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '150px', display:'block', margin:'auto'}}/>
                    ) : <p>Non presente</p>}
                </div>
                <div style={{textAlign:'center'}}>
                    <p>Firma Tecnico Principale:</p>
                    {foglio.firma_tecnico_principale_url ? (
                    <img src={foglio.firma_tecnico_principale_url} alt="Firma Tecnico" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '150px', display:'block', margin:'auto'}}/>
                    ) : <p>Non presente</p>}
                </div>
            </div>

            <hr />
            <h3>Interventi di Assistenza Associati</h3>
            {canEditThisFoglioOverall && (
                <button onClick={() => setShowInterventoForm(true)} disabled={showInterventoForm || loading} style={{marginBottom:'1rem'}}>
                    Aggiungi Intervento
                </button>
            )}

            {showInterventoForm && canEditThisFoglioOverall && (
                <InterventoAssistenzaForm
                    session={session} // Passa session se InterventoAssistenzaForm ne ha bisogno
                    foglioAssistenzaId={foglioId}
                    tecniciList={tecnici || []} // Assicura che sia un array
                    onInterventoAdded={handleInterventoAdded}
                    onCancel={() => setShowInterventoForm(false)}
                />
            )}

            {interventi.length === 0 ? (
                <p>Nessun intervento registrato per questo foglio.</p>
            ) : (
                <div style={{overflowX: 'auto'}}> {/* Per tabelle larghe su mobile */}
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tecnico</th>
                            <th>Tipo</th>
                            <th>Ore Lavoro</th>
                            <th>Ore Viaggio</th>
                            <th>Km</th>
                            <th>Descrizione Attività</th>
                            <th>Spese</th> {/* Vitto, Alloggio, Autostrada */}
                            {canEditThisFoglioOverall && <th>Azioni</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {interventi.map(intervento => (
                        <tr key={intervento.id}>
                            <td>{new Date(intervento.data_intervento_effettivo).toLocaleDateString()}</td>
                            <td>{intervento.tecnici ? `${intervento.tecnici.nome} ${intervento.tecnici.cognome}` : 'N/D'}</td>
                            <td>{intervento.tipo_intervento || '-'}</td>
                            <td>{intervento.ore_lavoro_effettive || '-'}</td>
                            <td>{intervento.ore_viaggio || '-'}</td>
                            <td>{intervento.km_percorsi || '-'}</td>
                            <td style={{maxWidth:'300px', whiteSpace:'pre-wrap'}}>{intervento.descrizione_attivita_svolta_intervento || '-'}</td>
                            <td>
                                {intervento.vitto && "Vitto "}
                                {intervento.autostrada && "Autostrada "}
                                {intervento.alloggio && "Alloggio"}
                                {!intervento.vitto && !intervento.autostrada && !intervento.alloggio && "-"}
                            </td>
                            {canEditThisFoglioOverall && (
                                <td className="actions">
                                    {/* <button className="secondary" disabled={loading}>Modifica</button> */}
                                    <button className="danger" onClick={() => handleDeleteIntervento(intervento.id)} disabled={loading}>Elimina</button>
                                </td>
                            )}
                        </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            )}
        </div>
    );
}
export default FoglioAssistenzaDetailPage;