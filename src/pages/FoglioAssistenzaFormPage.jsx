// src/pages/FoglioAssistenzaFormPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    const { foglioId: foglioIdParam } = useParams(); // Per la modalità modifica (non ancora implementata completamente)
    const isEditMode = !!foglioIdParam;

    const [loading, setLoading] = useState(false); // Loading per l'azione di submit
    const [pageLoading, setPageLoading] = useState(false); // Loading per caricare dati in edit mode
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
    const [creatoDaUserIdForm, setCreatoDaUserIdForm] = useState(''); // Per admin che assegna foglio

    // Ref per le firme
    const sigCanvasClienteRef = useRef(null);
    const sigCanvasTecnicoRef = useRef(null);

    // Dati per le firme (URL o base64 se non si fa l'upload immediato)
    const [firmaClientePreview, setFirmaClientePreview] = useState(null);
    const [firmaTecnicoPreview, setFirmaTecnicoPreview] = useState(null);

    const userRole = session?.user?.role;
    const currentUserId = session?.user?.id;

    // Solo admin e user possono creare fogli (come definito in App.jsx)
    // Se isEditMode, anche manager potrebbe modificare (da gestire con policy RLS)
    const canSubmit = userRole === 'admin' || userRole === 'user' || (isEditMode && userRole === 'manager');

    useEffect(() => {
        if (isEditMode && foglioIdParam) {
            setPageLoading(true);
            const fetchFoglioData = async () => {
                const { data, error: fetchError } = await supabase
                    .from('fogli_assistenza')
                    .select('*')
                    .eq('id', foglioIdParam)
                    .single();
                
                if (fetchError) {
                    setError("Errore caricamento dati foglio: " + fetchError.message);
                    console.error(fetchError);
                } else if (data) {
                    setNumeroFoglio(data.numero_foglio || '');
                    setDataApertura(data.data_apertura_foglio);
                    setSelectedClienteId(data.cliente_id);
                    setReferenteCliente(data.referente_cliente_richiesta || '');
                    setMotivoGenerale(data.motivo_intervento_generale || '');
                    setSelectedCommessaId(data.commessa_id || '');
                    setSelectedOrdineId(data.ordine_cliente_id || '');
                    setDescrizioneGenerale(data.descrizione_lavoro_generale || '');
                    setOsservazioniGenerali(data.osservazioni_generali || '');
                    setMaterialiForniti(data.materiali_forniti_generale || '');
                    setStatoFoglio(data.stato_foglio || 'Aperto');
                    setCreatoDaUserIdForm(data.creato_da_user_id || '');
                    setFirmaClientePreview(data.firma_cliente_url || null); // Per visualizzare firma esistente
                    setFirmaTecnicoPreview(data.firma_tecnico_principale_url || null);
                }
                setPageLoading(false);
            };
            fetchFoglioData();
        }
    }, [isEditMode, foglioIdParam]);


    const clearSignature = (ref, setPreview) => {
        if (ref.current) ref.current.clear();
        if (setPreview) setPreview(null); // Pulisce anche la preview della firma esistente
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmit) {
            alert("Non hai i permessi per questa operazione.");
            return;
        }
        setLoading(true);
        setError(null);

        if (!selectedClienteId) {
            setError("Selezionare un cliente è obbligatorio.");
            setLoading(false);
            return;
        }

        let firmaClienteUrlToSave = firmaClientePreview; // Mantiene URL esistente se non si firma di nuovo
        let firmaTecnicoUrlToSave = firmaTecnicoPreview;

        // Gestione upload firma cliente se è stata disegnata una nuova firma
        if (sigCanvasClienteRef.current && !sigCanvasClienteRef.current.isEmpty()) {
            const firmaClienteDataURL = sigCanvasClienteRef.current.getTrimmedCanvas().toDataURL('image/png');
            const fileBlob = dataURLtoBlob(firmaClienteDataURL);
            if (fileBlob) {
                const fileName = `firma_cliente_${foglioIdParam || Date.now()}.png`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('firme-assistenza')
                    .upload(fileName, fileBlob, { upsert: true, contentType: 'image/png' }); // upsert:true sovrascrive se esiste
                
                if (uploadError) {
                    setError("Errore upload firma cliente: " + uploadError.message);
                    setLoading(false);
                    return;
                }
                const { data: urlData } = supabase.storage.from('firme-assistenza').getPublicUrl(uploadData.path);
                firmaClienteUrlToSave = urlData.publicUrl;
            }
        }
        
        // Gestione upload firma tecnico
        if (sigCanvasTecnicoRef.current && !sigCanvasTecnicoRef.current.isEmpty()) {
            const firmaTecnicoDataURL = sigCanvasTecnicoRef.current.getTrimmedCanvas().toDataURL('image/png');
            const fileBlobTecnico = dataURLtoBlob(firmaTecnicoDataURL);
            if (fileBlobTecnico) {
                const fileNameTecnico = `firma_tecnico_${foglioIdParam || Date.now()}.png`;
                const { data: uploadDataTecnico, error: uploadErrorTecnico } = await supabase.storage
                    .from('firme-assistenza')
                    .upload(fileNameTecnico, fileBlobTecnico, { upsert: true, contentType: 'image/png' });

                if (uploadErrorTecnico) {
                    setError("Errore upload firma tecnico: " + uploadErrorTecnico.message);
                    setLoading(false);
                    return;
                }
                const { data: urlDataTecnico } = supabase.storage.from('firme-assistenza').getPublicUrl(uploadDataTecnico.path);
                firmaTecnicoUrlToSave = urlDataTecnico.publicUrl;
            }
        }

        const foglioData = {
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
          firma_cliente_url: firmaClienteUrlToSave,
          firma_tecnico_principale_url: firmaTecnicoUrlToSave,
          stato_foglio: statoFoglio,
          // Gestione creato_da_user_id
          creato_da_user_id: isEditMode 
                             ? (creatoDaUserIdForm || (userRole === 'user' ? currentUserId : null)) // Mantiene esistente o imposta se user
                             : (userRole === 'user' ? currentUserId : (creatoDaUserIdForm || null)) // Imposta se user o se admin assegna
        };
        
        // Se admin sta creando e non ha specificato un utente, potremmo volerlo null o l'id dell'admin stesso
        if (!isEditMode && userRole === 'admin' && !creatoDaUserIdForm) {
            // foglioData.creato_da_user_id = currentUserId; // Opzione: admin è il creatore
            // Oppure lasciare null se le policy lo permettono e non è un campo obbligatorio
        }


        let resultData, resultError;
        if (isEditMode) {
          // Logica di UPDATE
          const { data, error } = await supabase
            .from('fogli_assistenza')
            .update(foglioData)
            .eq('id', foglioIdParam)
            .select()
            .single();
            resultData = data;
            resultError = error;
        } else {
          // Logica di INSERT
          const { data, error } = await supabase
            .from('fogli_assistenza')
            .insert([foglioData])
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
        setLoading(false);
    };
      
    const commesseFiltrate = selectedClienteId && commesse
        ? commesse.filter(c => c.cliente_id === selectedClienteId || !c.cliente_id)
        : (commesse || []);
    const ordiniFiltrati = selectedClienteId && ordini
        ? ordini.filter(o => o.cliente_id === selectedClienteId)
        : (ordini || []);

    if (pageLoading) return <p>Caricamento dati foglio...</p>;
    if (!session) return <p>Devi essere loggato per accedere a questa pagina.</p>; // Controllo aggiuntivo
    // if (!canSubmit && !isEditMode) return <p>Non hai i permessi per creare un nuovo foglio.</p>; // Se la rotta non lo gestisce


    return (
        <div>
          <h2>{isEditMode ? "Modifica" : "Nuovo"} Foglio Assistenza</h2>
          <form onSubmit={handleSubmit}>
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
                  setSelectedCommessaId('');
                  setSelectedOrdineId('');
                }} required>
                <option value="">Seleziona Cliente</option>
                {(clienti || []).map(c => <option key={c.id} value={c.id}>{c.nome_azienda}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="referenteCliente">Referente Cliente (per richiesta):</label>
              <input type="text" id="referenteCliente" value={referenteCliente} onChange={(e) => setReferenteCliente(e.target.value)} />
            </div>

            {/* Admin potrebbe voler assegnare il foglio a un utente specifico */}
            {userRole === 'admin' && (
                <div>
                    <label htmlFor="assegnaUtente">Assegna/Creato da Utente (ID - Lascia vuoto per te stesso se admin crea):</label>
                    <input 
                        type="text" 
                        id="assegnaUtente" 
                        placeholder="ID Utente (opzionale per admin)"
                        value={creatoDaUserIdForm} 
                        onChange={(e) => setCreatoDaUserIdForm(e.target.value)} 
                    />
                </div>
            )}

            <div>
              <label htmlFor="commessa">Commessa (filtrata per cliente):</label>
              <select id="commessa" value={selectedCommessaId} onChange={(e) => setSelectedCommessaId(e.target.value)} disabled={!selectedClienteId}>
                <option value="">Nessuna Commessa</option>
                {commesseFiltrate.map(c => <option key={c.id} value={c.id}>{c.codice_commessa} - {c.descrizione_commessa}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ordine">Ordine Cliente (filtrato per cliente):</label>
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

            <div>
              <label>Firma Cliente:</label>
              {firmaClientePreview && !sigCanvasClienteRef.current?.isEmpty() === false && ( // Mostra preview se c'è un URL e non si sta disegnando
                <div style={{marginBottom: '10px'}}>
                    <img src={firmaClientePreview} alt="Firma Cliente Esistente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '100px'}}/>
                    <button type="button" className="secondary" onClick={() => {setFirmaClientePreview(null); if(sigCanvasClienteRef.current) sigCanvasClienteRef.current.clear();}}>Cambia Firma</button>
                </div>
              )}
              {(!firmaClientePreview || sigCanvasClienteRef.current?.isEmpty() === false) && (
                <>
                  <div className="signature-pad-container">
                    <SignatureCanvas
                      penColor='blue'
                      canvasProps={{ width: 400, height: 150, className: 'sigCanvasCliente' }}
                      ref={sigCanvasClienteRef}
                    />
                  </div>
                  <button type="button" className="secondary" onClick={() => clearSignature(sigCanvasClienteRef)}>Cancella Disegno Firma Cliente</button>
                </>
              )}
            </div>

            <div>
              <label>Firma Tecnico Responsabile:</label>
               {firmaTecnicoPreview && !sigCanvasTecnicoRef.current?.isEmpty() === false && (
                <div style={{marginBottom: '10px'}}>
                    <img src={firmaTecnicoPreview} alt="Firma Tecnico Esistente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '100px'}}/>
                     <button type="button" className="secondary" onClick={() => {setFirmaTecnicoPreview(null); if(sigCanvasTecnicoRef.current) sigCanvasTecnicoRef.current.clear();}}>Cambia Firma</button>
                </div>
              )}
              {(!firmaTecnicoPreview || sigCanvasTecnicoRef.current?.isEmpty() === false) && (
                <>
                  <div className="signature-pad-container">
                    <SignatureCanvas
                      penColor='black'
                      canvasProps={{ width: 400, height: 150, className: 'sigCanvasTecnico' }}
                      ref={sigCanvasTecnicoRef}
                    />
                  </div>
                  <button type="button" className="secondary" onClick={() => clearSignature(sigCanvasTecnicoRef)}>Cancella Disegno Firma Tecnico</button>
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
            <button type="submit" disabled={loading || !canSubmit} style={{marginTop:'20px'}}>
              {loading ? "Salvataggio..." : (isEditMode ? "Aggiorna Foglio" : "Crea Foglio Assistenza")}
            </button>
          </form>
        </div>
    );
}
export default FoglioAssistenzaFormPage;