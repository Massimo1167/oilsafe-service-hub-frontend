import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } // Per la modalità modifica
from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SignatureCanvas from 'react-signature-canvas';

function FoglioAssistenzaFormPage({ clienti, commesse, ordini }) {
  const navigate = useNavigate();
  // const { foglioId: foglioIdDaModificare } = useParams(); // Per la modalità modifica
  // const modoModifica = !!foglioIdDaModificare;

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
  const [statoFoglio, setStatoFoglio] = useState('Aperto'); // Default

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sigCanvasClienteRef = useRef({});
  const sigCanvasTecnicoRef = useRef({});

  // Effetto per caricare dati se in modalità modifica (da implementare completamente)
  // useEffect(() => {
  //   if (modoModifica && foglioIdDaModificare) {
  //     // Carica dati del foglio da modificare...
  //   }
  // }, [modoModifica, foglioIdDaModificare]);

  const clearSignature = (ref) => ref.current.clear();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedClienteId) {
        setError("Selezionare un cliente.");
        setLoading(false);
        return;
    }

    // Gestione firme (per ora solo cattura DataURL, non upload)
    const firmaClienteDataURL = sigCanvasClienteRef.current.isEmpty()
      ? null
      : sigCanvasClienteRef.current.getTrimmedCanvas().toDataURL('image/png');
    const firmaTecnicoDataURL = sigCanvasTecnicoRef.current.isEmpty()
      ? null
      : sigCanvasTecnicoRef.current.getTrimmedCanvas().toDataURL('image/png');

    // QUI andrebbe la logica di UPLOAD su Supabase Storage
    // e l'aggiornamento di queste variabili con gli URL pubblici
    let finalFirmaClienteUrl = firmaClienteDataURL; // Placeholder
    let finalFirmaTecnicoUrl = firmaTecnicoDataURL; // Placeholder

    // Esempio upload (da DECOMMENTARE e ADATTARE quando pronto)
    /*
    if (firmaClienteDataURL) {
        const fileExt = 'png';
        const fileName = `firma_cliente_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`; // Puoi organizzare in cartelle es: `firme_clienti/${fileName}`

        let { data: clienteImgBlob } = await supabase.storage
            .from('firme-assistenza') // NOME DEL TUO BUCKET
            .upload(filePath, dataURLtoBlob(firmaClienteDataURL), { // dataURLtoBlob è una funzione helper da creare
                cacheControl: '3600',
                upsert: false,
                contentType: 'image/png'
            });
        if (clienteImgBlob) {
             const { data: urlData } = supabase.storage.from('firme-assistenza').getPublicUrl(filePath);
             finalFirmaClienteUrl = urlData.publicUrl;
        } else {
            console.error("Errore upload firma cliente");
            // Gestisci errore upload
        }
    }
    // ... simile per firma tecnico ...
    */


    const foglioData = {
      numero_foglio: numeroFoglio || null, // Supabase gestirà se unique e null
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

    // if (modoModifica) {
    //   // Logica di UPDATE
    // } else {
      // Logica di INSERT
      const { data, error: insertError } = await supabase
        .from('fogli_assistenza')
        .insert([foglioData])
        .select() // Per ottenere l'ID del record inserito
        .single();

      if (insertError) {
        setError(insertError.message);
        console.error("Errore inserimento foglio:", insertError);
      } else if (data) {
        console.log("Foglio inserito:", data);
        navigate(`/fogli-assistenza/${data.id}`); // Naviga al dettaglio del nuovo foglio
      }
    // }
    setLoading(false);
  };
  
  // Funzione helper per convertire dataURL in Blob (per l'upload)
  // function dataURLtoBlob(dataurl) {
  //     var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
  //         bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
  //     while(n--){
  //         u8arr[n] = bstr.charCodeAt(n);
  //     }
  //     return new Blob([u8arr], {type:mime});
  // }

  // Filtra commesse e ordini per il cliente selezionato
  const commesseFiltrate = selectedClienteId
    ? commesse.filter(c => c.cliente_id === selectedClienteId || !c.cliente_id)
    : commesse;
  const ordiniFiltrati = selectedClienteId
    ? ordini.filter(o => o.cliente_id === selectedClienteId)
    : ordini;


  return (
    <div>
      <h2>{/*modoModifica ? "Modifica" :*/ "Nuovo"} Foglio Assistenza</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="numeroFoglio">Numero Foglio (opzionale, se vuoto sarà gestito dal DB/logica):</label>
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
              setSelectedCommessaId(''); // Resetta se cambia cliente
              setSelectedOrdineId('');   // Resetta se cambia cliente
            }} required>
            <option value="">Seleziona Cliente</option>
            {clienti.map(c => <option key={c.id} value={c.id}>{c.nome_azienda}</option>)}
          </select>
        </div>
         <div>
          <label htmlFor="referenteCliente">Referente Cliente (per richiesta):</label>
          <input type="text" id="referenteCliente" value={referenteCliente} onChange={(e) => setReferenteCliente(e.target.value)} />
        </div>
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
          <div className="signature-pad-container">
            <SignatureCanvas
              penColor='blue'
              canvasProps={{ width: 400, height: 150, className: 'sigCanvasCliente' }}
              ref={sigCanvasClienteRef}
            />
          </div>
          <button type="button" className="secondary" onClick={() => clearSignature(sigCanvasClienteRef)}>Cancella Firma Cliente</button>
        </div>

        <div>
          <label>Firma Tecnico Responsabile:</label>
           <div className="signature-pad-container">
            <SignatureCanvas
              penColor='black'
              canvasProps={{ width: 400, height: 150, className: 'sigCanvasTecnico' }}
              ref={sigCanvasTecnicoRef}
            />
          </div>
          <button type="button" className="secondary" onClick={() => clearSignature(sigCanvasTecnicoRef)}>Cancella Firma Tecnico</button>
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


        {error && <p style={{ color: 'red' }}>Errore: {error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? "Salvataggio..." : (/*modoModifica ? "Aggiorna Foglio" :*/ "Crea Foglio Assistenza")}
        </button>
      </form>
    </div>
  );
}
export default FoglioAssistenzaFormPage;