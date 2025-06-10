// src/pages/FoglioAssistenzaFormPage.jsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient'; // Assicurati che il percorso sia corretto
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
    const [formCreatoDaUserIdOriginal, setFormCreatoDaUserIdOriginal] = useState(''); // Mantiene l'ID originale del creatore in edit mode

    // Stati per indirizzi e il loro dropdown
    const [indirizziClienteSelezionato, setIndirizziClienteSelezionato] = useState([]);
    const [formSelectedIndirizzoId, setFormSelectedIndirizzoId] = useState(''); 

    // Stati per i Filtri dei Dropdown
    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroCommessa, setFiltroCommessa] = useState('');
    const [filtroOrdine, setFiltroOrdine] = useState('');
    const [filtroIndirizzo, setFiltroIndirizzo] = useState('');


    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode); 
    const [error, setError] = useState(null);
    const sigCanvasClienteRef = useRef(null);
    const sigCanvasTecnicoRef = useRef(null);
    const [firmaClientePreview, setFirmaClientePreview] = useState(null);
    const [firmaTecnicoPreview, setFirmaTecnicoPreview] = useState(null);

    const userRole = session?.user?.role;
    const currentUserId = session?.user?.id;
    
    // Permessi di submit: admin sempre, user solo se crea, manager o user proprietario se modifica
    const canSubmitForm = 
        userRole === 'admin' || 
        (!isEditMode && userRole === 'user') || 
        (isEditMode && (userRole === 'manager' || (userRole === 'user' && formCreatoDaUserIdOriginal === currentUserId)));

    // Carica indirizzi quando un cliente viene selezionato
    useEffect(() => {
        if (formSelectedClienteId) {
            const fetchIndirizzi = async () => {
                const { data, error: errIndirizzi } = await supabase
                    .from('indirizzi_clienti')
                    .select('id, indirizzo_completo, descrizione, is_default')
                    .eq('cliente_id', formSelectedClienteId)
                    .order('is_default', { ascending: false }) 
                    .order('descrizione');
                
                if (errIndirizzi) {
                    console.error("Errore fetch indirizzi cliente:", errIndirizzi);
                    setIndirizziClienteSelezionato([]);
                    setFormSelectedIndirizzoId(''); // Resetta anche l'indirizzo selezionato
                } else {
                    setIndirizziClienteSelezionato(data || []);
                    // Se non siamo in edit mode o se l'indirizzo_intervento_id non è ancora stato settato per il foglio in modifica
                    if (!isEditMode || (isEditMode && !formSelectedIndirizzoId && data.length > 0)) {
                        const defaultAddr = data.find(addr => addr.is_default);
                        if (defaultAddr) {
                            setFormSelectedIndirizzoId(defaultAddr.id);
                        } else if (data.length > 0) {
                            setFormSelectedIndirizzoId(data[0].id); 
                        } else {
                            setFormSelectedIndirizzoId('');
                        }
                    }
                    // Se siamo in edit mode e formSelectedIndirizzoId ha già un valore (dal fetchFoglioData), non lo sovrascriviamo qui
                }
            };
            fetchIndirizzi();
        } else {
            setIndirizziClienteSelezionato([]);
            setFormSelectedIndirizzoId('');
        }
    }, [formSelectedClienteId, isEditMode]); // riesegui se cambia il cliente o entriamo in edit mode

    // Popolamento form in modalità modifica
    useEffect(() => {
        if (isEditMode && foglioIdParam && session) { // Aggiunto 'session' per assicurarci che i dati utente siano disponibili se servono
            setPageLoading(true);
            const fetchFoglioData = async () => {
                const { data, error: fetchError } = await supabase
                    .from('fogli_assistenza')
                    .select('*') // Seleziona tutti i campi del foglio per popolarli
                    .eq('id', foglioIdParam)
                    .single();
                
                if (fetchError) { 
                    setError("Errore caricamento dati foglio: " + fetchError.message); 
                    console.error("Fetch foglio error:", fetchError);
                } else if (data) {
                    setFormNumeroFoglio(data.numero_foglio || '');
                    setFormDataApertura(data.data_apertura_foglio ? new Date(data.data_apertura_foglio).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                    setFormSelectedClienteId(data.cliente_id || ''); // Questo triggererà il fetch degli indirizzi
                    setFormReferenteCliente(data.referente_cliente_richiesta || '');
                    setFormMotivoGenerale(data.motivo_intervento_generale || '');
                    setFormSelectedCommessaId(data.commessa_id || '');
                    setFormSelectedOrdineId(data.ordine_cliente_id || '');
                    setFormDescrizioneGenerale(data.descrizione_lavoro_generale || '');
                    setFormOsservazioniGenerali(data.osservazioni_generali || '');
                    setFormMaterialiForniti(data.materiali_forniti_generale || '');
                    setFormStatoFoglio(data.stato_foglio || 'Aperto');
                    setFormCreatoDaUserIdOriginal(data.creato_da_user_id || '');
                    setFormSelectedIndirizzoId(data.indirizzo_intervento_id || ''); // Imposta l'indirizzo intervento precedentemente salvato
                    setFirmaClientePreview(data.firma_cliente_url || null);
                    setFirmaTecnicoPreview(data.firma_tecnico_principale_url || null);
                } else {
                    setError("Foglio di assistenza non trovato.");
                }
                setPageLoading(false);
            };
            fetchFoglioData();
        } else if (!isEditMode) {
            setPageLoading(false); 
        }
    }, [isEditMode, foglioIdParam, session]);

    const clearSignature = (ref, previewSetterKey) => {
        if (ref.current) ref.current.clear();
        if (previewSetterKey === 'cliente') setFirmaClientePreview(null);
        if (previewSetterKey === 'tecnico') setFirmaTecnicoPreview(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmitForm) { alert("Non hai i permessi per eseguire questa operazione."); return; }
        setLoadingSubmit(true); setError(null);
        if (!formSelectedClienteId) { setError("Cliente obbligatorio."); setLoadingSubmit(false); return; }
        if (indirizziClienteSelezionato.length > 0 && !formSelectedIndirizzoId) {
            setError("Selezionare un indirizzo di intervento per il cliente.");
            setLoadingSubmit(false); return;
        }

        let firmaClienteUrlToSave = firmaClientePreview; 
        let firmaTecnicoUrlToSave = firmaTecnicoPreview;

        if (sigCanvasClienteRef.current && !sigCanvasClienteRef.current.isEmpty()) {
            const firmaClienteDataURL = sigCanvasClienteRef.current.toDataURL('image/png');
            const fileBlob = dataURLtoBlob(firmaClienteDataURL);
            if (fileBlob) {
                const fileName = `firma_cliente_${foglioIdParam || currentUserId || 'new'}_${Date.now()}.png`;
                const { data: uploadData, error: uploadError } = await supabase.storage.from('firme-assistenza').upload(fileName, fileBlob, { upsert: true, contentType: 'image/png' }); 
                if (uploadError) { setError("Upload firma cliente fallito: " + uploadError.message); setLoadingSubmit(false); return; }
                firmaClienteUrlToSave = supabase.storage.from('firme-assistenza').getPublicUrl(uploadData.path).data.publicUrl;
            }
        }
        if (sigCanvasTecnicoRef.current && !sigCanvasTecnicoRef.current.isEmpty()) {
            const firmaTecnicoDataURL = sigCanvasTecnicoRef.current.toDataURL('image/png');
            const fileBlobTecnico = dataURLtoBlob(firmaTecnicoDataURL);
            if (fileBlobTecnico) {
                const fileNameTecnico = `firma_tecnico_${foglioIdParam || currentUserId || 'new'}_${Date.now()}.png`;
                const { data: uploadDataTecnico, error: uploadErrorTecnico } = await supabase.storage.from('firme-assistenza').upload(fileNameTecnico, fileBlobTecnico, { upsert: true, contentType: 'image/png' });
                if (uploadErrorTecnico) { setError("Upload firma tecnico fallito: " + uploadErrorTecnico.message); setLoadingSubmit(false); return; }
                firmaTecnicoUrlToSave = supabase.storage.from('firme-assistenza').getPublicUrl(uploadDataTecnico.path).data.publicUrl;
            }
        }

        const foglioPayload = {
          numero_foglio: formNumeroFoglio.trim() || null, 
          data_apertura_foglio: formDataApertura, 
          cliente_id: formSelectedClienteId,
          indirizzo_intervento_id: formSelectedIndirizzoId || null,
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
            }
            // Considera se l'admin che crea deve auto-assegnarsi come creato_da_user_id
            // else if (userRole === 'admin' && currentUserId) {
            //    foglioPayload.creato_da_user_id = currentUserId;
            // }
        }
        // In modalità modifica, creato_da_user_id non viene alterato qui.

        let resultData, resultError;
        if (isEditMode) { 
            const { data, error } = await supabase.from('fogli_assistenza').update(foglioPayload).eq('id', foglioIdParam).select().single();
            resultData = data; resultError = error;
        } else { 
            const { data, error } = await supabase.from('fogli_assistenza').insert([foglioPayload]).select().single();
            resultData = data; resultError = error;
        }

        if (resultError) { 
            setError("Operazione fallita: " + resultError.message); 
            console.error(isEditMode ? "Errore aggiornamento foglio:" : "Errore inserimento foglio:", resultError);
        } else if (resultData) { 
            alert(isEditMode ? 'Foglio di assistenza aggiornato con successo!' : 'Foglio di assistenza creato con successo!'); 
            navigate(`/fogli-assistenza/${resultData.id}`); 
        }
        setLoadingSubmit(false);
    };
      
    const clientiOrdinati = useMemo(() => [...(clienti || [])].sort((a, b) => a.nome_azienda.localeCompare(b.nome_azienda)), [clienti]);
    const clientiFiltrati = useMemo(() => clientiOrdinati.filter(c => c.nome_azienda.toLowerCase().includes(filtroCliente.toLowerCase())), [clientiOrdinati, filtroCliente]);
    
    const indirizziFiltrati = useMemo(() =>
        (indirizziClienteSelezionato || []).filter(addr => 
            (addr.indirizzo_completo || '').toLowerCase().includes(filtroIndirizzo.toLowerCase()) ||
            (addr.descrizione || '').toLowerCase().includes(filtroIndirizzo.toLowerCase())
        ),
    [indirizziClienteSelezionato, filtroIndirizzo]);

    const commesseDisponibili = useMemo(() => formSelectedClienteId && commesse ? [...(commesse || [])].filter(c => c.cliente_id === formSelectedClienteId || !c.cliente_id).sort((a,b) => a.codice_commessa.localeCompare(b.codice_commessa)) : [...(commesse || [])].sort((a,b) => a.codice_commessa.localeCompare(b.codice_commessa)),[commesse, formSelectedClienteId]);
    const commesseFiltrate = useMemo(() => commesseDisponibili.filter(c => c.codice_commessa.toLowerCase().includes(filtroCommessa.toLowerCase()) || (c.descrizione_commessa || '').toLowerCase().includes(filtroCommessa.toLowerCase())), [commesseDisponibili, filtroCommessa]);
    
    const ordiniDisponibili = useMemo(() => formSelectedClienteId && ordini ? [...(ordini || [])].filter(o => o.cliente_id === formSelectedClienteId).sort((a,b) => a.numero_ordine_cliente.localeCompare(b.numero_ordine_cliente)) : [...(ordini || [])].sort((a,b) => a.numero_ordine_cliente.localeCompare(b.numero_ordine_cliente)),[ordini, formSelectedClienteId]);
    const ordiniFiltrati = useMemo(() => ordiniDisponibili.filter(o => o.numero_ordine_cliente.toLowerCase().includes(filtroOrdine.toLowerCase()) || (o.descrizione_ordine || '').toLowerCase().includes(filtroOrdine.toLowerCase())), [ordiniDisponibili, filtroOrdine]);

    if (pageLoading && isEditMode) return <p>Caricamento dati foglio...</p>; // Mostra solo in edit mode durante il fetch iniziale del foglio
    if (!session) return <Navigate to="/login" replace />; // Se non c'è sessione, reindirizza
    // Controllo permessi più specifico dopo il caricamento
    if (!pageLoading && !canSubmitForm && isEditMode) return <p>Non hai i permessi per modificare questo foglio.</p>;
    if (!pageLoading && !canSubmitForm && !isEditMode) return <p>Non hai i permessi per creare un nuovo foglio.</p>;

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
              <input type="text" placeholder="Filtra cliente..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={{marginBottom:'5px', width:'calc(100% - 22px)'}}/>
              <select id="cliente" value={formSelectedClienteId} onChange={(e) => {
                  setFormSelectedClienteId(e.target.value);
                  setFormSelectedIndirizzoId(''); // Resetta indirizzo quando cambia cliente
                  setFormSelectedCommessaId(''); 
                  setFormSelectedOrdineId('');
                  setFiltroCliente(''); 
                }} required >
                <option value="">Seleziona Cliente ({clientiFiltrati.length})</option>
                {clientiFiltrati.map(c => <option key={c.id} value={c.id}>{c.nome_azienda}</option>)}
              </select>
            </div>

            {formSelectedClienteId && (
                <div>
                    <label htmlFor="indirizzoIntervento">Indirizzo Intervento Specifico:</label>
                    <input type="text" placeholder="Filtra indirizzo..." value={filtroIndirizzo} onChange={e => setFiltroIndirizzo(e.target.value)} style={{marginBottom:'5px', width:'calc(100% - 22px)'}}/>
                    <select id="indirizzoIntervento" value={formSelectedIndirizzoId} onChange={e => {setFormSelectedIndirizzoId(e.target.value); setFiltroIndirizzo('');}} required={indirizziClienteSelezionato.length > 0} >
                        <option value="">Seleziona Indirizzo ({indirizziFiltrati.length})</option>
                        {indirizziFiltrati.map(addr => (
                            <option key={addr.id} value={addr.id}>
                                {addr.descrizione ? `${addr.descrizione}: ` : ''}{addr.indirizzo_completo} {addr.is_default ? '(Default)' : ''}
                            </option>
                        ))}
                        {indirizziClienteSelezionato.length === 0 && <option value="" disabled>Nessun indirizzo specifico. Aggiungilo dall'anagrafica clienti.</option>}
                    </select>
                </div>
            )}

            <div>
              <label htmlFor="formReferenteCliente">Referente Cliente (per richiesta):</label>
              <input type="text" id="formReferenteCliente" value={formReferenteCliente} onChange={(e) => setFormReferenteCliente(e.target.value)} />
            </div>
            
            <div>
              <label htmlFor="commessa">Commessa:</label>
              <input type="text" placeholder="Filtra commessa..." value={filtroCommessa} onChange={e => setFiltroCommessa(e.target.value)} disabled={!formSelectedClienteId && commesse.some(c => c.cliente_id)} style={{marginBottom:'5px', width:'calc(100% - 22px)'}}/>
              <select id="commessa" value={formSelectedCommessaId} onChange={(e) => { setFormSelectedCommessaId(e.target.value); setFiltroCommessa(''); }} >
                <option value="">Nessuna Commessa ({commesseFiltrate.length})</option>
                {commesseFiltrate.map(c => <option key={c.id} value={c.id}>{c.codice_commessa} - {c.descrizione_commessa}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="ordine">Ordine Cliente:</label>
               <input type="text" placeholder="Filtra ordine..." value={filtroOrdine} onChange={e => setFiltroOrdine(e.target.value)} disabled={!formSelectedClienteId} style={{marginBottom:'5px', width:'calc(100% - 22px)'}}/>
              <select id="ordine" value={formSelectedOrdineId} onChange={(e) => { setFormSelectedOrdineId(e.target.value); setFiltroOrdine(''); }} disabled={!formSelectedClienteId} >
                <option value="">Nessun Ordine ({ordiniFiltrati.length})</option>
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
              {isEditMode && firmaClientePreview && sigCanvasClienteRef.current?.isEmpty() && (
                <div style={{marginBottom: '10px'}}>
                    <img src={firmaClientePreview} alt="Firma Cliente Esistente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '100px'}}/>
                    <button type="button" className="secondary small" onClick={() => {setFirmaClientePreview(null); if(sigCanvasClienteRef.current) sigCanvasClienteRef.current.clear();}}>Ridisegna</button>
                </div>
              )}
              {(!isEditMode || !firmaClientePreview || (sigCanvasClienteRef.current && !sigCanvasClienteRef.current.isEmpty())) && (
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
               {isEditMode && firmaTecnicoPreview && sigCanvasTecnicoRef.current?.isEmpty() && (
                <div style={{marginBottom: '10px'}}>
                    <img src={firmaTecnicoPreview} alt="Firma Tecnico Esistente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '100px'}}/>
                     <button type="button" className="secondary small" onClick={() => {setFirmaTecnicoPreview(null); if(sigCanvasTecnicoRef.current) sigCanvasTecnicoRef.current.clear();}}>Ridisegna</button>
                </div>
              )}
              {(!isEditMode || !firmaTecnicoPreview || (sigCanvasTecnicoRef.current && !sigCanvasTecnicoRef.current.isEmpty())) && (
                <>
                  <div className="signature-pad-container">
                    <SignatureCanvas penColor='black' canvasProps={{ width: 400, height: 150, className: 'sigCanvasTecnico' }} ref={sigCanvasTecnicoRef} />
                  </div>
                  <button type="button" className="secondary" onClick={() => clearSignature(sigCanvasTecnicoRef, 'tecnico')}>Cancella Disegno</button>
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