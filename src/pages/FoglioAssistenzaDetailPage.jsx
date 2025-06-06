// src/pages/FoglioAssistenzaDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import InterventoAssistenzaForm from '../components/InterventoAssistenzaForm'; // Assicurati che questo esista

function FoglioAssistenzaDetailPage({ session, tecnici }) {
    const { foglioId } = useParams();
    const navigate = useNavigate();
    const [foglio, setFoglio] = useState(null);
    const [interventi, setInterventi] = useState([]);
    const [loadingPage, setLoadingPage] = useState(true); // Rinominato per chiarezza
    const [actionLoading, setActionLoading] = useState(false); // Per azioni specifiche come delete
    const [error, setError] = useState(null);
    const [showInterventoForm, setShowInterventoForm] = useState(false);

    const userRole = session?.user?.role;
    const currentUserId = session?.user?.id;

    // Permesso di visualizzare questo foglio (controllato anche da RLS)
    const canViewThisFoglio = foglio && (
        userRole === 'admin' ||
        userRole === 'manager' ||
        userRole === 'head' ||
        (userRole === 'user' && foglio.creato_da_user_id === currentUserId)
    );

    // Permesso di modificare l'intestazione o gli interventi di questo foglio
    const canEditThisFoglioOverall = foglio && (
        userRole === 'admin' ||
        userRole === 'manager' ||
        (userRole === 'user' && foglio.creato_da_user_id === currentUserId)
    );
    
    const canDeleteThisFoglio = foglio && (
        userRole === 'admin' ||
        (userRole === 'user' && foglio.creato_da_user_id === currentUserId)
    );

    const fetchFoglioData = useCallback(async () => {
        if (!session || !foglioId) {
            setLoadingPage(false);
            if(!session) setError("Sessione non valida.");
            return;
        }
        setLoadingPage(true);
        setError(null);
        const { data: foglioData, error: foglioError } = await supabase
          .from('fogli_assistenza')
          .select(`*, clienti (nome_azienda), commesse (codice_commessa, descrizione_commessa), ordini_cliente (numero_ordine_cliente, descrizione_ordine)`)
          .eq('id', foglioId)
          .single();

        if (foglioError) {
          setError("Errore caricamento foglio: " + foglioError.message + ". Potrebbe non esistere o non hai i permessi.");
          console.error("Errore fetch foglio:", foglioError);
          setFoglio(null);
          setLoadingPage(false);
          return;
        }
        setFoglio(foglioData);

        const { data: interventiData, error: interventiError } = await supabase
          .from('interventi_assistenza')
          .select(`*, tecnici (nome, cognome)`)
          .eq('foglio_assistenza_id', foglioId)
          .order('data_intervento_effettivo', { ascending: true });

        if (interventiError) {
          console.error("Errore fetch interventi:", interventiError.message);
          setInterventi([]); // Non bloccare tutto se fallisce solo questo
        } else {
          setInterventi(interventiData || []);
        }
        setLoadingPage(false);
    }, [foglioId, session]);

    useEffect(() => {
        fetchFoglioData();
    }, [fetchFoglioData]);

    const handleInterventoAdded = () => {
        setShowInterventoForm(false);
        fetchFoglioData();
    };
    
    const handleDeleteFoglio = async () => {
        if (!canDeleteThisFoglio) {
            alert("Non hai i permessi per eliminare questo foglio.");
            return;
        }
        if (window.confirm("ATTENZIONE: Sei sicuro di voler eliminare questo foglio di assistenza e tutti i suoi interventi? L'azione è IRREVERSIBILE.")) {
            setActionLoading(true);
            const { error: deleteError } = await supabase.from('fogli_assistenza').delete().eq('id', foglioId);
            if (deleteError) {
                setError("Errore eliminazione foglio: " + deleteError.message);
                alert("Errore eliminazione foglio: " + deleteError.message);
            } else {
                alert("Foglio di assistenza eliminato.");
                navigate('/fogli-assistenza');
            }
            setActionLoading(false);
        }
    };

    const handleDeleteIntervento = async (interventoId) => {
        if (!canEditThisFoglioOverall) {
            alert("Non hai i permessi per eliminare interventi su questo foglio.");
            return;
        }
        if (window.confirm("Sei sicuro di voler eliminare questo intervento specifico?")) {
            setActionLoading(true);
            const { error: deleteError } = await supabase.from('interventi_assistenza').delete().eq('id', interventoId);
            if (deleteError) {
                setError("Errore eliminazione intervento: " + deleteError.message);
                alert("Errore eliminazione intervento: " + deleteError.message);
            } else {
                await fetchFoglioData();
            }
            setActionLoading(false);
        }
    };

    if (loadingPage) return <p>Caricamento dati foglio di assistenza...</p>;
    if (error && !foglio) return <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>; // Mostra errore solo se il foglio non è caricato
    if (!session) return <Navigate to="/login" replace />;
    if (!foglio && !loadingPage) return <p>Foglio di assistenza non trovato o accesso negato dalle policy RLS.</p>;
    if (!canViewThisFoglio && foglio) return <p>Non hai i permessi per visualizzare questo foglio.</p>


    return (
        <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'1rem', flexWrap:'wrap', gap:'10px'}}>
                <Link to="/fogli-assistenza" className="button secondary">← Lista Fogli</Link>
                <div>
                    {canEditThisFoglioOverall && (
                        <Link to={`/fogli-assistenza/${foglioId}/modifica`} className="button secondary" style={{marginRight:'10px'}}>
                            Modifica Intestazione
                        </Link>
                    )}
                    {canDeleteThisFoglio && (
                        <button onClick={handleDeleteFoglio} className="button danger" disabled={actionLoading}>
                            {actionLoading ? 'Eliminazione...' : 'Elimina Foglio'}
                        </button>
                    )}
                </div>
            </div>

            <h2>Dettaglio Foglio Assistenza N. {foglio.numero_foglio || `ID: ${foglio.id.substring(0,8)}`}</h2>
            {error && <p style={{ color: 'red', fontWeight:'bold' }}>{error}</p>} {/* Mostra errori di azioni qui */}
            
            <div className="foglio-details-grid" style={{marginBottom:'20px', padding:'15px', border:'1px solid #ddd', borderRadius:'5px'}}>
                <div><strong>Data Apertura:</strong> {new Date(foglio.data_apertura_foglio).toLocaleDateString()}</div>
                <div><strong>Cliente:</strong> {foglio.clienti?.nome_azienda || 'N/D'}</div>
                <div><strong>Referente Richiesta:</strong> {foglio.referente_cliente_richiesta || 'N/D'}</div>
                {foglio.commesse && <div><strong>Commessa:</strong> {foglio.commesse.codice_commessa} ({foglio.commesse.descrizione_commessa || 'N/D'})</div>}
                {foglio.ordini_cliente && <div><strong>Ordine Cliente:</strong> {foglio.ordini_cliente.numero_ordine_cliente} ({foglio.ordini_cliente.descrizione_ordine || 'N/D'})</div>}
                <div><strong>Motivo Intervento:</strong> {foglio.motivo_intervento_generale || 'N/D'}</div>
                <div style={{gridColumn: '1 / -1'}}><strong>Descrizione Lavoro Generale:</strong> <pre>{foglio.descrizione_lavoro_generale || 'N/D'}</pre></div>
                <div style={{gridColumn: '1 / -1'}}><strong>Materiali Forniti:</strong> <pre>{foglio.materiali_forniti_generale || 'N/D'}</pre></div>
                <div style={{gridColumn: '1 / -1'}}><strong>Osservazioni Generali:</strong> <pre>{foglio.osservazioni_generali || 'N/D'}</pre></div>
                <div><strong>Stato Foglio:</strong> {foglio.stato_foglio}</div>
                {foglio.creato_da_user_id && <div><small><em>Creato da ID: {foglio.creato_da_user_id.substring(0,8)}...</em></small></div>}
            </div>

            <h4>Firme</h4>
            {/* ... (Codice visualizzazione firme come prima) ... */}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', flexWrap: 'wrap', gap:'15px' }}>
                <div style={{textAlign:'center', padding:'10px', border:'1px solid #eee', borderRadius:'4px', minWidth:'320px'}}>
                    <p>Firma Cliente:</p>
                    {foglio.firma_cliente_url ? (
                    <img src={foglio.firma_cliente_url} alt="Firma Cliente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '150px', display:'block', margin:'auto'}}/>
                    ) : <p>Non presente</p>}
                </div>
                <div style={{textAlign:'center', padding:'10px', border:'1px solid #eee', borderRadius:'4px', minWidth:'320px'}}>
                    <p>Firma Tecnico Principale:</p>
                    {foglio.firma_tecnico_principale_url ? (
                    <img src={foglio.firma_tecnico_principale_url} alt="Firma Tecnico" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '150px', display:'block', margin:'auto'}}/>
                    ) : <p>Non presente</p>}
                </div>
            </div>

            <hr style={{margin:'30px 0'}}/>
            <h3>Interventi di Assistenza Associati</h3>
            {canEditThisFoglioOverall && (
                <button onClick={() => setShowInterventoForm(s => !s)} disabled={actionLoading} style={{marginBottom:'1rem'}}>
                    {showInterventoForm ? 'Annulla Nuovo Intervento' : 'Aggiungi Intervento'}
                </button>
            )}

            {showInterventoForm && canEditThisFoglioOverall && (
                <InterventoAssistenzaForm
                    session={session}
                    foglioAssistenzaId={foglioId}
                    tecniciList={tecnici || []}
                    onInterventoAdded={handleInterventoAdded}
                    onCancel={() => setShowInterventoForm(false)}
                />
            )}

            {interventi.length === 0 ? (
                <p>Nessun intervento registrato per questo foglio.</p>
            ) : (
                <div style={{overflowX: 'auto'}}>
                <table>
                    {/* ... (thead come prima) ... */}
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tecnico</th>
                            <th>Tipo</th>
                            <th>Ore Lavoro</th>
                            <th>Ore Viaggio</th>
                            <th>Km</th>
                            <th style={{minWidth:'250px'}}>Descrizione Attività</th>
                            <th>Spese</th>
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
                                    {/* <button className="button secondary small" disabled={actionLoading}>Modifica</button> */}
                                    <button className="button danger small" onClick={() => handleDeleteIntervento(intervento.id)} disabled={actionLoading}>Elimina</button>
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