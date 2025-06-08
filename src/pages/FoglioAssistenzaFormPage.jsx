// src/pages/FoglioAssistenzaFormPage.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SignatureCanvas from 'react-signature-canvas';

// Funzione helper per convertire dataURL in Blob (da spostare in un file utils se usata altrove)
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

function FoglioAssistenzaFormPage({ session, clienti, commesse, ordini }) {
    const navigate = useNavigate();
    const { foglioIdParam } = useParams(); 
    const isEditMode = !!foglioIdParam;

    // Stati del Form
    const [formNumeroFoglio, setFormNumeroFoglio] = useState('');
    const [formDataApertura, setFormDataApertura] = useState(new Date().toISOString().split('T')[0]);
    const [formSelectedClienteId, setFormSelectedClienteId] = useState('');
    const [formReferenteCliente, setFormReferenteCliente] = useState('');
    const [formMotivoGenerale, setFormMotivoGenerale] = useState('');
    const [formSelectedCommessaId, setFormSelectedCommessaId] = useState('');
    const [formSelectedOrdineId, setFormSelectedOrdineId] = useState('');
    const [formDescrizioneGenerale, setFormDescrizioneGenerale] = useState('');
    const [formOsservazioniGenerali, setFormOsservazioniGenerali] = useState('');
    const [formMaterialiForniti, setFormMaterialiForniti] = useState('');
    const [formStatoFoglio, setFormStatoFoglio] = useState('Aperto');
    const [formCreatoDaUserIdOriginal, setFormCreatoDaUserIdOriginal] = useState(''); // Per mantenere l'ID originale in edit mode
    // const [formSelectedAssegnaUtenteId, setFormSelectedAssegnaUtenteId] = useState(''); // Per admin che assegna foglio (da implementare se necessario)

    // Stati per i Filtri dei Dropdown
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroCommessa, setFiltroCommessa] = useState('');
    const [filtroOrdine, setFiltroOrdine] = useState('');

    // Stati generali della pagina
    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode); 
    const [error, setError] = useState(null);

    // Ref per le firme
    const sigCanvasClienteRef = useRef(null);
    const sigCanvasTecnicoRef = useRef(null);

    // Stati per le preview delle firme (URL da DB)
    const [firmaClientePreview, setFirmaClientePreview] = useState(null);
    const [firmaTecnicoPreview, setFirmaTecnicoPreview] = useState(null);

    const userRole = session?.user?.role;
    const currentUserId = session?.user?.id;

    // Determina se l'utente può sottomettere il form
    const canSubmitForm = 
        userRole === 'admin' || 
        (!isEditMode && userRole === 'user') || 
        (isEditMode && (userRole === 'manager' || (userRole === 'user' && formCreatoDaUserIdOriginal === currentUserId)));

    // Carica i dati del foglio se siamo in modalità modifica
    useEffect(() => {
        if (isEditMode && foglioIdParam && session) {
            setPageLoading(true);
            const fetchFoglioData = async () => {
                const { data, error: fetchError } = await supabase
                    .from('fogli_assistenza')
                    .select('*')
                    .eq('id', foglioIdParam)
                    .single();
                
                if (fetchError) { 
                    setError("Errore caricamento dati foglio: " + fetchError.message); 
                    console.error("Fetch foglio error:", fetchError);
                } else if (data) {
                    setFormNumeroFoglio(data.numero_foglio || '');
                    setFormDataApertura(data.data_apertura_foglio ? new Date(data.data_apertura_foglio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                    setFormSelectedClienteId(data.cliente_id || '');
                    setFormReferenteCliente(data.referente_cliente_richiesta || '');
                    setFormMotivoGenerale(data.motivo_intervento_generale || '');
                    setFormSelectedCommessaId(data.commessa_id || '');
                    setFormSelectedOrdineId(data.ordine_cliente_id || '');
                    setFormDescrizioneGenerale(data.descrizione_lavoro_generale || '');
                    setFormOsservazioniGenerali(data.osservazioni_generali || '');
                    setFormMaterialiForniti(data.materiali_forniti_generale || '');
                    setFormStatoFoglio(data.stato_foglio || 'Aperto');
                    setFormCreatoDaUserIdOriginal(data.creato_da_user_id || '');
                    // setSelectedAssegnaUtenteId(data.creato_da_user_id || ''); // Se admin assegna
                    setFirmaClientePreview(data.firma_cliente_url || null);
                    setFirmaTecnicoPreview(data.firma_tecnico_principale_url || null);
                } else {
                    setError("Foglio di assistenza non trovato.");
                }
                setPageLoading(false);
            };
            fetchFoglioData();
        } else if (!isEditMode) {
            setPageLoading(false); // Non c'è nulla da caricare in modalità creazione
        }
    }, [isEditMode, foglioIdParam, session]);

    const clearSignature = (ref, previewSetter) => {
        if (ref.current) ref.current.clear();
        if (previewSetter) previewSetter(null); 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmitForm) {
            alert("Non hai i permessi per eseguire questa operazione.");
            return;
        }
        setLoadingSubmit(true);
        setError(null);

        if (!formSelectedClienteId) {
            setError("Selezionare un cliente è obbligatorio.");
            setLoadingSubmit(false);
            return;
        }

        let firmaClienteUrlToSave = firmaClientePreview; 
        let firmaTecnicoUrlToSave = firmaTecnicoPreview;

        // Gestione upload firma cliente se è stata disegnata una nuova firma
        if (sigCanvasClienteRef.current && !sigCanvasClienteRef.current.isEmpty()) {
            const firmaClienteDataURL = sigCanvasClienteRef.current.toDataURL('image/png'); // Usiamo toDataURL invece di getTrimmedCanvas per evitare l'errore
            const fileBlob = dataURLtoBlob(firmaClienteDataURL);
            if (fileBlob) {
                const fileName = `firma_cliente_${foglioIdParam || currentUserId || 'new'}_${Date.now()}.png`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('firme-assistenza')
                    .upload(fileName, fileBlob, { upsert: true, contentType: 'image/png' }); 
                
                if (uploadError) { setError("Upload firma cliente fallito: " + uploadError.message); setLoadingSubmit(false); return; }
                const { data: urlData } = supabase.storage.from('firme-assistenza').getPublicUrl(uploadData.path);
                firmaClienteUrlToSave = urlData.publicUrl;
            }
        }
        
        // Gestione upload firma tecnico se ridisegnata
        if (sigCanvasTecnicoRef.current && !sigCanvasTecnicoRef.current.isEmpty()) {
            const firmaTecnicoDataURL = sigCanvasTecnicoRef.current.toDataURL('image/png'); // Usiamo toDataURL
            const fileBlobTecnico = dataURLtoBlob(firmaTecnicoDataURL);
            if (fileBlobTecnico) {
                const fileNameTecnico = `firma_tecnico_${foglioIdParam || currentUserId || 'new'}_${Date.now()}.png`;
                const { data: uploadDataTecnico, error: uploadErrorTecnico } = await supabase.storage
                    .from('firme-assistenza')
                    .upload(fileNameTecnico, fileBlobTecnico, { upsert: true, contentType: 'image/png' });

                if (uploadErrorTecnico) { setError("Upload firma tecnico fallito: " + uploadErrorTecnico.message); setLoadingSubmit(false); return; }
                const { data: urlDataTecnico } = supabase.storage.from('firme-assistenza').getPublicUrl(uploadDataTecnico.path);
                firmaTecnicoUrlToSave = urlDataTecnico.publicUrl;
            }
        }

        const foglioPayload = {
          numero_foglio: formNumeroFoglio.trim() || null, 
          data_apertura_foglio: formDataApertura, 
          cliente_id: formSelectedClienteId,
          referente_cliente_richiesta: formReferenteCliente.trim(), 
          motivo_intervento_generale: formMotivoGenerale.trim(),
          commessa_id: formSelectedCommessaId || null, 
          ordine_cliente_id: formSelectedOrdineId || null,
          descrizione_lavoro_generale: formDescrizioneGenerale.trim(), 
          osservazioni_generali: formOsservazioniGenerali.trim(),
          materiali_forniti_generale: formMaterialiForniti.trim(), 
          firma_cliente_url: firmaClienteUrlToSave,
          firma_tecnico_principale_url: firmaTecnicoUrlToSave,
          stato_foglio: formStatoFoglio,
        };
        
        if (!isEditMode) { 
            if (userRole === 'user' && currentUserId) {
                foglioPayload.creato_da_user_id = currentUserId;
            } else if (userRole === 'admin' /* && formSelectedAssegnaUtenteId */) {
                // foglioPayload.creato_da_user_id = formSelectedAssegnaUtenteId || currentUserId; // Admin assegna o è lui
            }
        } else {
            // In modifica, non cambiamo creato_da_user_id a meno di logica specifica per admin
            // if (userRole === 'admin' && formSelectedAssegnaUtenteId && formSelectedAssegnaUtenteId !== formCreatoDaUserIdOriginal) {
            //     foglioPayload.creato_da_user_id = formSelectedAssegnaUtenteId;
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
            alert(isEditMode ? "Foglio di assistenza aggiornato con successo!" : "Foglio di assistenza creato con successo!");
            navigate(`/fogli-assistenza/${resultData.id}`);
        }
        setLoadingSubmit(false);
    };
      
    // Liste filtrate e ordinate per i dropdown
    const clientiOrdinati = useMemo(() => 
        [...(clienti || [])].sort((a, b) => a.nome_azienda.localeCompare(b.nome_azienda)), 
    [clienti]);

    const clientiFiltrati = useMemo(() => 
        clientiOrdinati.filter(c => c.nome_azienda.toLowerCase().includes(filtroCliente.toLowerCase())),
    [clientiOrdinati, filtroCliente]);

    const commesseDisponibili = useMemo(() => 
        formSelectedClienteId && commesse 
        ? [...(commesse || [])].filter(c => c.cliente_id === formSelectedClienteId || !c.cliente_id) // Mostra specifiche del cliente + generiche
                               .sort((a,b) => a.codice_commessa.localeCompare(b.codice_commessa))
        : [...(commesse || [])].sort((a,b) => a.codice_commessa.localeCompare(b.codice_commessa)), // Mostra tutte se nessun cliente selezionato
    [commesse, formSelectedClienteId]);
    
    const commesseFiltrate = useMemo(() =>
        commesseDisponibili.filter(c => 
            c.codice_commessa.toLowerCase().includes(filtroCommessa.toLowerCase()) || 
            (c.descrizione_commessa || '').toLowerCase().includes(filtroCommessa.toLowerCase())
        ),
    [commesseDisponibili, filtroCommessa]);

    const ordiniDisponibili = useMemo(() =>
        formSelectedClienteId && ordini
        ? [...(ordini || [])].filter(o => o.cliente_id === formSelectedClienteId)
                             .sort((a,b) => a.numero_ordine_cliente.localeCompare(b.numero_ordine_cliente))
        : [...(ordini || [])].sort((a,b) => a.numero_ordine_cliente.localeCompare(b.numero_ordine_cliente)), // Mostra tutti se nessun cliente
    [ordini, formSelectedClienteId]);

    const ordiniFiltrati = useMemo(() =>
        ordiniDisponibili.filter(o => 
            o.numero_ordine_cliente.toLowerCase().includes(filtroOrdine.toLowerCase()) ||
            (o.descrizione_ordine || '').toLowerCase().includes(filtroOrdine.toLowerCase())
        ),
    [ordiniDisponibili, filtroOrdine]);


    if (pageLoading) return <p>Caricamento dati foglio...</p>;
    if (!session) return <Navigate to="/login" replace />;
    if (!canSubmitForm && isEditMode && !pageLoading) return <p>Non hai i permessi per modificare questo foglio.</p>; // Mostra solo se non sta caricando
    if (!canSubmitForm && !isEditMode) return <p>Non hai i permessi per creare un nuovo foglio.</p>;


    return (
        <div>
          <Link to={isEditMode ? `/fogli-assistenza/${foglioIdParam}` : "/fogli-assistenza"}>
            ← Torna {isEditMode ? 'al dettaglio foglio' : 'alla lista'}
          </Link>
          <h2>{isEditMode ? "Modifica Intestazione Foglio Assistenza" : "Nuovo Foglio Assistenza"}</h2>
          <form onSubmit={handleSubmit}>
            <div>
              <label htmlFor="formNumeroFoglio">Numero Foglio (opzionale):</label>
              <input type="text" id="formNumeroFoglio" value={formNumeroFoglio} onChange={(e) => setFormNumeroFoglio(e.target.value)} />
            </div>
            <div>
              <label htmlFor="formDataApertura">Data Apertura:</label>
              <input type="date" id="formDataApertura" value={formDataApertura} onChange={(e) => setFormDataApertura(e.target.value)} required />
            </div>
            
            <div>
              <label htmlFor="cliente">Cliente:</label>
              <input 
                type="text" 
                placeholder="Filtra cliente per nome..." 
                value={filtroCliente} 
                onChange={e => setFiltroCliente(e.target.value)} 
                style={{marginBottom:'5px', width:'calc(100% - 22px)'}} // Aggiustato width per padding/border
              />
              <select 
                id="cliente" 
                value={formSelectedClienteId} 
                onChange={(e) => {
                  setFormSelectedClienteId(e.target.value);
                  setFormSelectedCommessaId(''); 
                  setFormSelectedOrdineId('');
                  setFiltroCliente(''); 
                }} 
                required
              >
                <option value="">Seleziona Cliente ({clientiFiltrati.length} trovati)</option>
                {clientiFiltrati.map(c => <option key={c.id} value={c.id}>{c.nome_azienda}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="formReferenteCliente">Referente Cliente (per richiesta):</label>
              <input type="text" id="formReferenteCliente" value={formReferenteCliente} onChange={(e) => setFormReferenteCliente(e.target.value)} />
            </div>
            
            <div>
              <label htmlFor="commessa">Commessa:</label>
              <input 
                type="text" 
                placeholder="Filtra commessa per codice/desc..." 
                value={filtroCommessa} 
                onChange={e => setFiltroCommessa(e.target.value)} 
                disabled={!formSelectedClienteId && commesse.some(c => c.cliente_id)}
                style={{marginBottom:'5px', width:'calc(100% - 22px)'}}
              />
              <select 
                id="commessa" 
                value={formSelectedCommessaId} 
                onChange={(e) => { setFormSelectedCommessaId(e.target.value); setFiltroCommessa(''); }} 
              >
                <option value="">Nessuna Commessa ({commesseFiltrate.length} trovate)</option>
                {commesseFiltrate.map(c => <option key={c.id} value={c.id}>{c.codice_commessa} - {c.descrizione_commessa}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="ordine">Ordine Cliente:</label>
               <input 
                type="text" 
                placeholder="Filtra ordine per numero/desc..." 
                value={filtroOrdine} 
                onChange={e => setFiltroOrdine(e.target.value)} 
                disabled={!formSelectedClienteId}
                style={{marginBottom:'5px', width:'calc(100% - 22px)'}}
              />
              <select 
                id="ordine" 
                value={formSelectedOrdineId} 
                onChange={(e) => { setFormSelectedOrdineId(e.target.value); setFiltroOrdine(''); }} 
                disabled={!formSelectedClienteId}
               >
                <option value="">Nessun Ordine ({ordiniFiltrati.length} trovati)</option>
                {ordiniFiltrati.map(o => <option key={o.id} value={o.id}>{o.numero_ordine_cliente} - {o.descrizione_ordine}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="formMotivoGenerale">Motivo Intervento Generale:</label>
              <textarea id="formMotivoGenerale" value={formMotivoGenerale} onChange={(e) => setFormMotivoGenerale(e.target.value)} />
            </div>
            <div>
              <label htmlFor="formDescrizioneGenerale">Descrizione Lavoro Generale:</label>
              <textarea id="formDescrizioneGenerale" value={formDescrizioneGenerale} onChange={(e) => setFormDescrizioneGenerale(e.target.value)} />
            </div>
            <div>
              <label htmlFor="formMaterialiForniti">Materiali Forniti (Generale):</label>
              <textarea id="formMaterialiForniti" value={formMaterialiForniti} onChange={(e) => setFormMaterialiForniti(e.target.value)} />
            </div>
            <div>
              <label htmlFor="formOsservazioniGenerali">Osservazioni Generali:</label>
              <textarea id="formOsservazioniGenerali" value={formOsservazioniGenerali} onChange={(e) => setFormOsservazioniGenerali(e.target.value)} />
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
              {(!isEditMode || !firmaClientePreview) && (
                <>
                  <div className="signature-pad-container">
                    <SignatureCanvas penColor='blue' canvasProps={{ width: 400, height: 150, className: 'sigCanvasCliente' }} ref={sigCanvasClienteRef} />
                  </div>
                  <button type="button" className="secondary" onClick={() => clearSignature(sigCanvasClienteRef, setFirmaClientePreview)}>Cancella Disegno</button>
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
                  <button type="button" className="secondary" onClick={() => clearSignature(sigCanvasTecnicoRef, setFirmaTecnicoPreview)}>Cancella Disegno</button>
                </>
              )}
            </div>
            
            <div>
                <label htmlFor="formStatoFoglio">Stato Foglio:</label>
                <select id="formStatoFoglio" value={formStatoFoglio} onChange={e => setFormStatoFoglio(e.target.value)}>
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
            {isEditMode && (
                 <button type="button" className="secondary" onClick={() => navigate(`/fogli-assistenza/${foglioIdParam}`)} disabled={loadingSubmit} style={{marginLeft:'10px'}}>
                    Annulla Modifica
                </button>
            )}
          </form>
        </div>
    );
}
export default FoglioAssistenzaFormPage;