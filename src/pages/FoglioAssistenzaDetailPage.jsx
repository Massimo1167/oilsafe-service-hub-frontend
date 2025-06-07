// src/pages/FoglioAssistenzaDetailPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import InterventoAssistenzaForm from '../components/InterventoAssistenzaForm';
import { generateFoglioAssistenzaPDF } from '../utils/pdfGenerator';

function FoglioAssistenzaDetailPage({ session, tecnici }) {
    const { foglioId } = useParams();
    const navigate = useNavigate();
    const [foglio, setFoglio] = useState(null);
    const [interventi, setInterventi] = useState([]);
    const [loadingPage, setLoadingPage] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [showInterventoForm, setShowInterventoForm] = useState(false);
    const [editingIntervento, setEditingIntervento] = useState(null);
    const [stampaSingolaLoading, setStampaSingolaLoading] = useState(false);

    const userRole = session?.user?.role;
    const currentUserId = session?.user?.id;

    const canViewThisFoglio = foglio && (userRole === 'admin' || userRole === 'manager' || userRole === 'head' || (userRole === 'user' && foglio.creato_da_user_id === currentUserId));
    const canEditThisFoglioOverall = foglio && (userRole === 'admin' || userRole === 'manager' || (userRole === 'user' && foglio.creato_da_user_id === currentUserId));
    const canDeleteThisFoglio = foglio && (userRole === 'admin' || (userRole === 'user' && foglio.creato_da_user_id === currentUserId));

    const fetchFoglioData = useCallback(async () => {
        // ... (Logica fetchFoglioData come l'ultima versione corretta, assicurandosi che i select siano completi)
        if (!session || !foglioId) { setLoadingPage(false); if(!session) setError("Sessione non valida."); return; }
        setLoadingPage(true); setError(null);
        const { data: foglioData, error: foglioError } = await supabase.from('fogli_assistenza').select(`*, clienti (*), commesse (*), ordini_cliente (*)`).eq('id', foglioId).single();
        if (foglioError) { setError("Errore caricamento foglio: " + foglioError.message); setFoglio(null); setLoadingPage(false); return; }
        setFoglio(foglioData);
        const { data: interventiData, error: interventiError } = await supabase.from('interventi_assistenza').select(`*, tecnici (*)`).eq('foglio_assistenza_id', foglioId).order('data_intervento_effettivo', { ascending: true });
        if (interventiError) { setInterventi([]); } else { setInterventi(interventiData || []); }
        setLoadingPage(false);
    }, [foglioId, session]);

    useEffect(() => { fetchFoglioData(); }, [fetchFoglioData]);

    const handleOpenInterventoForm = (interventoToEdit = null) => { /* ... come prima ... */ setEditingIntervento(interventoToEdit); setShowInterventoForm(true);};
    const handleCloseInterventoForm = () => { /* ... come prima ... */ setShowInterventoForm(false); setEditingIntervento(null);};
    const handleInterventoSaved = () => { /* ... come prima ... */ setShowInterventoForm(false); setEditingIntervento(null); fetchFoglioData();};
    const handleDeleteFoglio = async () => { /* ... come prima ... */ };
    const handleDeleteIntervento = async (interventoId) => { /* ... come prima ... */ };
    const handlePrintSingleFoglio = async () => { /* ... come prima, assicurati che passi foglio e interventi corretti ... */ 
        if (!foglio || !canViewThisFoglio) { alert("Dati foglio non pronti o permessi mancanti."); return; }
        setStampaSingolaLoading(true); setError(null);
        try {
            let foglioDaStampare = foglio;
            if (!foglio.clienti || typeof foglio.clienti.nome_azienda === 'undefined') {
                const { data: fullFoglioData, error: fullFoglioError } = await supabase.from('fogli_assistenza').select(`*, clienti (*), commesse (*), ordini_cliente (*)`).eq('id', foglioId).single();
                if (fullFoglioError || !fullFoglioData) throw new Error(fullFoglioError?.message || "Ricarica dati foglio fallita.");
                foglioDaStampare = fullFoglioData;
            }
            await generateFoglioAssistenzaPDF(foglioDaStampare, interventi);
        } catch (err) { console.error(`Err PDF ${foglioId}:`, err); setError(`Err PDF: ${err.message}`); alert(`Err PDF. Console per dettagli.`); }
        setStampaSingolaLoading(false);
    };

    if (loadingPage) return <p>Caricamento dati foglio di assistenza...</p>;
    if (error && !foglio) return <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>;
    if (!session) return <Navigate to="/login" replace />;
    if (!foglio && !loadingPage) return <p>Foglio di assistenza non trovato o accesso negato.</p>;
    if (!canViewThisFoglio && foglio) return <p>Non hai i permessi per visualizzare questo foglio.</p>;

    return (
        <div>
            {/* ... (Header con pulsanti come prima) ... */}
             <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'1rem', flexWrap:'wrap', gap:'10px'}}>
                <Link to="/fogli-assistenza" className="button secondary">← Lista Fogli</Link>
                <div style={{display: 'flex', alignItems: 'center', flexWrap:'wrap', gap:'10px'}}>
                    {canViewThisFoglio && (<button onClick={handlePrintSingleFoglio} className="button primary" disabled={stampaSingolaLoading || !foglio || actionLoading}> {stampaSingolaLoading ? 'Stampa...' : 'Stampa Foglio'} </button> )}
                    {canEditThisFoglioOverall && (<Link to={`/fogli-assistenza/${foglioId}/modifica`} className="button secondary"> Modifica Intestazione </Link> )}
                    {canDeleteThisFoglio && (<button onClick={handleDeleteFoglio} className="button danger" disabled={actionLoading || stampaSingolaLoading}> {actionLoading ? 'Eliminazione...' : 'Elimina Foglio'} </button> )}
                </div>
            </div>

            <h2>Dettaglio Foglio Assistenza N. {foglio.numero_foglio || `ID: ${foglio.id.substring(0,8)}`}</h2>
            {error && !loadingPage && <p style={{ color: 'red', fontWeight:'bold' }}>{error}</p>}
            
            {/* ... (Dettagli Foglio e Firme come l'ultima versione corretta) ... */}
            <div className="foglio-details-grid" style={{marginBottom:'20px', padding:'15px', border:'1px solid #ddd', borderRadius:'5px', background:'#f9f9f9'}}>
                <div><strong>Data Apertura:</strong> {new Date(foglio.data_apertura_foglio).toLocaleDateString()}</div>
                <div><strong>Cliente:</strong> {foglio.clienti?.nome_azienda || 'N/D'}</div>
                <div><strong>Referente Richiesta:</strong> {foglio.referente_cliente_richiesta || 'N/D'}</div>
                {foglio.commesse && <div><strong>Commessa:</strong> {`${foglio.commesse.codice_commessa} (${foglio.commesse.descrizione_commessa || 'N/D'})`}</div>}
                {foglio.ordini_cliente && <div><strong>Ordine Cliente:</strong> {`${foglio.ordini_cliente.numero_ordine_cliente} (${foglio.ordini_cliente.descrizione_ordine || 'N/D'})`}</div>}
                <div><strong>Motivo Intervento:</strong> {foglio.motivo_intervento_generale || 'N/D'}</div>
                <div style={{gridColumn: '1 / -1'}}><strong>Descrizione Lavoro Generale:</strong> <pre>{foglio.descrizione_lavoro_generale || 'N/D'}</pre></div>
                <div style={{gridColumn: '1 / -1'}}><strong>Materiali Forniti:</strong> <pre>{foglio.materiali_forniti_generale || 'N/D'}</pre></div>
                <div style={{gridColumn: '1 / -1'}}><strong>Osservazioni Generali:</strong> <pre>{foglio.osservazioni_generali || 'N/D'}</pre></div>
                <div><strong>Stato Foglio:</strong> <span className={`status-badge status-${foglio.stato_foglio?.toLowerCase().replace(/\s+/g, '-')}`}>{foglio.stato_foglio}</span></div>
                {foglio.creato_da_user_id && <div><small><em>Creato da ID: {foglio.creato_da_user_id.substring(0,8)}...</em></small></div>}
            </div>
            <h4>Firme</h4>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', flexWrap: 'wrap', gap:'15px' }}>
                <div style={{textAlign:'center', padding:'10px', border:'1px solid #eee', borderRadius:'4px', minWidth:'320px', background:'white'}}>
                    <p>Firma Cliente:</p>
                    {foglio.firma_cliente_url ? (<img src={foglio.firma_cliente_url} alt="Firma Cliente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '150px', display:'block', margin:'auto'}}/>) : <p>Non presente</p>}
                </div>
                <div style={{textAlign:'center', padding:'10px', border:'1px solid #eee', borderRadius:'4px', minWidth:'320px', background:'white'}}>
                    <p>Firma Tecnico Principale:</p>
                    {foglio.firma_tecnico_principale_url ? (<img src={foglio.firma_tecnico_principale_url} alt="Firma Tecnico" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '150px', display:'block', margin:'auto'}}/>) : <p>Non presente</p>}
                </div>
            </div>

            <hr style={{margin:'30px 0'}}/>
            <h3 id="intervento-form-section">Interventi di Assistenza Associati</h3>
            {canEditThisFoglioOverall && (
                <button onClick={() => handleOpenInterventoForm(null)} disabled={actionLoading || showInterventoForm} style={{marginBottom:'1rem'}}>
                    Aggiungi Nuovo Intervento
                </button>
            )}

            {showInterventoForm && canEditThisFoglioOverall && (
                <InterventoAssistenzaForm
                    session={session}
                    foglioAssistenzaId={foglioId}
                    tecniciList={tecnici || []}
                    interventoToEdit={editingIntervento} 
                    onInterventoSaved={handleInterventoSaved} 
                    onCancel={handleCloseInterventoForm}    
                />
            )}

            {interventi.length === 0 && !showInterventoForm && (
                <p>Nessun intervento registrato per questo foglio.</p>
            )}
            {interventi.length > 0 && (
                <div style={{overflowX: 'auto'}}>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tecnico</th>
                            <th>Tipo</th>
                            <th>Ore Lavoro</th>
                            <th>Ore Viaggio</th>
                            <th>Km</th>
                            <th style={{minWidth:'200px'}}>Descrizione Attività</th>
                            <th style={{minWidth:'150px'}}>Osservazioni Intervento</th> {/* Colonna aggiunta */}
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
                            <td style={{maxWidth:'200px', whiteSpace:'pre-wrap'}}>{intervento.osservazioni_intervento || '-'}</td> {/* Cella aggiunta */}
                            <td>
                                {intervento.vitto && "Vitto "}
                                {intervento.autostrada && "Autostrada "}
                                {intervento.alloggio && "Alloggio"}
                                {(!intervento.vitto && !intervento.autostrada && !intervento.alloggio) && "-"}
                            </td>
                            {canEditThisFoglioOverall && (
                                <td className="actions">
                                    <button 
                                        className="button secondary small" 
                                        onClick={() => handleOpenInterventoForm(intervento)}
                                        disabled={actionLoading || showInterventoForm}
                                        style={{marginRight:'5px'}}
                                    >
                                        Modifica
                                    </button>
                                    <button 
                                        className="button danger small" 
                                        onClick={() => handleDeleteIntervento(intervento.id)} 
                                        disabled={actionLoading}
                                    >
                                        Elimina
                                    </button>
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