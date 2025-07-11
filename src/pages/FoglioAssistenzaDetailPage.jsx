/**
 * Shows the details of a single service sheet and its interventions.
 * Allows editing, deletion and PDF export using `pdfGenerator.js`.
 * Uses InterventoAssistenzaForm for adding interventions.
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Assicurati che il percorso sia corretto
import InterventoAssistenzaForm from '../components/InterventoAssistenzaForm'; // Assicurati che il percorso sia corretto
import InterventoCard from '../components/InterventoCard';
import { generateFoglioAssistenzaPDF } from '../utils/pdfGenerator'; // Assicurati che il percorso sia corretto
import { STATO_FOGLIO_STEPS } from '../utils/statoFoglio';

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
    const [interventoFormReadOnly, setInterventoFormReadOnly] = useState(false);
    const [stampaSingolaLoading, setStampaSingolaLoading] = useState(false);
    // Il layout di stampa predefinito diventa quello dettagliato
    const [layoutStampa, setLayoutStampa] = useState('detailed');
    const [isSmallScreen, setIsSmallScreen] = useState(false);

    const userRole = (session?.user?.role || '').trim().toLowerCase();
    const currentUserId = session?.user?.id;
    const currentUserEmail = session?.user?.email?.toLowerCase();

    const isUserAssignedTecnico = useMemo(() => {
        const email = currentUserEmail || '';
        const assignedViaInterventi = interventi.some(i => (i.tecnici?.email || '').toLowerCase() === email);
        const assignedViaFoglio = foglio?.assegnato_a_user_id === currentUserId;
        return assignedViaInterventi || assignedViaFoglio;
    }, [interventi, currentUserEmail, foglio, currentUserId]);

    // Calcola i permessi dopo che `foglio` è stato caricato
    const canViewThisFoglio =
        foglio &&
        (userRole === 'admin' ||
            userRole === 'manager' ||
            userRole === 'head' ||
            (userRole === 'user' && (foglio.creato_da_user_id === currentUserId || isUserAssignedTecnico)));

    const completatoIndex = STATO_FOGLIO_STEPS.indexOf('Completato');
    const chiusoIndex = STATO_FOGLIO_STEPS.indexOf('Chiuso');
    const statoIndex = STATO_FOGLIO_STEPS.indexOf(foglio?.stato_foglio);
    const isChiuso = foglio?.stato_foglio === 'Chiuso';
    const isPostCompletato = completatoIndex !== -1 && statoIndex > completatoIndex;
    const isPostChiuso = chiusoIndex !== -1 && statoIndex > chiusoIndex;
    const firmaPresente = !!foglio?.firma_cliente_url;

    const baseEditPermission =
        foglio &&
        (userRole === 'admin' ||
            userRole === 'manager' ||
            (userRole === 'user' && (foglio.creato_da_user_id === currentUserId || isUserAssignedTecnico)));

    let canEditThisFoglioOverall = false;
    if (foglio) {
        if (userRole === 'admin' || userRole === 'manager') {
            canEditThisFoglioOverall = !isPostChiuso;
        } else if (
            userRole === 'user' &&
            (foglio.creato_da_user_id === currentUserId || isUserAssignedTecnico)
        ) {
            canEditThisFoglioOverall = !isPostCompletato;
        }
    }

    console.debug('FADetail perms', {
        userRole,
        currentUserId,
        foglioCreator: foglio?.creato_da_user_id,
        foglioStato: foglio?.stato_foglio,
        firmaPresente,
        canEditThisFoglioOverall,
    });
    const canRemoveFirmaCliente = baseEditPermission && foglio && !isChiuso;

    const canDeleteThisFoglio =
        foglio &&
        (userRole === 'admin' || (userRole === 'user' && foglio.creato_da_user_id === currentUserId));

    let canModifyInterventi = false;
    if (foglio) {
        if (userRole === 'admin' || userRole === 'manager') {
            canModifyInterventi = !isPostChiuso;
        } else if (
            userRole === 'user' &&
            (foglio.creato_da_user_id === currentUserId || isUserAssignedTecnico)
        ) {
            canModifyInterventi = !isPostCompletato;
        }
    }

    const fetchFoglioData = useCallback(async () => {
        if (!session || !foglioId) { 
            setLoadingPage(false); 
            if(!session) setError("Sessione non valida o scaduta. Effettua il login.");
            return; 
        }
        setLoadingPage(true); 
        setError(null);
        
        const { data: foglioData, error: foglioError } = await supabase
          .from('fogli_assistenza')
          .select(`
            *,
            assegnato_a_user_id,
            profilo_tecnico_assegnato:profiles (full_name),
            clienti (id, nome_azienda),
            commesse (id, codice_commessa, descrizione_commessa),
            ordini_cliente (id, numero_ordine_cliente, descrizione_ordine),
            indirizzi_clienti!indirizzo_intervento_id (id, indirizzo_completo, descrizione)
          `)
          .eq('id', foglioId)
          .single();

        if (foglioError) { 
          setError("Errore caricamento foglio: " + foglioError.message + ". Potrebbe non esistere o non hai i permessi per visualizzarlo.");
          console.error("Errore fetch foglio:", foglioError);
          setFoglio(null); 
          setLoadingPage(false);
          return;
        }
        const tecnicoAss = (tecnici || []).find(t => t.user_id === foglioData.assegnato_a_user_id);
        const nomeTecnicoAss = tecnicoAss ? `${tecnicoAss.nome} ${tecnicoAss.cognome}` : foglioData.profilo_tecnico_assegnato?.full_name || null;
        setFoglio({ ...foglioData, tecnico_assegnato_nome: nomeTecnicoAss });

        const { data: interventiData, error: interventiError } = await supabase
          .from('interventi_assistenza')
          .select(`*, tecnici (id, nome, cognome, email)`)
          .eq('foglio_assistenza_id', foglioId)
          .order('data_intervento_effettivo', { ascending: true });

        if (interventiError) { 
          console.error("Errore fetch interventi:", interventiError.message);
          setInterventi([]); 
        } else { 
          setInterventi(interventiData || []); 
        }
        setLoadingPage(false);
    }, [foglioId, currentUserId]);

    useEffect(() => {
        fetchFoglioData();
    }, [fetchFoglioData]);

    useEffect(() => {
        const handleResize = () => {
            setIsSmallScreen(window.innerWidth <= 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    const handleOpenInterventoForm = (interventoToEdit = null, readOnly = false) => {
        if (!canModifyInterventi && !readOnly) {
            alert("Interventi non modificabili per questo foglio.");
            return;
        }
        setEditingIntervento(interventoToEdit);
        setInterventoFormReadOnly(readOnly);
        setShowInterventoForm(true);
        const formElement = document.getElementById('intervento-form-section');
        if (formElement) formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const handleCloseInterventoForm = () => {
        setShowInterventoForm(false);
        setEditingIntervento(null);
        setInterventoFormReadOnly(false);
    };

    const handleInterventoSaved = () => { 
        setShowInterventoForm(false);
        setEditingIntervento(null);
        fetchFoglioData(); 
    };
    
    const handleDeleteFoglio = async () => {
        if (!canDeleteThisFoglio) {
            alert("Non hai i permessi per eliminare questo foglio di assistenza.");
            return;
        }
        if (window.confirm("ATTENZIONE: Sei sicuro di voler eliminare questo foglio di assistenza e tutti i suoi interventi? L'azione è IRREVERSIBILE.")) {
            setActionLoading(true);
            const { error: deleteError } = await supabase.from('fogli_assistenza').delete().eq('id', foglioId);
            if (deleteError) {
                setError("Errore eliminazione foglio: " + deleteError.message);
                alert("Errore eliminazione foglio: " + deleteError.message);
            } else {
                alert("Foglio di assistenza eliminato con successo.");
                navigate('/fogli-assistenza');
            }
            setActionLoading(false);
        }
    };

    const handleDeleteIntervento = async (interventoId) => {
        if (!canModifyInterventi) {
            alert("Non è possibile modificare gli interventi di questo foglio.");
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
                alert("Intervento eliminato.");
            }
            setActionLoading(false);
        }
    };

    // Permette la rimozione della firma cliente già salvata.
    // Aggiorna il record su Supabase impostando `firma_cliente_url` a null
    // e ricarica i dati del foglio dopo l'operazione.
    const handleRemoveFirmaCliente = async () => {
        if (!canRemoveFirmaCliente || !foglio?.firma_cliente_url) return;
        if (!window.confirm("Rimuovere la firma cliente?")) return;
        setActionLoading(true);
        const { error } = await supabase
            .from('fogli_assistenza')
            .update({ firma_cliente_url: null })
            .eq('id', foglioId);
        if (error) {
            setError("Errore rimozione firma cliente: " + error.message);
            alert("Errore rimozione firma cliente: " + error.message);
        } else {
            await fetchFoglioData();
            alert("Firma cliente rimossa.");
        }
        setActionLoading(false);
    };

    const handlePrintSingleFoglio = async () => {
        if (!foglio) { alert("Dati del foglio non ancora caricati."); return; }
        if (!canViewThisFoglio) { alert("Non hai i permessi per stampare questo foglio."); return; }

        setStampaSingolaLoading(true); 
        setError(null);
        try {
            let foglioCompletoPerStampa = foglio;
            // Assicurati che tutti i dati necessari per il PDF siano presenti, specialmente le relazioni
            if (!foglio.clienti || !foglio.indirizzi_clienti) { // Aggiunto check per indirizzi_clienti
                console.warn("Ricarico dati foglio completi per stampa (dati relazionati mancanti)...");
                const { data: fullData, error: fullErr } = await supabase.from('fogli_assistenza')
                    .select(`*, assegnato_a_user_id, profilo_tecnico_assegnato:profiles (full_name), clienti (*), commesse (*), ordini_cliente (*), indirizzi_clienti!indirizzo_intervento_id (*)`)
                    .eq('id', foglioId).single();
                if (fullErr || !fullData) throw new Error(fullErr?.message || "Impossibile ricaricare dati foglio per stampa.");
                const tecnicoAss = (tecnici || []).find(t => t.user_id === fullData.assegnato_a_user_id);
                fullData.tecnico_assegnato_nome = tecnicoAss ? `${tecnicoAss.nome} ${tecnicoAss.cognome}` : fullData.profilo_tecnico_assegnato?.full_name || null;
                foglioCompletoPerStampa = fullData;
            }
            await generateFoglioAssistenzaPDF(foglioCompletoPerStampa, interventi, { layout: layoutStampa });
        } catch (err) { 
            console.error(`Errore durante la generazione del PDF per il foglio singolo ${foglioId}:`, err);
            setError(`Errore PDF: ${err.message}`);
            alert(`Impossibile generare il PDF. Dettagli in console.`);
        }
        setStampaSingolaLoading(false);
    };

    if (loadingPage) return <p>Caricamento dati foglio di assistenza...</p>;
    if (error && !foglio) return <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>;
    if (!session) return <Navigate to="/login" replace />;
    if (!foglio && !loadingPage) return <p>Foglio di assistenza non trovato o accesso negato.</p>;
    if (!canViewThisFoglio && foglio) return <p>Non hai i permessi per visualizzare questo foglio.</p>;

    return (
        <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'1rem', flexWrap:'wrap', gap:'10px'}}>
                <Link to="/fogli-assistenza" className="button secondary">← Lista Fogli</Link>
                <div style={{display: 'flex', alignItems: 'center', flexWrap:'wrap', gap:'10px'}}>
                    <select value={layoutStampa} onChange={e => setLayoutStampa(e.target.value)}>
                        <option value="table">Layout Compatto</option>
                        <option value="detailed">Layout Dettagliato</option>
                    </select>
                    {canViewThisFoglio && (
                         <button
                            onClick={handlePrintSingleFoglio}
                            className="button primary"
                            disabled={stampaSingolaLoading || !foglio || actionLoading}
                        >
                            {stampaSingolaLoading ? 'Stampa in corso...' : 'Stampa Foglio'}
                        </button>
                    )}
                    {canEditThisFoglioOverall && (
                        <Link to={`/fogli-assistenza/${foglioId}/modifica`} className="button secondary">
                            Modifica Intestazione
                        </Link>
                    )}
                    {canDeleteThisFoglio && (
                        <button onClick={handleDeleteFoglio} className="button danger" disabled={actionLoading || stampaSingolaLoading}>
                            {actionLoading ? 'Eliminazione...' : 'Elimina Foglio'}
                        </button>
                    )}
                </div>
            </div>

            <h2>Dettaglio Foglio Assistenza N. {foglio.numero_foglio || `ID: ${foglio.id.substring(0,8)}`}</h2>
            {error && !loadingPage && <p style={{ color: 'red', fontWeight:'bold' }}>{error}</p>}
            
            <div className="foglio-details-grid" style={{marginBottom:'20px', padding:'15px', border:'1px solid #ddd', borderRadius:'5px', background:'#f9f9f9'}}>
                <div><strong>Data Apertura:</strong> {new Date(foglio.data_apertura_foglio).toLocaleDateString()}</div>
                <div><strong>Cliente:</strong> {foglio.clienti?.nome_azienda || 'N/D'}</div>
                
                <div>
                    <strong>Indirizzo Intervento:</strong> 
                    {foglio.indirizzi_clienti 
                        ? `${foglio.indirizzi_clienti.descrizione ? foglio.indirizzi_clienti.descrizione + ': ' : ''}${foglio.indirizzi_clienti.indirizzo_completo}` 
                        : (foglio.indirizzo_intervento_id ? 'Caricamento indirizzo...' : 'Nessun indirizzo specifico selezionato')}
                </div>

                <div><strong>Referente Richiesta:</strong> {foglio.referente_cliente_richiesta || 'N/D'}</div>
                {foglio.tecnico_assegnato_nome && (
                    <div><strong>Tecnico Assegnato:</strong> {foglio.tecnico_assegnato_nome}</div>
                )}
                {foglio.commesse && <div><strong>Commessa:</strong> {`${foglio.commesse.codice_commessa} (${foglio.commesse.descrizione_commessa || 'N/D'})`}</div>}
                {foglio.ordini_cliente && <div><strong>Ordine Cliente:</strong> {`${foglio.ordini_cliente.numero_ordine_cliente} (${foglio.ordini_cliente.descrizione_ordine || 'N/D'})`}</div>}
                {foglio.email_report_cliente && <div><strong>Email Cliente Report:</strong> {foglio.email_report_cliente}</div>}
                {foglio.email_report_interno && <div><strong>Email Interna Report:</strong> {foglio.email_report_interno}</div>}
                <div><strong>Motivo Intervento:</strong> {foglio.motivo_intervento_generale || 'N/D'}</div>
                <div style={{gridColumn: '1 / -1'}}><strong>Descrizione Lavoro Generale:</strong> <pre>{foglio.descrizione_lavoro_generale || 'N/D'}</pre></div>
                <div style={{gridColumn: '1 / -1'}}><strong>Materiali Forniti:</strong> <pre>{foglio.materiali_forniti_generale || 'N/D'}</pre></div>
                <div style={{gridColumn: '1 / -1'}}><strong>Osservazioni Generali:</strong> <pre style={{whiteSpace:'pre-wrap'}}>{foglio.osservazioni_generali || 'N/D'}</pre></div>
                <div><strong>Stato Foglio:</strong> <span className={`status-badge status-${foglio.stato_foglio?.toLowerCase().replace(/\s+/g, '-')}`}>{foglio.stato_foglio}</span></div>
                {foglio.nota_stato_foglio && (
                    <div style={{gridColumn: '1 / -1'}}>
                        <strong>Nota Stato Foglio:</strong> <pre style={{whiteSpace:'pre-wrap'}}>{foglio.nota_stato_foglio}</pre>
                    </div>
                )}
                {foglio.creato_da_user_id && <div><small><em>Creato da ID: {foglio.creato_da_user_id.substring(0,8)}...</em></small></div>}
            </div>

            <h4>Firme</h4>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: '20px', flexWrap: 'wrap', gap:'15px' }}>
                <div style={{textAlign:'center', padding:'10px', border:'1px solid #eee', borderRadius:'4px', minWidth:'320px', background:'white'}}>
                    <p>Firma Cliente:</p>
                    {foglio.firma_cliente_url ? (
                    <>
                    <img src={foglio.firma_cliente_url} alt="Firma Cliente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '150px', display:'block', margin:'auto'}}/>
                    {canRemoveFirmaCliente && (
                        <button onClick={handleRemoveFirmaCliente} className="button danger small" style={{marginTop:'8px'}}>
                            Rimuovi firma cliente
                        </button>
                    )}
                    </>
                    ) : <p>Non presente</p>}
                </div>
                <div style={{textAlign:'center', padding:'10px', border:'1px solid #eee', borderRadius:'4px', minWidth:'320px', background:'white'}}>
                    <p>Firma Tecnico Principale:</p>
                    {foglio.firma_tecnico_principale_url ? (
                    <img src={foglio.firma_tecnico_principale_url} alt="Firma Tecnico" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '150px', display:'block', margin:'auto'}}/>
                    ) : <p>Non presente</p>}
                </div>
            </div>

            <hr style={{margin:'30px 0'}}/>
            <h3 id="intervento-form-section">Interventi di Assistenza Associati</h3>
            {canModifyInterventi && (
                <button onClick={() => handleOpenInterventoForm(null)} disabled={actionLoading || showInterventoForm} style={{marginBottom:'1rem'}}>
                    Aggiungi Nuovo Intervento
                </button>
            )}

            {showInterventoForm && (
                <InterventoAssistenzaForm
                    session={session}
                    foglioAssistenzaId={foglioId}
                    tecniciList={tecnici || []}
                    interventoToEdit={editingIntervento}
                    readOnly={interventoFormReadOnly}
                    onInterventoSaved={handleInterventoSaved}
                    onCancel={handleCloseInterventoForm}
                />
            )}

            {interventi.length === 0 && !showInterventoForm && (
                <p>Nessun intervento registrato per questo foglio.</p>
            )}
            {interventi.length > 0 && (
                isSmallScreen ? (
                    <div>
                        {interventi.map(intervento => (
                            <InterventoCard
                                key={intervento.id}
                                intervento={intervento}
                                canModify={canModifyInterventi}
                                onEdit={() => handleOpenInterventoForm(intervento)}
                                onDelete={() => handleDeleteIntervento(intervento.id)}
                                onView={() => handleOpenInterventoForm(intervento, true)}
                            />
                        ))}
                    </div>
                ) : (
                <div style={{overflowX: 'auto'}}>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Tecnico</th>
                            <th>N. Tecnici</th>
                            <th>Tipo</th>
                            <th>Ore Lavoro</th>
                            <th>Ore Viaggio</th>
                            <th>Km</th>
                            <th style={{minWidth:'200px'}}>Descrizione Attività</th>
                            <th style={{minWidth:'150px'}}>Osservazioni Intervento</th>
                            <th>Spese</th>
                            <th>Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {interventi.map(intervento => (
                        <tr key={intervento.id}>
                            <td>{new Date(intervento.data_intervento_effettivo).toLocaleDateString()}</td>
                            <td>{intervento.tecnici ? `${intervento.tecnici.nome} ${intervento.tecnici.cognome}` : 'N/D'}</td>
                            <td>{intervento.numero_tecnici || '-'}</td>
                            <td>{intervento.tipo_intervento || '-'}</td>
                            <td>{intervento.ore_lavoro_effettive || '-'}</td>
                            <td>{intervento.ore_viaggio || '-'}</td>
                            <td>{intervento.km_percorsi || '-'}</td>
                            <td style={{maxWidth:'300px', whiteSpace:'pre-wrap'}}>{intervento.descrizione_attivita_svolta_intervento || '-'}</td>
                            <td style={{maxWidth:'200px', whiteSpace:'pre-wrap'}}>{intervento.osservazioni_intervento || '-'}</td>
                            <td>
                                {intervento.vitto && "Vitto "}
                                {intervento.autostrada && "Autostrada "}
                                {intervento.alloggio && "Alloggio"}
                                {(!intervento.vitto && !intervento.autostrada && !intervento.alloggio) && "-"}
                            </td>
                            <td className="actions">
                                {canModifyInterventi ? (
                                    <>
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
                                    </>
                                ) : (
                                    <button
                                        className="button secondary small"
                                        onClick={() => handleOpenInterventoForm(intervento, true)}
                                        disabled={actionLoading || showInterventoForm}
                                    >
                                        Visualizza
                                    </button>
                                )}
                            </td>
                        </tr>
                        ))}
                    </tbody>
                </table>
                </div>
                )
            )}
        </div>
    );
}
export default FoglioAssistenzaDetailPage;