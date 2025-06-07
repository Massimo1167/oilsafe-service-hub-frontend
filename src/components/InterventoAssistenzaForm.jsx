// src/components/InterventoAssistenzaForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

function InterventoAssistenzaForm({ 
    session, // Potrebbe servire per logica specifica utente nel form
    foglioAssistenzaId, 
    tecniciList, 
    interventoToEdit, // NUOVO: L'intervento da modificare (o null per aggiunta)
    onInterventoSaved, // NUOVO: Callback dopo salvataggio (add/update)
    onCancel           // NUOVO: Callback per annullare/chiudere il form
}) {
    const isEditMode = !!interventoToEdit;

    // Stati del form
    const [dataIntervento, setDataIntervento] = useState(new Date().toISOString().split('T')[0]);
    const [selectedTecnicoId, setSelectedTecnicoId] = useState('');
    const [tipoIntervento, setTipoIntervento] = useState('In Loco');
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

    // Popola il form se siamo in modalità modifica
    useEffect(() => {
        if (isEditMode && interventoToEdit) {
            setDataIntervento(interventoToEdit.data_intervento_effettivo ? new Date(interventoToEdit.data_intervento_effettivo).toISOString().split('T')[0] : '');
            setSelectedTecnicoId(interventoToEdit.tecnico_id || '');
            setTipoIntervento(interventoToEdit.tipo_intervento || 'In Loco');
            setOraInizioLavoro(interventoToEdit.ora_inizio_lavoro || '');
            setOraFineLavoro(interventoToEdit.ora_fine_lavoro || '');
            setOreLavoro(interventoToEdit.ore_lavoro_effettive?.toString() || '');
            setDescrizioneAttivita(interventoToEdit.descrizione_attivita_svolta_intervento || '');
            setKmPercorsi(interventoToEdit.km_percorsi?.toString() || '');
            setOraInizioViaggio(interventoToEdit.ora_inizio_viaggio || '');
            setOraFineViaggio(interventoToEdit.ora_fine_viaggio || '');
            setOreViaggio(interventoToEdit.ore_viaggio?.toString() || '');
            setVitto(interventoToEdit.vitto || false);
            setAutostrada(interventoToEdit.autostrada || false);
            setAlloggio(interventoToEdit.alloggio || false);
            setOsservazioni(interventoToEdit.osservazioni_intervento || '');
        } else {
            // Reset per la modalità aggiunta (o se interventoToEdit diventa null)
            setDataIntervento(new Date().toISOString().split('T')[0]);
            setSelectedTecnicoId(tecniciList?.[0]?.id || '');
            setTipoIntervento('In Loco');
            // ... resetta altri campi ...
            setOraInizioLavoro(''); setOraFineLavoro(''); setOreLavoro('');
            setDescrizioneAttivita(''); setKmPercorsi(''); setOraInizioViaggio('');
            setOraFineViaggio(''); setOreViaggio(''); setVitto(false);
            setAutostrada(false); setAlloggio(false); setOsservazioni('');
        }
    }, [interventoToEdit, isEditMode, tecniciList]); // Aggiunto tecniciList per il reset


    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!selectedTecnicoId) {
            setError("Selezionare un tecnico è obbligatorio.");
            setLoading(false);
            return;
        }
        if (!dataIntervento) {
            setError("La data intervento è obbligatoria.");
            setLoading(false);
            return;
        }


        const interventoDataPayload = {
          foglio_assistenza_id: foglioAssistenzaId, // Sempre necessario
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

        let operationError = null;

        if (isEditMode && interventoToEdit) {
            // Modalità Modifica
            const { error: updateError } = await supabase
                .from('interventi_assistenza')
                .update(interventoDataPayload)
                .eq('id', interventoToEdit.id);
            operationError = updateError;
        } else {
            // Modalità Aggiunta
            const { error: insertError } = await supabase
                .from('interventi_assistenza')
                .insert([interventoDataPayload]);
            operationError = insertError;
        }

        if (operationError) {
          setError(operationError.message);
          console.error(isEditMode ? "Errore modifica intervento:" : "Errore inserimento intervento:", operationError);
          alert((isEditMode ? "Errore modifica intervento: " : "Errore inserimento intervento: ") + operationError.message);
        } else {
          onInterventoSaved(); // Chiama la callback del genitore per indicare successo
          alert(isEditMode ? "Intervento modificato con successo!" : "Intervento aggiunto con successo!");
        }
        setLoading(false);
    };

    return (
        <div style={{ border: '1px solid #007bff', padding: '1rem', marginTop: '1rem', borderRadius: '5px', backgroundColor:'#f0f8ff' }}>
          <h4>{isEditMode ? 'Modifica Intervento' : 'Nuovo Intervento'}</h4>
          <form onSubmit={handleSubmit}>
            {/* ... (Tutti i campi del form come prima) ... */}
            {/* Data Intervento, Tecnico, Tipo Intervento etc. */}
            <div>
              <label htmlFor="dataIntervento">Data Intervento:</label>
              <input type="date" id="dataIntervento" value={dataIntervento} onChange={(e) => setDataIntervento(e.target.value)} required />
            </div>
            <div>
              <label htmlFor="tecnicoIntervento">Tecnico:</label>
              <select id="tecnicoIntervento" value={selectedTecnicoId} onChange={(e) => setSelectedTecnicoId(e.target.value)} required>
                <option value="">Seleziona Tecnico</option>
                {(tecniciList || []).map(t => <option key={t.id} value={t.id}>{t.nome} {t.cognome}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="tipoIntervento">Tipo Intervento:</label>
              <select id="tipoIntervento" value={tipoIntervento} onChange={(e) => setTipoIntervento(e.target.value)}>
                <option value="In Loco">In Loco</option>
                <option value="Remoto">Remoto</option>
              </select>
            </div>
            <div style={{display: 'flex', gap: '1rem', flexWrap:'wrap'}}>
                <div style={{flex:'1 1 200px'}}>
                    <label htmlFor="oraInizioLavoro">Ora Inizio Lavoro:</label>
                    <input type="time" id="oraInizioLavoro" value={oraInizioLavoro} onChange={(e) => setOraInizioLavoro(e.target.value)} />
                </div>
                <div style={{flex:'1 1 200px'}}>
                    <label htmlFor="oraFineLavoro">Ora Fine Lavoro:</label>
                    <input type="time" id="oraFineLavoro" value={oraFineLavoro} onChange={(e) => setOraFineLavoro(e.target.value)} />
                </div>
            </div>
            <div>
                <label htmlFor="oreLavoro">Ore Lavoro Effettive (es. 2.5):</label>
                <input type="number" step="0.1" min="0" id="oreLavoro" value={oreLavoro} onChange={(e) => setOreLavoro(e.target.value)} />
            </div>
            <div>
              <label htmlFor="descrizioneAttivita">Descrizione Attività Svolta:</label>
              <textarea id="descrizioneAttivita" value={descrizioneAttivita} onChange={(e) => setDescrizioneAttivita(e.target.value)} />
            </div>

            {tipoIntervento === 'In Loco' && (
              <>
                <hr style={{margin:'15px 0'}}/>
                <h5>Dettagli Trasferta (Solo per "In Loco")</h5>
                <div>
                  <label htmlFor="kmPercorsi">Km Percorsi A/R:</label>
                  <input type="number" min="0" id="kmPercorsi" value={kmPercorsi} onChange={(e) => setKmPercorsi(e.target.value)} />
                </div>
                <div style={{display: 'flex', gap: '1rem', flexWrap:'wrap'}}>
                    <div style={{flex:'1 1 200px'}}>
                        <label htmlFor="oraInizioViaggio">Ora Inizio Viaggio:</label>
                        <input type="time" id="oraInizioViaggio" value={oraInizioViaggio} onChange={(e) => setOraInizioViaggio(e.target.value)} />
                    </div>
                    <div style={{flex:'1 1 200px'}}>
                        <label htmlFor="oraFineViaggio">Ora Fine Viaggio:</label>
                        <input type="time" id="oraFineViaggio" value={oraFineViaggio} onChange={(e) => setOraFineViaggio(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label htmlFor="oreViaggio">Ore Viaggio (es. 1.0):</label>
                    <input type="number" step="0.1" min="0" id="oreViaggio" value={oreViaggio} onChange={(e) => setOreViaggio(e.target.value)} />
                </div>
                <div style={{display:'flex', gap:'20px', marginTop:'10px', flexWrap:'wrap'}}>
                  <label><input type="checkbox" checked={vitto} onChange={(e) => setVitto(e.target.checked)} /> Vitto</label>
                  <label><input type="checkbox" checked={autostrada} onChange={(e) => setAutostrada(e.target.checked)} /> Autostrada</label>
                  <label><input type="checkbox" checked={alloggio} onChange={(e) => setAlloggio(e.target.checked)} /> Alloggio</label>
                </div>
              </>
            )}
             <div>
              <label htmlFor="osservazioniIntervento">Osservazioni Intervento:</label>
              <textarea id="osservazioniIntervento" value={osservazioni} onChange={(e) => setOsservazioni(e.target.value)} />
            </div>

            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}
            <div style={{marginTop:'20px'}}>
                <button type="submit" disabled={loading}>{loading ? "Salvataggio..." : (isEditMode ? "Salva Modifiche Intervento" : "Aggiungi Intervento")}</button>
                <button type="button" className="secondary" onClick={onCancel} disabled={loading} style={{marginLeft:'10px'}}>
                    Annulla
                </button>
            </div>
          </form>
        </div>
    );
}
export default InterventoAssistenzaForm;