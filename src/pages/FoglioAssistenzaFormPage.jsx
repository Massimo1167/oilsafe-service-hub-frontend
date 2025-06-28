/**
 * Page with a form to create or edit a service sheet. Manages draft
 * persistence, signature capture and relations to clients, orders and
 * job orders. Uses Supabase for storage and navigation via React Router.
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, Link, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SignatureCanvas from 'react-signature-canvas';

function dataURLtoBlob(dataurl) {
    if (!dataurl) return null;
    try {
        const arr = dataurl.split(','); if (arr.length < 2) return null;
        const mimeMatch = arr[0].match(/:(.*?);/); if (!mimeMatch || mimeMatch.length < 2) return null;
        const mime = mimeMatch[1]; const bstr = atob(arr[1]); let n = bstr.length;
        const u8arr = new Uint8Array(n); while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        return new Blob([u8arr], { type: mime });
    } catch (e) { console.error("Errore conversione dataURLtoBlob:", e); return null; }
}

function FoglioAssistenzaFormPage({ session, clienti, commesse, ordini, tecnici }) {
    const navigate = useNavigate();
    const { foglioIdParam } = useParams();
    const isEditMode = !!foglioIdParam;

    const userRole = (session?.user?.role || '').trim().toLowerCase();
    const currentUserId = session?.user?.id;
    const currentUserEmail = session?.user?.email?.toLowerCase();

    const draftKey = foglioIdParam ? `draft-foglio-${foglioIdParam}` : 'draft-foglio-new';

    // Stati del Form
    const [formDataApertura, setFormDataApertura] = useState(new Date().toISOString().split('T')[0]);
    const [formSelectedClienteId, setFormSelectedClienteId] = useState('');
    const [formReferenteCliente, setFormReferenteCliente] = useState('');
    const [formMotivoGenerale, setFormMotivoGenerale] = useState('');
    const [formSelectedCommessaId, setFormSelectedCommessaId] = useState('');
    const [formSelectedOrdineId, setFormSelectedOrdineId] = useState('');
    const [formAssignedTecnicoId, setFormAssignedTecnicoId] = useState(currentUserId || '');
    const [formDescrizioneGenerale, setFormDescrizioneGenerale] = useState('');
    const [formOsservazioniGenerali, setFormOsservazioniGenerali] = useState('');
const [formMaterialiForniti, setFormMaterialiForniti] = useState('');
const [formStatoFoglio, setFormStatoFoglio] = useState('Aperto');
 const [formEmailCliente, setFormEmailCliente] = useState('');
 const [formEmailInterno, setFormEmailInterno] = useState('');
    const [formCreatoDaUserIdOriginal, setFormCreatoDaUserIdOriginal] = useState('');
    const [numeroFoglioVisualizzato, setNumeroFoglioVisualizzato] = useState('');

    const [indirizziClienteSelezionato, setIndirizziClienteSelezionato] = useState([]);
    const [formSelectedIndirizzoId, setFormSelectedIndirizzoId] = useState(''); 

    const [filtroCliente, setFiltroCliente] = useState('');
    const [filtroCommessa, setFiltroCommessa] = useState('');
    const [filtroOrdine, setFiltroOrdine] = useState('');
    const [filtroIndirizzo, setFiltroIndirizzo] = useState('');
    const [filtroTecnico, setFiltroTecnico] = useState('');

    const [loadingSubmit, setLoadingSubmit] = useState(false);
    const [pageLoading, setPageLoading] = useState(isEditMode); 
    const [error, setError] = useState(null);
    const sigCanvasClienteRef = useRef(null);
    const sigCanvasTecnicoRef = useRef(null);
    const [firmaClientePreview, setFirmaClientePreview] = useState(null);
    const [firmaTecnicoPreview, setFirmaTecnicoPreview] = useState(null);

    const [isAssignedTecnico, setIsAssignedTecnico] = useState(false);
    const baseFormPermission =
        userRole === 'admin' ||
        (!isEditMode && (userRole === 'user' || userRole === 'manager')) ||
        (isEditMode &&
            (userRole === 'admin' ||
                userRole === 'manager' ||
                (userRole === 'user' && (formCreatoDaUserIdOriginal === currentUserId || isAssignedTecnico))));

    const isChiuso = formStatoFoglio === 'Chiuso';
    const isCompletato = formStatoFoglio === 'Completato';
    const firmaPresente = !!firmaClientePreview;

    let canSubmitForm = false;
    if (!isEditMode) {
        canSubmitForm = baseFormPermission;
    } else if (baseFormPermission) {
        if (userRole === 'admin') {
            canSubmitForm = true;
        } else if (userRole === 'manager') {
            canSubmitForm = !isChiuso;
        } else if (userRole === 'user' && (formCreatoDaUserIdOriginal === currentUserId || isAssignedTecnico)) {
            canSubmitForm = !isChiuso && !isCompletato && !firmaPresente;
        }
    }

    console.debug('FAPage perms', {
        userRole,
        currentUserId,
        formCreatoDaUserIdOriginal,
        isEditMode,
        formStatoFoglio,
        firmaPresente,
        canSubmitForm,
    });

    useEffect(() => {
        if (!pageLoading) {
            const saved = localStorage.getItem(draftKey);
            if (saved) {
                try {
                    const d = JSON.parse(saved);
                    if (d.formDataApertura) setFormDataApertura(d.formDataApertura);
                    if (d.formSelectedClienteId) setFormSelectedClienteId(d.formSelectedClienteId);
                    if (d.formSelectedIndirizzoId) setFormSelectedIndirizzoId(d.formSelectedIndirizzoId);
                    if (d.formReferenteCliente) setFormReferenteCliente(d.formReferenteCliente);
                    if (d.formMotivoGenerale) setFormMotivoGenerale(d.formMotivoGenerale);
                    if (d.formSelectedCommessaId) setFormSelectedCommessaId(d.formSelectedCommessaId);
                    if (d.formSelectedOrdineId) setFormSelectedOrdineId(d.formSelectedOrdineId);
                    if (d.formAssignedTecnicoId) setFormAssignedTecnicoId(d.formAssignedTecnicoId);
                    if (d.formDescrizioneGenerale) setFormDescrizioneGenerale(d.formDescrizioneGenerale);
                    if (d.formOsservazioniGenerali) setFormOsservazioniGenerali(d.formOsservazioniGenerali);
                    if (d.formMaterialiForniti) setFormMaterialiForniti(d.formMaterialiForniti);
                    if (d.formStatoFoglio) setFormStatoFoglio(d.formStatoFoglio);
                    if (d.formEmailCliente) setFormEmailCliente(d.formEmailCliente);
                    if (d.formEmailInterno) setFormEmailInterno(d.formEmailInterno);
                } catch (e) {
                    console.error('Errore caricamento draft form:', e);
                }
            }
        }
    }, [draftKey, pageLoading]);

    useEffect(() => {
        if (!pageLoading) {
            const draft = {
                formDataApertura,
                formSelectedClienteId,
                formSelectedIndirizzoId,
                formReferenteCliente,
                formMotivoGenerale,
                formSelectedCommessaId,
                formSelectedOrdineId,
                formAssignedTecnicoId,
                formDescrizioneGenerale,
                formOsservazioniGenerali,
                formMaterialiForniti,
                formStatoFoglio,
                formEmailCliente,
                formEmailInterno,
            };
            localStorage.setItem(draftKey, JSON.stringify(draft));
        }
    }, [draftKey, pageLoading, formDataApertura, formSelectedClienteId, formSelectedIndirizzoId, formReferenteCliente, formMotivoGenerale, formSelectedCommessaId, formSelectedOrdineId, formDescrizioneGenerale, formOsservazioniGenerali, formMaterialiForniti, formStatoFoglio, formEmailCliente, formEmailInterno, formAssignedTecnicoId]);

    useEffect(() => {
        if (formSelectedClienteId) {
            const fetchIndirizzi = async () => {
                const { data, error: errIndirizzi } = await supabase.from('indirizzi_clienti')
                    .select('id, indirizzo_completo, descrizione, is_default').eq('cliente_id', formSelectedClienteId)
                    .order('is_default', { ascending: false }).order('descrizione');
                if (errIndirizzi) {
                    console.error("Errore fetch indirizzi cliente:", errIndirizzi);
                    setIndirizziClienteSelezionato([]);
                    setFormSelectedIndirizzoId(''); 
                } else {
                    setIndirizziClienteSelezionato(data || []);
                    if (!formSelectedIndirizzoId && data && data.length > 0) { // Auto-seleziona solo se non c'è già un valore (es. da edit mode)
                        const defaultAddr = data.find(addr => addr.is_default);
                        setFormSelectedIndirizzoId(defaultAddr?.id || data[0].id);
                    } else if (data.length === 0) {
                        setFormSelectedIndirizzoId('');
                    }
                }
            };
            fetchIndirizzi();
        } else {
            setIndirizziClienteSelezionato([]);
            setFormSelectedIndirizzoId('');
        }
    }, [formSelectedClienteId, isEditMode]); // Rimosso formSelectedIndirizzoId dalle dipendenze per evitare re-render loop

    useEffect(() => {
        if (isEditMode && foglioIdParam && session) {
            setPageLoading(true);
            const fetchFoglioData = async () => {
                const { data, error: fetchError } = await supabase.from('fogli_assistenza').select('*').eq('id', foglioIdParam).single();
                if (fetchError) { setError("Errore caricamento: " + fetchError.message); console.error(fetchError); }
                else if (data) {
                    setNumeroFoglioVisualizzato(data.numero_foglio || '');
                    setFormDataApertura(data.data_apertura_foglio ? new Date(data.data_apertura_foglio).toISOString().split('T')[0] : '');
                    setFormSelectedClienteId(data.cliente_id || ''); // Triggererà il fetch indirizzi
                    setFormSelectedIndirizzoId(data.indirizzo_intervento_id || '');
                    setFormReferenteCliente(data.referente_cliente_richiesta || '');
                    setFormMotivoGenerale(data.motivo_intervento_generale || '');
                    setFormSelectedCommessaId(data.commessa_id || '');
                    setFormSelectedOrdineId(data.ordine_cliente_id || '');
                    setFormAssignedTecnicoId(data.assegnato_a_user_id || currentUserId || '');
                    setFormDescrizioneGenerale(data.descrizione_lavoro_generale || '');
                    setFormOsservazioniGenerali(data.osservazioni_generali || '');
                    setFormMaterialiForniti(data.materiali_forniti_generale || '');
                    setFormStatoFoglio(data.stato_foglio || 'Aperto');
                    setFormEmailCliente(data.email_report_cliente || '');
                    setFormEmailInterno(data.email_report_interno || '');
                    setFormCreatoDaUserIdOriginal(data.creato_da_user_id || '');
                    setFirmaClientePreview(data.firma_cliente_url || null);
                    setFirmaTecnicoPreview(data.firma_tecnico_principale_url || null);
                }
                setPageLoading(false);
            };
            fetchFoglioData();
        } else if (!isEditMode) {
            setPageLoading(false);
        }
    }, [isEditMode, foglioIdParam, session]);

    useEffect(() => {
        const checkTecnico = async () => {
            if (!isEditMode || !foglioIdParam || !session) return;
            const { data, error } = await supabase
                .from('interventi_assistenza')
                .select('tecnico_id, tecnici (email)')
                .eq('foglio_assistenza_id', foglioIdParam);
            if (!error && data) {
                const email = currentUserEmail || '';
                const assignedInterv = data.some(i => (i.tecnici?.email || '').toLowerCase() === email);
                const assignedFoglio = formAssignedTecnicoId === currentUserId;
                setIsAssignedTecnico(assignedInterv || assignedFoglio);
            }
        };
        checkTecnico();
    }, [isEditMode, foglioIdParam, session, currentUserEmail, formAssignedTecnicoId, currentUserId]);

    const clearSignature = (ref, previewSetterKey) => { /* ... */ };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canSubmitForm) { alert("Non hai i permessi."); return; }
        setLoadingSubmit(true); setError(null);
        if (!formSelectedClienteId) { setError("Cliente obbligatorio."); setLoadingSubmit(false); return; }
        if (indirizziClienteSelezionato.length > 0 && !formSelectedIndirizzoId) {
            setError("Selezionare un indirizzo di intervento."); setLoadingSubmit(false); return;
        }

        try {
            let firmaClienteUrlToSave = firmaClientePreview; 
            let firmaTecnicoUrlToSave = firmaTecnicoPreview;
            // Logica di upload firme completa
            if (sigCanvasClienteRef.current && !sigCanvasClienteRef.current.isEmpty()) {
                const fCDU = sigCanvasClienteRef.current.toDataURL('image/png'); const fB = dataURLtoBlob(fCDU);
                if (fB) { const fN = `f_cliente_${foglioIdParam||currentUserId||'new'}_${Date.now()}.png`; const {data:uD,error:uE}=await supabase.storage.from('firme-assistenza').upload(fN,fB,{upsert:true}); if(uE) throw uE; firmaClienteUrlToSave=supabase.storage.from('firme-assistenza').getPublicUrl(uD.path).data.publicUrl;}
            }
            if (sigCanvasTecnicoRef.current && !sigCanvasTecnicoRef.current.isEmpty()) {
                const fTDU = sigCanvasTecnicoRef.current.toDataURL('image/png'); const fTB = dataURLtoBlob(fTDU);
                if (fTB) { const fN = `f_tecnico_${foglioIdParam||currentUserId||'new'}_${Date.now()}.png`; const {data:uD,error:uE}=await supabase.storage.from('firme-assistenza').upload(fN,fTB,{upsert:true}); if(uE) throw uE; firmaTecnicoUrlToSave=supabase.storage.from('firme-assistenza').getPublicUrl(uD.path).data.publicUrl;}
            }

            const foglioPayload = {
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
              email_report_cliente: formEmailCliente.trim() || null,
              email_report_interno: formEmailInterno.trim() || null,
              firma_cliente_url: firmaClienteUrlToSave,
              firma_tecnico_principale_url: firmaTecnicoUrlToSave,
              stato_foglio: formStatoFoglio,
              assegnato_a_user_id: formAssignedTecnicoId || null,
            };
            
            let resultData, resultError;
            if (isEditMode) { 
                const { data, error } = await supabase.from('fogli_assistenza').update(foglioPayload).eq('id', foglioIdParam).select().single();
                resultData = data; resultError = error;
            } else { 
                console.log("Chiamata a RPC 'genera_prossimo_numero_foglio'...");
                const { data: numeroData, error: numeroError } = await supabase.rpc('genera_prossimo_numero_foglio');
                if (numeroError) throw new Error("Impossibile generare numero foglio: " + numeroError.message);
                console.log("Numero foglio generato:", numeroData);
                foglioPayload.numero_foglio = numeroData;
                if ((userRole === 'user' || userRole === 'manager') && currentUserId) {
                    foglioPayload.creato_da_user_id = currentUserId;
                }
                const { data, error } = await supabase.from('fogli_assistenza').insert([foglioPayload]).select().single();
                resultData = data; resultError = error;
            }

            if (resultError) { throw resultError; }

            if (resultData) {
                localStorage.removeItem(draftKey);
                alert(isEditMode ? 'Foglio aggiornato!' : 'Foglio creato!');
                navigate(`/fogli-assistenza/${resultData.id}`);
            } else { throw new Error("Operazione completata ma nessun dato restituito."); }
        } catch (opError) {
            setError("Operazione fallita: " + opError.message); 
            console.error(isEditMode ? "Errore aggiornamento foglio:" : "Errore creazione foglio:", opError);
        } finally {
            setLoadingSubmit(false);
        }
    };
      
    // Liste filtrate e ordinate
    const clientiOrdinati = useMemo(() => [...(clienti || [])].sort((a, b) => a.nome_azienda.localeCompare(b.nome_azienda)), [clienti]);
    const clientiFiltrati = useMemo(() => clientiOrdinati.filter(c => c.nome_azienda.toLowerCase().includes(filtroCliente.toLowerCase())), [clientiOrdinati, filtroCliente]);
    const indirizziFiltrati = useMemo(() => (indirizziClienteSelezionato || []).filter(addr => (addr.indirizzo_completo || '').toLowerCase().includes(filtroIndirizzo.toLowerCase()) || (addr.descrizione || '').toLowerCase().includes(filtroIndirizzo.toLowerCase())), [indirizziClienteSelezionato, filtroIndirizzo]);
    const commesseDisponibili = useMemo(() => formSelectedClienteId && commesse ? [...(commesse || [])].filter(c => c.cliente_id === formSelectedClienteId || !c.cliente_id).sort((a,b) => a.codice_commessa.localeCompare(b.codice_commessa)) : [...(commesse || [])].sort((a,b) => a.codice_commessa.localeCompare(b.codice_commessa)),[commesse, formSelectedClienteId]);
    const commesseFiltrate = useMemo(() => commesseDisponibili.filter(c => c.codice_commessa.toLowerCase().includes(filtroCommessa.toLowerCase()) || (c.descrizione_commessa || '').toLowerCase().includes(filtroCommessa.toLowerCase())), [commesseDisponibili, filtroCommessa]);
    const ordiniDisponibili = useMemo(() => formSelectedClienteId && ordini ? [...(ordini || [])].filter(o => o.cliente_id === formSelectedClienteId).sort((a,b) => a.numero_ordine_cliente.localeCompare(b.numero_ordine_cliente)) : [...(ordini || [])].sort((a,b) => a.numero_ordine_cliente.localeCompare(b.numero_ordine_cliente)),[ordini, formSelectedClienteId]);
    const ordiniFiltrati = useMemo(() => ordiniDisponibili.filter(o => o.numero_ordine_cliente.toLowerCase().includes(filtroOrdine.toLowerCase()) || (o.descrizione_ordine || '').toLowerCase().includes(filtroOrdine.toLowerCase())), [ordiniDisponibili, filtroOrdine]);
    const tecniciOrdinati = useMemo(() =>
        [...(tecnici || [])]
            .sort((a,b) => {
                const cmp = a.cognome.localeCompare(b.cognome);
                return cmp !== 0 ? cmp : a.nome.localeCompare(b.nome);
            }),
    [tecnici]);
    const tecniciFiltrati = useMemo(() =>
        tecniciOrdinati.filter(t =>
            (t.cognome.toLowerCase().includes(filtroTecnico.toLowerCase()) ||
            t.nome.toLowerCase().includes(filtroTecnico.toLowerCase())) &&
            t.user_id
        ),
    [tecniciOrdinati, filtroTecnico]);

    const canEditAssignedTecnico = !isEditMode || userRole === 'admin' || userRole === 'manager';

    if (pageLoading && isEditMode) return <p>Caricamento dati foglio...</p>;
    if (!session) return <Navigate to="/login" replace />;
    if (!pageLoading && !canSubmitForm) return <p>Non hai i permessi per accedere a questa pagina.</p>;

    return (
        <div>
            <Link to={isEditMode ? `/fogli-assistenza/${foglioIdParam}` : "/fogli-assistenza"}>
              ← Torna {isEditMode ? 'al dettaglio foglio' : 'alla lista'}
            </Link>
            <h2>{isEditMode ? `Modifica Foglio Assistenza N. ${numeroFoglioVisualizzato}` : "Nuovo Foglio Assistenza"}</h2>
            <form onSubmit={handleSubmit}>
                {isEditMode && (
                    <div style={{ padding:'10px', backgroundColor:'#f0f0f0', border:'1px solid #ccc', borderRadius:'4px', marginBottom:'1rem'}}>
                        <strong>Numero Foglio:</strong> {numeroFoglioVisualizzato}
                    </div>
                )}
                <div>
                    <label htmlFor="formDataApertura">Data Apertura:</label>
                    <input type="date" id="formDataApertura" value={formDataApertura} onChange={(e) => setFormDataApertura(e.target.value)} required />
                </div>
                <div>
                    <label htmlFor="cliente">Cliente:</label>
                    <input type="text" placeholder="Filtra cliente..." value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={{marginBottom:'5px', width:'calc(100% - 22px)'}}/>
                    <select id="cliente" value={formSelectedClienteId} onChange={(e) => { setFormSelectedClienteId(e.target.value); setFormSelectedIndirizzoId(''); setFormSelectedCommessaId(''); setFormSelectedOrdineId(''); setFiltroCliente(''); }} required >
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
                    <label htmlFor="tecnicoRiferimento">Tecnico di Riferimento:</label>
                    <input type="text" placeholder="Filtra tecnico..." value={filtroTecnico} onChange={e => setFiltroTecnico(e.target.value)} style={{marginBottom:'5px', width:'calc(100% - 22px)'}} />
                    <select
                        id="tecnicoRiferimento"
                        value={formAssignedTecnicoId}
                        onChange={e => { setFormAssignedTecnicoId(e.target.value); setFiltroTecnico(''); }}
                        required
                        disabled={!canEditAssignedTecnico}
                    >
                        <option value="">Seleziona Tecnico ({tecniciFiltrati.length})</option>
                        {tecniciFiltrati.map(t => (
                            <option key={t.id} value={t.user_id}>
                                {t.cognome} {t.nome}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="commessa">Commessa:</label>
                    <input type="text" placeholder="Filtra commessa..." value={filtroCommessa} onChange={e => setFiltroCommessa(e.target.value)} style={{marginBottom:'5px', width:'calc(100% - 22px)'}}/>
                    <select id="commessa" value={formSelectedCommessaId} onChange={(e) => { setFormSelectedCommessaId(e.target.value); setFiltroCommessa(''); }} >
                        <option value="">Nessuna Commessa ({commesseFiltrate.length})</option>
                        {commesseFiltrate.map(c => <option key={c.id} value={c.id}>{c.codice_commessa} - {c.descrizione_commessa}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="ordine">Ordine Cliente:</label>
                    <input type="text" placeholder="Filtra ordine..." value={filtroOrdine} onChange={e => setFiltroOrdine(e.target.value)} style={{marginBottom:'5px', width:'calc(100% - 22px)'}}/>
                    <select id="ordine" value={formSelectedOrdineId} onChange={(e) => { setFormSelectedOrdineId(e.target.value); setFiltroOrdine(''); }} >
                        <option value="">Nessun Ordine ({ordiniFiltrati.length})</option>
                        {ordiniFiltrati.map(o => <option key={o.id} value={o.id}>{o.numero_ordine_cliente} - {o.descrizione_ordine}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="formEmailCliente">Email Cliente per Report (opzionale):</label>
                    <input type="email" id="formEmailCliente" value={formEmailCliente} onChange={e => setFormEmailCliente(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="formEmailInterno">Email Interna per Report (opzionale):</label>
                    <input type="email" id="formEmailInterno" value={formEmailInterno} onChange={e => setFormEmailInterno(e.target.value)} />
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
                <div>
                    <label>Firma Cliente:</label>
                    {isEditMode && firmaClientePreview && (!sigCanvasClienteRef.current || sigCanvasClienteRef.current.isEmpty()) && (
                        <div>
                            <img src={firmaClientePreview} alt="Firma Esistente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '100px'}}/>
                            <button type="button" className="secondary small" onClick={() => {setFirmaClientePreview(null);}}>Ridisegna</button>
                        </div>
                    )}
                    {(!isEditMode || !firmaClientePreview) && (
                        <>
                            <div className="signature-pad-container">
                                <SignatureCanvas penColor='blue' canvasProps={{ width: 400, height: 150, className: 'sigCanvasCliente' }} ref={sigCanvasClienteRef} />
                            </div>
                            <button type="button" className="secondary" onClick={() => clearSignature(sigCanvasClienteRef)}>Cancella Disegno</button>
                        </>
                    )}
                </div>
                <div>
                    <label>Firma Tecnico Responsabile:</label>
                    {isEditMode && firmaTecnicoPreview && (!sigCanvasTecnicoRef.current || sigCanvasTecnicoRef.current.isEmpty()) && (
                        <div>
                            <img src={firmaTecnicoPreview} alt="Firma Esistente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '100px'}}/>
                            <button type="button" className="secondary small" onClick={() => {setFirmaTecnicoPreview(null);}}>Ridisegna</button>
                        </div>
                    )}
                    {(!isEditMode || !firmaTecnicoPreview) && (
                        <>
                            <div className="signature-pad-container">
                                <SignatureCanvas penColor='black' canvasProps={{ width: 400, height: 150, className: 'sigCanvasTecnico' }} ref={sigCanvasTecnicoRef} />
                            </div>
                            <button type="button" className="secondary" onClick={() => clearSignature(sigCanvasTecnicoRef)}>Cancella Disegno</button>
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