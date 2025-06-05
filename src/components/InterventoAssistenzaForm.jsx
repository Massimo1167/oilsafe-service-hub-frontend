import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

function InterventoAssistenzaForm({ foglioAssistenzaId, tecniciList, onInterventoAdded, onCancel }) {
  const [dataIntervento, setDataIntervento] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTecnicoId, setSelectedTecnicoId] = useState(tecniciList?.[0]?.id || '');
  const [tipoIntervento, setTipoIntervento] = useState('In Loco'); // Default
  const [oraInizioLavoro, setOraInizioLavoro] = useState('');
  const [oraFineLavoro, setOraFineLavoro] = useState('');
  const [oreLavoro, setOreLavoro] = useState('');
  const [descrizioneAttivita, setDescrizioneAttivita] = useState('');
  const [kmPercorsi, setKmPercorsi] = useState('');
  const [oraInizioViaggio, setOraInizioViaggio] = useState('');
  const [oraFineViaggio, setOraFineViaggio] = useState('');
  const [oreViaggio, setOreViaggio] = useState('');
  const [vitto, setVitto] = useState(false);
  const [autostrada, setAutostrada] = useState(false);
  const [alloggio, setAlloggio] = useState(false);
  const [osservazioni, setOsservazioni] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!selectedTecnicoId) {
        setError("Selezionare un tecnico.");
        setLoading(false);
        return;
    }

    const interventoData = {
      foglio_assistenza_id: foglioAssistenzaId,
      data_intervento_effettivo: dataIntervento,
      tecnico_id: selectedTecnicoId,
      tipo_intervento: tipoIntervento,
      ora_inizio_lavoro: oraInizioLavoro || null,
      ora_fine_lavoro: oraFineLavoro || null,
      ore_lavoro_effettive: parseFloat(oreLavoro) || null,
      descrizione_attivita_svolta_intervento: descrizioneAttivita,
      km_percorsi: tipoIntervento === 'In Loco' ? (parseInt(kmPercorsi) || null) : null,
      ora_inizio_viaggio: tipoIntervento === 'In Loco' ? (oraInizioViaggio || null) : null,
      ora_fine_viaggio: tipoIntervento === 'In Loco' ? (oraFineViaggio || null) : null,
      ore_viaggio: tipoIntervento === 'In Loco' ? (parseFloat(oreViaggio) || null) : null,
      vitto: tipoIntervento === 'In Loco' ? vitto : false,
      autostrada: tipoIntervento === 'In Loco' ? autostrada : false,
      alloggio: tipoIntervento === 'In Loco' ? alloggio : false,
      osservazioni_intervento: osservazioni,
    };

    const { error: insertError } = await supabase
      .from('interventi_assistenza')
      .insert([interventoData]);

    if (insertError) {
      setError(insertError.message);
      console.error("Errore inserimento intervento:", insertError);
    } else {
      onInterventoAdded(); // Chiama la callback del genitore
    }
    setLoading(false);
  };

  return (
    <div style={{ border: '1px solid #007bff', padding: '1rem', marginTop: '1rem', borderRadius: '5px' }}>
      <h4>Nuovo Intervento</h4>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="dataIntervento">Data Intervento:</label>
          <input type="date" id="dataIntervento" value={dataIntervento} onChange={(e) => setDataIntervento(e.target.value)} required />
        </div>
        <div>
          <label htmlFor="tecnicoIntervento">Tecnico:</label>
          <select id="tecnicoIntervento" value={selectedTecnicoId} onChange={(e) => setSelectedTecnicoId(e.target.value)} required>
            <option value="">Seleziona Tecnico</option>
            {tecniciList.map(t => <option key={t.id} value={t.id}>{t.nome} {t.cognome}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="tipoIntervento">Tipo Intervento:</label>
          <select id="tipoIntervento" value={tipoIntervento} onChange={(e) => setTipoIntervento(e.target.value)}>
            <option value="In Loco">In Loco</option>
            <option value="Remoto">Remoto</option>
          </select>
        </div>
        <div style={{display: 'flex', gap: '1rem'}}>
            <div style={{flex:1}}>
                <label htmlFor="oraInizioLavoro">Ora Inizio Lavoro:</label>
                <input type="time" id="oraInizioLavoro" value={oraInizioLavoro} onChange={(e) => setOraInizioLavoro(e.target.value)} />
            </div>
            <div style={{flex:1}}>
                <label htmlFor="oraFineLavoro">Ora Fine Lavoro:</label>
                <input type="time" id="oraFineLavoro" value={oraFineLavoro} onChange={(e) => setOraFineLavoro(e.target.value)} />
            </div>
        </div>
        <div>
            <label htmlFor="oreLavoro">Ore Lavoro Effettive (es. 2.5):</label>
            <input type="number" step="0.1" id="oreLavoro" value={oreLavoro} onChange={(e) => setOreLavoro(e.target.value)} />
        </div>
        <div>
          <label htmlFor="descrizioneAttivita">Descrizione Attività Svolta:</label>
          <textarea id="descrizioneAttivita" value={descrizioneAttivita} onChange={(e) => setDescrizioneAttivita(e.target.value)} />
        </div>

        {tipoIntervento === 'In Loco' && (
          <>
            <hr/>
            <h5>Dettagli Trasferta (Solo per "In Loco")</h5>
            <div>
              <label htmlFor="kmPercorsi">Km Percorsi A/R:</label>
              <input type="number" id="kmPercorsi" value={kmPercorsi} onChange={(e) => setKmPercorsi(e.target.value)} />
            </div>
            <div style={{display: 'flex', gap: '1rem'}}>
                <div style={{flex:1}}>
                    <label htmlFor="oraInizioViaggio">Ora Inizio Viaggio:</label>
                    <input type="time" id="oraInizioViaggio" value={oraInizioViaggio} onChange={(e) => setOraInizioViaggio(e.target.value)} />
                </div>
                <div style={{flex:1}}>
                    <label htmlFor="oraFineViaggio">Ora Fine Viaggio:</label>
                    <input type="time" id="oraFineViaggio" value={oraFineViaggio} onChange={(e) => setOraFineViaggio(e.target.value)} />
                </div>
            </div>
            <div>
                <label htmlFor="oreViaggio">Ore Viaggio (es. 1.0):</label>
                <input type="number" step="0.1" id="oreViaggio" value={oreViaggio} onChange={(e) => setOreViaggio(e.target.value)} />
            </div>
            <div>
              <label><input type="checkbox" checked={vitto} onChange={(e) => setVitto(e.target.checked)} /> Vitto</label>
            </div>
            <div>
              <label><input type="checkbox" checked={autostrada} onChange={(e) => setAutostrada(e.target.checked)} /> Autostrada</label>
            </div>
            <div>
              <label><input type="checkbox" checked={alloggio} onChange={(e) => setAlloggio(e.target.checked)} /> Alloggio</label>
            </div>
          </>
        )}
         <div>
          <label htmlFor="osservazioniIntervento">Osservazioni Intervento:</label>
          <textarea id="osservazioniIntervento" value={osservazioni} onChange={(e) => setOsservazioni(e.target.value)} />
        </div>

        {error && <p style={{ color: 'red' }}>Errore: {error}</p>}
        <button type="submit" disabled={loading}>{loading ? "Salvataggio..." : "Aggiungi Intervento"}</button>
        <button type="button" className="secondary" onClick={onCancel} disabled={loading}>Annulla</button>
      </form>
    </div>
  );
}
export default InterventoAssistenzaForm;