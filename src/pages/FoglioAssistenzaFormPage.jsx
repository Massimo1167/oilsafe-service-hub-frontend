// src/pages/FoglioAssistenzaFormPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SignatureCanvas from 'react-signature-canvas';

// Funzione helper per convertire dataURL in Blob
function dataURLtoBlob(dataurl) {
    if (!dataurl) return null;
    try {
        const arr = dataurl.split(',');
        if (arr.length < 2) return null;
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch || mimeMatch.length < 2) return null;
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    } catch (e) {
        console.error("Errore nella conversione dataURLtoBlob:", e);
        return null;
    }
}

function FoglioAssistenzaFormPage({ session, clienti, commesse, ordini /*, utentiPerAssegnazione */ }) {
    const navigate = useNavigate();
    const { foglioIdParam } = useParams(); // Rinominato per chiarezza
    const isEditMode = !!foglioIdParam;

    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode); // Inizia a caricare se in edit mode
    const [error, setError] = useState(null);

    // Stati del Form
    const [numeroFoglio, setNumeroFoglio] = useState('');
    const [dataApertura, setDataApertura] = useState(new Date().toISOString().split('T')[0]);
    const [selectedClienteId, setSelectedClienteId] = useState('');
    const [referenteCliente, setReferenteCliente] = useState('');
    const [motivoGenerale, setMotivoGenerale] = useState('');
    const [selectedCommessaId, setSelectedCommessaId] = useState('');
    const [selectedOrdineId, setSelectedOrdineId] = useState('');
    const [descrizioneGenerale, setDescrizioneGenerale] = useState('');
    const [osservazioniGenerali, setOsservazioniGenerali] = useState('');
    const [materialiForniti, setMaterialiForniti] = useState('');
    const [statoFoglio, setStatoFoglio] = useState('Aperto');
    const [creatoDaUserIdOriginal, setCreatoDaUserIdOriginal] = useState(''); // Per mantenere l'ID originale in edit mode
    // const [selectedAssegnaUtenteId, setSelectedAssegnaUtenteId] = useState(''); // Per dropdown di assegnazione admin

    const sigCanvasClienteRef = useRef(null);
    const sigCanvasTecnicoRef = useRef(null);

    const [firmaClientePreview, setFirmaClientePreview] = useState(null);
    const [firmaTecnicoPreview, setFirmaTecnicoPreview] = useState(null);

    const userRole = session?.user?.role;
    const currentUserId = session?.user?.id;

    // Permessi: admin può sempre, user può creare, user/manager possono modificare se le policy lo permettono
    const canSubmitForm = 
        userRole === 'admin' || 
        (!isEditMode && userRole === 'user') || 
        (isEditMode && (userRole === 'manager' || (userRole === 'user' && creatoDaUserIdOriginal === currentUserId)));


    useEffect(() => {
        if (isEditMode && foglioIdParam && session) { // Assicurati che la sessione sia caricata
            setPageLoading(true);
            const fetchFoglioData = async () => {
                const { data, error: fetchError } = await supabase
                    .from('fogli_assistenza')
                    .select('*') // Seleziona tutto per popolare tutti i campi
                    .eq('id', foglioIdParam)
                    .single();
                
                if (fetchError) {
                    setError("Errore caricamento dati foglio: " + fetchError.message);
                    console.error(fetchError);
                } else if (data) {
                    // Popola gli stati del form
                    setNumeroFoglio(data.numero_foglio || '');
                    setDataApertura(data.data_apertura_foglio ? new Date(data.data_apertura_foglio).toISOString().split('T')[0] : '');
                    setSelectedClienteId(data.cliente_id || '');
                    setReferenteCliente(data.referente_cliente_richiesta || '');
                    setMotivoGenerale(data.motivo_intervento_generale || '');
                    setSelectedCommessaId(data.commessa_id || '');
                    setSelectedOrdineId(data.ordine_cliente_id || '');
                    setDescrizioneGenerale(data.descrizione_lavoro_generale || '');
                    setOsservazioniGenerali(data.osservazioni_generali || '');
                    setMaterialiForniti(data.materiali_forniti_generale || '');
                    setStatoFoglio(data.stato_foglio || 'Aperto');
                    setCreatoDaUserIdOriginal(data.creato_da_user_id || ''); // Salva l'originale
                    // setSelectedAssegnaUtenteId(data.creato_da_user_id || ''); // Per il dropdown admin
                    setFirmaClientePreview(data.firma_cliente_url || null);
                    setFirmaTecnicoPreview(data.firma_tecnico_principale_url || null);
                } else {
                    setError("Foglio non trovato.");
                }
                setPageLoading(false);
            };
            fetchFoglioData();
        } else if (!isEditMode) {
            setPageLoading(false); // Non c'è nulla da caricare in modalità creazione
        }
    }, [isEditMode, foglioIdParam, session]);


    const clearSignature = (ref, setPreviewStateKey) => {
        if (ref.current) ref.current.clear();
        if (setPreviewStateKey === 'cliente') setFirmaClientePreview(null);
        if (setPreviewStateKey === 'tecnico') setFirmaTecnicoPreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmitForm) {
            alert("Non hai i permessi per eseguire questa operazione su questo foglio.");
            return;
        }
        setLoadingSubmit(true);
        setError(null);

        if (!selectedClienteId) {
            setError("Selezionare un cliente è obbligatorio.");
            setLoadingSubmit(false);
            return;
        }

        let finalFirmaClienteUrl = firmaClientePreview;
        let finalFirmaTecnicoUrl = firmaTecnicoPreview;

        // Upload firma cliente se ridisegnata
        if (sigCanvasClienteRef.current && !sigCanvasClienteRef.current.isEmpty()) {
            const firmaDataURL = sigCanvasClienteRef.current.getTrimmedCanvas().toDataURL('image/png');
            const fileBlob = dataURLtoBlob(firmaDataURL);
            if (fileBlob) {
                const fileName = `firma_cliente_${foglioIdParam || currentUserId}_${Date.now()}.png`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('firme-assistenza')
                    .upload(fileName, fileBlob, { upsert: true, contentType: 'image/png' });
                if (uploadError) { setError("Upload firma cliente fallito: " + uploadError.message); setLoadingSubmit(false); return; }
                finalFirmaClienteUrl = supabase.storage.from('firme-assistenza').getPublicUrl(uploadData.path).data.publicUrl;
            }
        }
        
        // Upload firma tecnico se ridisegnata
        if (sigCanvasTecnicoRef.current && !sigCanvasTecnicoRef.current.isEmpty()) {
            const firmaDataURL = sigCanvasTecnicoRef.current.getTrimmedCanvas().toDataURL('image/png');
            const fileBlob = dataURLtoBlob(firmaDataURL);
            if (fileBlob) {
                const fileName = `firma_tecnico_${foglioIdParam || currentUserId}_${Date.now()}.png`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('firme-assistenza')
                    .upload(fileName, fileBlob, { upsert: true, contentType: 'image/png' });
                if (uploadError) { setError("Upload firma tecnico fallito: " + uploadError.message); setLoadingSubmit(false); return; }
                finalFirmaTecnicoUrl = supabase.storage.from('firme-assistenza').getPublicUrl(uploadData.path).data.publicUrl;
            }
        }

        const foglioPayload = {
          numero_foglio: numeroFoglio || null,
          data_apertura_foglio: dataApertura,
          cliente_id: selectedClienteId,
          referente_cliente_richiesta: referenteCliente,
          motivo_intervento_generale: motivoGenerale,
          commessa_id: selectedCommessaId || null,
          ordine_cliente_id: selectedOrdineId || null,
          descrizione_lavoro_generale: descrizioneGenerale,
          osservazioni_generali: osservazioniGenerali,
          materiali_forniti_generale: materialiForniti,
          firma_cliente_url: finalFirmaClienteUrl,
          firma_tecnico_principale_url: finalFirmaTecnicoUrl,
          stato_foglio: statoFoglio,
        };
        
        // Gestione `creato_da_user_id`
        if (!isEditMode) { // Solo in creazione
            if (userRole === 'user') {
                foglioPayload.creato_da_user_id = currentUserId;
            } else if (userRole === 'admin' /* && selectedAssegnaUtenteId */) {
                // foglioPayload.creato_da_user_id = selectedAssegnaUtenteId || currentUserId; // Admin assegna o è lui
            }
            // Se manager crea (non dovrebbe secondo le regole attuali), gestisci qui
        } else {
            // In modifica, non cambiamo `creato_da_user_id` a meno che un admin non lo faccia esplicitamente
            // if (userRole === 'admin' && selectedAssegnaUtenteId !== creatoDaUserIdOriginal) {
            //     foglioPayload.creato_da_user_id = selectedAssegnaUtenteId;
            // }
        }


        let resultData, resultError;
        if (isEditMode) {
          const { data, error } = await supabase
            .from('fogli_assistenza')
            .update(foglioPayload)
            .eq('id', foglioIdParam)
            .select()
            .single();
            resultData = data;
            resultError = error;
        } else {
          const { data, error } = await supabase
            .from('fogli_assistenza')
            .insert([foglioPayload])
            .select()
            .single();
            resultData = data;
            resultError = error;
        }

        if (resultError) {
            setError(resultError.message);
            console.error(isEditMode ? "Errore aggiornamento foglio:" : "Errore inserimento foglio:", resultError);
            alert((isEditMode ? "Errore aggiornamento: " : "Errore inserimento: ") + resultError.message);
        } else if (resultData) {
            alert(isEditMode ? "Foglio di assistenza aggiornato!" : "Foglio di assistenza creato!");
            navigate(`/fogli-assistenza/${resultData.id}`);
        }
        setLoadingSubmit(false);
    };
      
    const commesseFiltrate = selectedClienteId && commesse
        ? commesse.filter(c => c.cliente_id === selectedClienteId || !c.cliente_id)
        : (commesse || []);
    const ordiniFiltrati = selectedClienteId && ordini
        ? ordini.filter(o => o.cliente_id === selectedClienteId)
        : (ordini || []);

    if (pageLoading) return <p>Caricamento dati foglio...</p>;
    if (!session) return <Navigate to="/login" replace />;
    if (!canSubmitForm && isEditMode) return <p>Non hai i permessi per modificare questo foglio.</p>;
    if (!canSubmitForm && !isEditMode) return <p>Non hai i permessi per creare un nuovo foglio.</p>;


    return (
        <div>
          <Link to={isEditMode ? `/fogli-assistenza/${foglioIdParam}` : "/fogli-assistenza"}>
            ← Torna {isEditMode ? 'al dettaglio foglio' : 'alla lista'}
          </Link>
          <h2>{isEditMode ? "Modifica Intestazione Foglio Assistenza" : "Nuovo Foglio Assistenza"}</h2>
          <form onSubmit={handleSubmit}>
            {/* ... (tutti i campi del form come prima) ... */}
            {/* Numero Foglio, Data Apertura, Cliente, Referente ... */}
            <div>
              <label htmlFor="numeroFoglio">Numero Foglio (opzionale):</label>
              <input type="text" id="numeroFoglio" value={numeroFoglio} onChange={(e) => setNumeroFoglio(e.target.value)} />
            </div>
            <div>
              <label htmlFor="dataApertura">Data Apertura:</label>
              <input type="date" id="dataApertura" value={dataApertura} onChange={(e) => setDataApertura(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="cliente">Cliente:</label>
              <select id="cliente" value={selectedClienteId} onChange={(e) => {
                  setSelectedClienteId(e.target.value);
                  setSelectedCommessaId(''); setSelectedOrdineId('');
                }} required>
                <option value="">Seleziona Cliente</option>
                {(clienti || []).map(c => <option key={c.id} value={c.id}>{c.nome_azienda}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="referenteCliente">Referente Cliente (per richiesta):</label>
              <input type="text" id="referenteCliente" value={referenteCliente} onChange={(e) => setReferenteCliente(e.target.value)} />
            </div>

            {/*  Sezione Assegna Utente per Admin (da implementare se necessario)
            {userRole === 'admin' && (
                <div>
                    <label htmlFor="assegnaUtente">Assegna/Creato da Utente:</label>
                    <select id="assegnaUtente" value={selectedAssegnaUtenteId} onChange={e => setSelectedAssegnaUtenteId(e.target.value)}>
                        <option value="">{isEditMode && creatoDaUserIdOriginal ? "Mantieni esistente" : (userRole === 'admin' ? "Assegna a te stesso (Admin)" : "")}</option>
                        {(utentiPerAssegnazione || []).map(u => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                    </select>
                </div>
            )}
            */}
            <div>
              <label htmlFor="commessa">Commessa:</label>
              <select id="commessa" value={selectedCommessaId} onChange={(e) => setSelectedCommessaId(e.target.value)} disabled={!selectedClienteId}>
                <option value="">Nessuna Commessa</option>
                {commesseFiltrate.map(c => <option key={c.id} value={c.id}>{c.codice_commessa} - {c.descrizione_commessa}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ordine">Ordine Cliente:</label>
              <select id="ordine" value={selectedOrdineId} onChange={(e) => setSelectedOrdineId(e.target.value)} disabled={!selectedClienteId}>
                <option value="">Nessun Ordine</option>
                {ordiniFiltrati.map(o => <option key={o.id} value={o.id}>{o.numero_ordine_cliente} - {o.descrizione_ordine}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="motivoGenerale">Motivo Intervento Generale:</label>
              <textarea id="motivoGenerale" value={motivoGenerale} onChange={(e) => setMotivoGenerale(e.target.value)} />
            </div>
            <div>
              <label htmlFor="descrizioneGenerale">Descrizione Lavoro Generale:</label>
              <textarea id="descrizioneGenerale" value={descrizioneGenerale} onChange={(e) => setDescrizioneGenerale(e.target.value)} />
            </div>
            <div>
              <label htmlFor="materialiForniti">Materiali Forniti (Generale):</label>
              <textarea id="materialiForniti" value={materialiForniti} onChange={(e) => setMaterialiForniti(e.target.value)} />
            </div>
            <div>
              <label htmlFor="osservazioniGenerali">Osservazioni Generali:</label>
              <textarea id="osservazioniGenerali" value={osservazioniGenerali} onChange={(e) => setOsservazioniGenerali(e.target.value)} />
            </div>

            {/* Firme */}
            <div>
              <label>Firma Cliente:</label>
              {isEditMode && firmaClientePreview && (
                <div style={{marginBottom: '10px'}}>
                    <img src={firmaClientePreview} alt="Firma Cliente Esistente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '100px'}}/>
                    <button type="button" className="secondary" style={{fontSize:'0.8em', padding:'0.2em 0.5em', marginLeft:'5px'}} onClick={() => {setFirmaClientePreview(null); if(sigCanvasClienteRef.current) sigCanvasClienteRef.current.clear();}}>Ridisegna</button>
                </div>
              )}
              {(!isEditMode || !firmaClientePreview) && ( // Mostra canvas se in creazione o se preview è stata rimossa
                <>
                  <div className="signature-pad-container">
                    <SignatureCanvas penColor='blue' canvasProps={{ width: 400, height: 150, className: 'sigCanvasCliente' }} ref={sigCanvasClienteRef} />
                  </div>
                  <button type="button" className="secondary" onClick={() => clearSignature(sigCanvasClienteRef, 'cliente')}>Cancella Disegno</button>
                </>
              )}
            </div>
            <div>
              <label>Firma Tecnico Responsabile:</label>
               {isEditMode && firmaTecnicoPreview && (
                <div style={{marginBottom: '10px'}}>
                    <img src={firmaTecnicoPreview} alt="Firma Tecnico Esistente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '100px'}}/>
                    <button type="button" className="secondary" style={{fontSize:'0.8em', padding:'0.2em 0.5em', marginLeft:'5px'}} onClick={() => {setFirmaTecnicoPreview(null); if(sigCanvasTecnicoRef.current) sigCanvasTecnicoRef.current.clear();}}>Ridisegna</button>
                </div>
              )}
              {(!isEditMode || !firmaTecnicoPreview) && (
                <>
                  <div className="signature-pad-container">
                    <SignatureCanvas penColor='black' canvasProps={{ width: 400, height: 150, className: 'sigCanvasTecnico' }} ref={sigCanvasTecnicoRef} />
                  </div>
                  <button type="button" className="secondary" onClick={() => clearSignature(sigCanvasTecnicoRef, 'tecnico')}>Cancella Disegno</button>
                </>
              )}
            </div>
            
            <div>
                <label htmlFor="statoFoglio">Stato Foglio:</label>
                <select id="statoFoglio" value={statoFoglio} onChange={e => setStatoFoglio(e.target.value)}>
                    <option value="Aperto">Aperto</option>
                    <option value="In Lavorazione">In Lavorazione</option>
                    <option value="Attesa Firma">Attesa Firma</option>
                    <option value="Completato">Completato</option>
                    <option value="Chiuso">Chiuso</option>
                </select>
            </div>

            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}
            <button type="submit" disabled={loadingSubmit || !canSubmitForm} style={{marginTop:'20px'}}>
              {loadingSubmit ? "Salvataggio..." : (isEditMode ? "Aggiorna Intestazione Foglio" : "Crea Foglio Assistenza")}
            </button>
          </form>
        </div>
    );
}
export default FoglioAssistenzaFormPage;