/**
 * Form component used within a service report to add or edit a single
 * "intervento" (service intervention).
 * Depends on `supabaseClient.js` for database operations and expects
 * a list of technicians as props. Parent components provide callbacks
 * to handle save/cancel events. When invoked with `readOnly` all
 * form fields are disabled allowing inspection only.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import VoiceInputButton from './VoiceInputButton';

function InterventoAssistenzaForm({
    session,
    foglioAssistenzaId,
    tecniciList,
    interventoToEdit,
    onInterventoSaved,
    onCancel,
    readOnly = false
}) {
    const isEditMode = !!interventoToEdit;

    // Stati del form
    const [formDataIntervento, setFormDataIntervento] = useState(new Date().toISOString().split('T')[0]);
    const [formSelectedTecnicoId, setFormSelectedTecnicoId] = useState('');
    const [formMansioneId, setFormMansioneId] = useState(''); // Mansione storicizzata per calcolo costi
    const [formTipoIntervento, setFormTipoIntervento] = useState('In Loco');
    const [formNumeroTecnici, setFormNumeroTecnici] = useState('1');
    const [formOraInizioLavoro, setFormOraInizioLavoro] = useState('');
    const [formOraFineLavoro, setFormOraFineLavoro] = useState('');
    const [formOreLavoro, setFormOreLavoro] = useState('');
    const [formDescrizioneAttivita, setFormDescrizioneAttivita] = useState('');
    const [formKmPercorsi, setFormKmPercorsi] = useState('');
    const [formOraInizioViaggio, setFormOraInizioViaggio] = useState('');
    const [formOraFineViaggio, setFormOraFineViaggio] = useState('');
    const [formOreViaggio, setFormOreViaggio] = useState('');
    const [formVitto, setFormVitto] = useState(false);
    const [formAutostrada, setFormAutostrada] = useState(false);
    const [formAlloggio, setFormAlloggio] = useState(false);
    const [formOsservazioni, setFormOsservazioni] = useState('');

    // Stato per il filtro del dropdown tecnici
    const [filtroTecnico, setFiltroTecnico] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Stati per attività standard
    const [attivitaStandardFoglio, setAttivitaStandardFoglio] = useState([]);
    // Format: [{ id, codice, descrizione, um, costo_unitario, obbligatoria }, ...]

    const [attivitaEseguite, setAttivitaEseguite] = useState([]);
    // Format: [{ attivita_standard_id, quantita }, ...]

    // Popola il form se siamo in modalità modifica
    useEffect(() => {
        const loadInterventoData = async () => {
            if (isEditMode && interventoToEdit) {
                setFormDataIntervento(interventoToEdit.data_intervento_effettivo ? new Date(interventoToEdit.data_intervento_effettivo).toISOString().split('T')[0] : '');
                setFormSelectedTecnicoId(interventoToEdit.tecnico_id || '');
                setFormMansioneId(interventoToEdit.mansione_id || ''); // Carica mansione storicizzata
                setFormTipoIntervento(interventoToEdit.tipo_intervento || 'In Loco');
                setFormNumeroTecnici(interventoToEdit.numero_tecnici?.toString() || '1');
                setFormOraInizioLavoro(interventoToEdit.ora_inizio_lavoro || '');
                setFormOraFineLavoro(interventoToEdit.ora_fine_lavoro || '');
                setFormOreLavoro(interventoToEdit.ore_lavoro_effettive?.toString() || '');
                setFormDescrizioneAttivita(interventoToEdit.descrizione_attivita_svolta_intervento || '');
                setFormKmPercorsi(interventoToEdit.km_percorsi?.toString() || '');
                setFormOraInizioViaggio(interventoToEdit.ora_inizio_viaggio || '');
                setFormOraFineViaggio(interventoToEdit.ora_fine_viaggio || '');
                setFormOreViaggio(interventoToEdit.ore_viaggio?.toString() || '');
                setFormVitto(interventoToEdit.vitto || false);
                setFormAutostrada(interventoToEdit.autostrada || false);
                setFormAlloggio(interventoToEdit.alloggio || false);
                setFormOsservazioni(interventoToEdit.osservazioni_intervento || '');

                // Carica attività standard eseguite
                try {
                    const { data: attivitaData } = await supabase
                        .from('interventi_attivita_standard')
                        .select('attivita_standard_id, quantita')
                        .eq('intervento_assistenza_id', interventoToEdit.id);

                    if (attivitaData) setAttivitaEseguite(attivitaData);
                } catch (err) {
                    console.error('Errore caricamento attività eseguite:', err);
                }
            } else {
                // Reset per la modalità aggiunta
                setFormDataIntervento(new Date().toISOString().split('T')[0]);
                setFormSelectedTecnicoId(tecniciList?.[0]?.id || ''); // Preseleziona il primo se disponibile
                setFormTipoIntervento('In Loco');
                setFormNumeroTecnici('1');
                setFormOraInizioLavoro(''); setFormOraFineLavoro(''); setFormOreLavoro('');
                setFormDescrizioneAttivita(''); setFormKmPercorsi(''); setFormOraInizioViaggio('');
                setFormOraFineViaggio(''); setFormOreViaggio(''); setFormVitto(false);
                setFormAutostrada(false); setFormAlloggio(false); setFormOsservazioni('');
                setFiltroTecnico(''); // Resetta anche il filtro
                setAttivitaEseguite([]); // Reset attività eseguite
            }
        };

        loadInterventoData();
    }, [interventoToEdit, isEditMode, tecniciList]);

    // Auto-popola mansione_id quando cambia il tecnico selezionato
    useEffect(() => {
        if (formSelectedTecnicoId && tecniciList) {
            const tecnicoSelezionato = tecniciList.find(t => t.id === formSelectedTecnicoId);
            if (tecnicoSelezionato && tecnicoSelezionato.mansione_id) {
                // Storicizza la mansione del tecnico nell'intervento
                setFormMansioneId(tecnicoSelezionato.mansione_id);
            } else {
                // Se il tecnico non ha mansione, imposta null
                setFormMansioneId('');
            }
        }
    }, [formSelectedTecnicoId, tecniciList]);

    // Fetch attività standard disponibili per questo foglio
    useEffect(() => {
        const fetchAttivitaFoglio = async () => {
            if (!foglioAssistenzaId) return;

            try {
                const { data, error } = await supabase
                    .from('fogli_attivita_standard')
                    .select(`
                        attivita_standard_id,
                        obbligatoria,
                        attivita_standard_clienti (
                            id,
                            codice_attivita,
                            descrizione,
                            costo_unitario,
                            unita_misura_id,
                            unita_misura (
                                codice,
                                descrizione
                            )
                        )
                    `)
                    .eq('foglio_assistenza_id', foglioAssistenzaId);

                if (!error && data) {
                    const mapped = data.map(item => ({
                        id: item.attivita_standard_clienti.id,
                        codice: item.attivita_standard_clienti.codice_attivita,
                        descrizione: item.attivita_standard_clienti.descrizione,
                        um: item.attivita_standard_clienti.unita_misura?.codice || '',
                        costo_unitario: item.attivita_standard_clienti.costo_unitario,
                        obbligatoria: item.obbligatoria
                    }));
                    setAttivitaStandardFoglio(mapped);
                }
            } catch (err) {
                console.error('Errore caricamento attività standard:', err);
            }
        };

        fetchAttivitaFoglio();
    }, [foglioAssistenzaId]);

    // Handler per toggle attività standard
    const handleToggleAttivita = (attivitaId, checked) => {
        if (checked) {
            setAttivitaEseguite([...attivitaEseguite, {
                attivita_standard_id: attivitaId,
                quantita: 1
            }]);
        } else {
            setAttivitaEseguite(attivitaEseguite.filter(a => a.attivita_standard_id !== attivitaId));
        }
    };

    // Handler per modifica quantità
    const handleQuantitaChange = (attivitaId, newQuantita) => {
        const quantita = parseFloat(newQuantita) || 1;
        if (quantita < 1) return; // Min 1

        setAttivitaEseguite(attivitaEseguite.map(a =>
            a.attivita_standard_id === attivitaId
                ? { ...a, quantita }
                : a
        ));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (readOnly) return;
        setLoading(true);
        setError(null);

        if (!formSelectedTecnicoId) {
            setError("Selezionare un tecnico è obbligatorio.");
            setLoading(false);
            return;
        }
        if (!formDataIntervento) {
            setError("La data intervento è obbligatoria.");
            setLoading(false);
            return;
        }

        // Nota: La validazione delle attività obbligatorie è stata rimossa da qui.
        // Le attività obbligatorie vengono ora verificate solo al momento del cambio di stato
        // del foglio a "Completato" in FoglioAssistenzaFormPage.jsx

        const interventoDataPayload = {
          foglio_assistenza_id: foglioAssistenzaId,
          data_intervento_effettivo: formDataIntervento,
          tecnico_id: formSelectedTecnicoId,
          mansione_id: formMansioneId || null, // Storicizza mansione per calcolo costi
          tipo_intervento: formTipoIntervento,
          numero_tecnici: parseInt(formNumeroTecnici, 10) || 1,
          ora_inizio_lavoro: formOraInizioLavoro || null,
          ora_fine_lavoro: formOraFineLavoro || null,
          ore_lavoro_effettive: parseFloat(formOreLavoro) || null,
          descrizione_attivita_svolta_intervento: formDescrizioneAttivita.trim(),
          km_percorsi: formTipoIntervento === 'In Loco' ? (parseInt(formKmPercorsi) || null) : null,
          ora_inizio_viaggio: formTipoIntervento === 'In Loco' ? (formOraInizioViaggio || null) : null,
          ora_fine_viaggio: formTipoIntervento === 'In Loco' ? (formOraFineViaggio || null) : null,
          ore_viaggio: formTipoIntervento === 'In Loco' ? (parseFloat(formOreViaggio) || null) : null,
          vitto: formTipoIntervento === 'In Loco' ? formVitto : false,
          autostrada: formTipoIntervento === 'In Loco' ? formAutostrada : false,
          alloggio: formTipoIntervento === 'In Loco' ? formAlloggio : false,
          osservazioni_intervento: formOsservazioni.trim(),
        };

        let operationError = null;
        let savedInterventoId = null;

        if (isEditMode && interventoToEdit) {
            const { error: updateError } = await supabase
                .from('interventi_assistenza')
                .update(interventoDataPayload)
                .eq('id', interventoToEdit.id);
            operationError = updateError;
            savedInterventoId = interventoToEdit.id;
        } else {
            const { data: insertData, error: insertError } = await supabase
                .from('interventi_assistenza')
                .insert([interventoDataPayload])
                .select();
            operationError = insertError;
            if (insertData && insertData.length > 0) {
                savedInterventoId = insertData[0].id;
            }
        }

        if (operationError) {
          setError(operationError.message);
          alert((isEditMode ? "Errore modifica intervento: " : "Errore inserimento intervento: ") + operationError.message);
          setLoading(false);
          return;
        }

        // Salva attività standard eseguite
        if (savedInterventoId && attivitaEseguite.length > 0) {
            // DELETE vecchie attività (in edit mode)
            if (isEditMode) {
                await supabase
                    .from('interventi_attivita_standard')
                    .delete()
                    .eq('intervento_assistenza_id', savedInterventoId);
            }

            // INSERT nuove attività con storicizzazione
            const attivitaPayload = attivitaEseguite.map(eseg => {
                const attivita = attivitaStandardFoglio.find(a => a.id === eseg.attivita_standard_id);
                return {
                    intervento_assistenza_id: savedInterventoId,
                    attivita_standard_id: eseg.attivita_standard_id,
                    codice_attivita: attivita.codice,
                    descrizione: attivita.descrizione,
                    unita_misura: attivita.um,
                    costo_unitario: attivita.costo_unitario,
                    quantita: eseg.quantita
                };
            });

            const { error: attivitaError } = await supabase
                .from('interventi_attivita_standard')
                .insert(attivitaPayload);

            if (attivitaError) {
                console.error('Errore salvataggio attività standard:', attivitaError);
            }
        } else if (savedInterventoId && isEditMode && attivitaEseguite.length === 0) {
            // Se in edit mode e non ci sono attività eseguite, elimina tutte le attività precedenti
            await supabase
                .from('interventi_attivita_standard')
                .delete()
                .eq('intervento_assistenza_id', savedInterventoId);
        }

        onInterventoSaved();
        alert(isEditMode ? "Intervento modificato!" : "Intervento aggiunto!");
        setLoading(false);
    };

    // Lista tecnici ordinata e filtrata
    const tecniciOrdinati = useMemo(() => 
        [...(tecniciList || [])].sort((a,b) => {
            const cognomeCompare = a.cognome.localeCompare(b.cognome);
            if (cognomeCompare !== 0) return cognomeCompare;
            return a.nome.localeCompare(b.nome);
        }), 
    [tecniciList]);

    const tecniciFiltrati = useMemo(() =>
        tecniciOrdinati.filter(t =>
            (t.cognome || '').toLowerCase().includes(filtroTecnico.toLowerCase()) ||
            (t.nome || '').toLowerCase().includes(filtroTecnico.toLowerCase())
        ),
    [tecniciOrdinati, filtroTecnico]);


    return (
        <div style={{ border: '1px solid #007bff', padding: '1rem', marginTop: '1rem', borderRadius: '5px', backgroundColor:'#f0f8ff' }}>
          <h4>{isEditMode ? (readOnly ? 'Visualizza Intervento' : 'Modifica Intervento Selezionato') : 'Aggiungi Nuovo Intervento'}</h4>
          <form onSubmit={handleSubmit}>
            <fieldset disabled={readOnly} style={{border:0, padding:0, margin:0}}>
            <div>
              <label htmlFor="formDataIntervento">Data Intervento:</label>
              <input type="date" id="formDataIntervento" value={formDataIntervento} onChange={(e) => setFormDataIntervento(e.target.value)} required />
            </div>
            
            <div>
              <label htmlFor="tecnicoIntervento">Tecnico:</label>
              <input 
                type="text"
                placeholder="Filtra tecnico per nome/cognome..."
                value={filtroTecnico}
                onChange={e => setFiltroTecnico(e.target.value)}
                style={{marginBottom:'5px', width:'calc(100% - 22px)'}}
              />
              <select 
                id="tecnicoIntervento" 
                value={formSelectedTecnicoId} 
                onChange={(e) => {
                    setFormSelectedTecnicoId(e.target.value);
                    setFiltroTecnico(''); // Resetta filtro dopo selezione
                }} 
                required
              >
                <option value="">Seleziona Tecnico ({tecniciFiltrati.length} trovati)</option>
                {tecniciFiltrati.map(t => <option key={t.id} value={t.id}>{t.cognome} {t.nome}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="formTipoIntervento">Tipo Intervento:</label>
              <select id="formTipoIntervento" value={formTipoIntervento} onChange={(e) => setFormTipoIntervento(e.target.value)}>
                <option value="In Loco">In Loco</option>
                <option value="Remoto">Remoto</option>
              </select>
            </div>
            <div>
              <label htmlFor="formNumeroTecnici">Numero Tecnici:</label>
              <input
                type="number"
                id="formNumeroTecnici"
                min="1"
                value={formNumeroTecnici}
                onChange={(e) => setFormNumeroTecnici(e.target.value)}
              />
            </div>
            <div style={{display: 'flex', gap: '1rem', flexWrap:'wrap'}}>
                <div style={{flex:'1 1 200px'}}>
                    <label htmlFor="formOraInizioLavoro">Ora Inizio Lavoro:</label>
                    <input type="time" id="formOraInizioLavoro" value={formOraInizioLavoro} onChange={(e) => setFormOraInizioLavoro(e.target.value)} />
                </div>
                <div style={{flex:'1 1 200px'}}>
                    <label htmlFor="formOraFineLavoro">Ora Fine Lavoro:</label>
                    <input type="time" id="formOraFineLavoro" value={formOraFineLavoro} onChange={(e) => setFormOraFineLavoro(e.target.value)} />
                </div>
            </div>
            <div>
                <label htmlFor="formOreLavoro">Ore Lavoro Effettive (es. 2.5):</label>
                <input type="number" step="0.1" min="0" id="formOreLavoro" value={formOreLavoro} onChange={(e) => setFormOreLavoro(e.target.value)} />
            </div>
            <div>
              <label htmlFor="formDescrizioneAttivita">Descrizione Attività Svolta:</label>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <textarea
                  id="formDescrizioneAttivita"
                  value={formDescrizioneAttivita}
                  onChange={(e) => setFormDescrizioneAttivita(e.target.value)}
                />
                <VoiceInputButton
                  onTranscript={(text) =>
                    setFormDescrizioneAttivita((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <small style={{ color: '#666', fontSize: '0.85em', marginTop: '3px', display: 'block' }}>
                💡 Formattazione: **grassetto**, *corsivo*, ***grassetto corsivo***
              </small>
            </div>

            {formTipoIntervento === 'In Loco' && (
              <>
                <hr style={{margin:'15px 0'}}/>
                <h5>Dettagli Trasferta (Solo per "In Loco")</h5>
                <div>
                  <label htmlFor="formKmPercorsi">Km Percorsi A/R:</label>
                  <input type="number" min="0" id="formKmPercorsi" value={formKmPercorsi} onChange={(e) => setFormKmPercorsi(e.target.value)} />
                </div>
                <div style={{display: 'flex', gap: '1rem', flexWrap:'wrap'}}>
                    <div style={{flex:'1 1 200px'}}>
                        <label htmlFor="formOraInizioViaggio">Ora Inizio Viaggio:</label>
                        <input type="time" id="formOraInizioViaggio" value={formOraInizioViaggio} onChange={(e) => setFormOraInizioViaggio(e.target.value)} />
                    </div>
                    <div style={{flex:'1 1 200px'}}>
                        <label htmlFor="formOraFineViaggio">Ora Fine Viaggio:</label>
                        <input type="time" id="formOraFineViaggio" value={formOraFineViaggio} onChange={(e) => setFormOraFineViaggio(e.target.value)} />
                    </div>
                </div>
                <div>
                    <label htmlFor="formOreViaggio">Ore Viaggio (es. 1.0):</label>
                    <input type="number" step="0.1" min="0" id="formOreViaggio" value={formOreViaggio} onChange={(e) => setFormOreViaggio(e.target.value)} />
                </div>
                <div style={{display:'flex', gap:'20px', marginTop:'10px', flexWrap:'wrap'}}>
                  <label><input type="checkbox" checked={formVitto} onChange={(e) => setFormVitto(e.target.checked)} /> Vitto</label>
                  <label><input type="checkbox" checked={formAutostrada} onChange={(e) => setFormAutostrada(e.target.checked)} /> Autostrada</label>
                  <label><input type="checkbox" checked={formAlloggio} onChange={(e) => setFormAlloggio(e.target.checked)} /> Alloggio</label>
                </div>
              </>
            )}
            <div>
              <label htmlFor="formOsservazioni">Osservazioni Intervento:</label>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <textarea
                  id="formOsservazioni"
                  value={formOsservazioni}
                  onChange={(e) => setFormOsservazioni(e.target.value)}
                />
                <VoiceInputButton
                  onTranscript={(text) =>
                    setFormOsservazioni((prev) => (prev ? `${prev} ${text}` : text))
                  }
                />
              </div>
              <small style={{ color: '#666', fontSize: '0.85em', marginTop: '3px', display: 'block' }}>
                💡 Formattazione: **grassetto**, *corsivo*, ***grassetto corsivo***
              </small>
            </div>

            {/* SEZIONE ATTIVITÀ STANDARD */}
            {attivitaStandardFoglio.length > 0 && (
                <div className="form-section" style={{marginTop: '25px'}}>
                    <h4>Attività Standard</h4>
                    <p style={{fontSize:'0.9em', color:'#666', marginBottom:'15px'}}>
                        Seleziona le attività eseguite e indica la quantità
                    </p>

                    {attivitaStandardFoglio.map(attivita => {
                        const eseguita = attivitaEseguite.find(a => a.attivita_standard_id === attivita.id);
                        const isChecked = !!eseguita;

                        return (
                            <div key={attivita.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                marginBottom: '10px',
                                padding: '10px',
                                border: attivita.obbligatoria ? '2px solid #ff6b6b' : '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: isChecked ? '#f0f8f0' : 'white'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => handleToggleAttivita(attivita.id, e.target.checked)}
                                    disabled={readOnly}
                                />

                                <div style={{flex: 1}}>
                                    <strong>{attivita.codice}</strong> - {attivita.descrizione}
                                    {attivita.obbligatoria && <span style={{color:'#ff6b6b', marginLeft:'5px'}}>*</span>}
                                    <br />
                                    <small style={{color:'#666'}}>U.M: {attivita.um}</small>
                                </div>

                                {isChecked && (
                                    <input
                                        type="number"
                                        min="1"
                                        step="0.01"
                                        value={eseguita?.quantita || 1}
                                        onChange={(e) => handleQuantitaChange(attivita.id, e.target.value)}
                                        disabled={readOnly}
                                        placeholder="Quantità"
                                        style={{width: '100px', padding:'5px'}}
                                    />
                                )}
                            </div>
                        );
                    })}

                    {attivitaStandardFoglio.some(a => a.obbligatoria) && (
                        <p style={{color:'#ff6b6b', fontSize:'0.85em', marginTop:'10px'}}>
                            * Attività obbligatorie
                        </p>
                    )}
                </div>
            )}
            </fieldset>

            {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}
            <div style={{marginTop:'20px'}}>
                <button type="submit" disabled={loading || readOnly}>{loading ? "Salvataggio..." : (isEditMode ? "Salva Modifiche Intervento" : "Aggiungi Intervento")}</button>
                <button type="button" className="secondary" onClick={onCancel} disabled={loading} style={{marginLeft:'10px'}}>
                    Annulla
                </button>
            </div>
          </form>
        </div>
    );
}
export default InterventoAssistenzaForm;
