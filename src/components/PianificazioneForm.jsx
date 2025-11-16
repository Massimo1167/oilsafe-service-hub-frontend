import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../supabaseClient';

/**
 * Form per creazione/modifica pianificazioni interventi
 * Supporta:
 * - Pianificazioni con foglio (tradizionale) o senza foglio (solo commessa)
 * - Pianificazioni ricorrenti (template che genera istanze multiple)
 * - Validazione conflitti risorse tramite funzioni helper database
 */
function PianificazioneForm({
  pianificazioneToEdit = null,
  foglioAssistenzaId = null,
  foglio = null,
  fogliDisponibili = [],
  commesse = [],
  clienti = [],
  tecnici,
  mezzi,
  onSave,
  onCancel,
}) {
  const isEditMode = !!pianificazioneToEdit;

  // Form state
  const [formData, setFormData] = useState({
    // Riferimenti (foglio OR commessa obbligatorio)
    foglio_assistenza_id: foglioAssistenzaId || '',
    commessa_id: '',
    cliente_id: '',

    // Date e orari
    data_inizio_pianificata: '',
    ora_inizio_pianificata: '08:00',
    data_fine_pianificata: '',
    ora_fine_pianificata: '17:00',
    tutto_il_giorno: false,

    // Esclusioni
    salta_sabato: false,
    salta_domenica: true,
    salta_festivi: true,

    // Risorse
    tecnici_assegnati: [],
    mezzo_principale_id: '',
    mezzi_secondari_ids: [],

    // Stato e descrizione
    stato_pianificazione: 'Pianificata',
    descrizione: '',

    // Ricorrenza
    ricorrente: false,
    giorni_settimana: [], // [0=Dom, 1=Lun, 2=Mar, 3=Mer, 4=Gio, 5=Ven, 6=Sab]
    data_fine_ricorrenza: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflictWarnings, setConflictWarnings] = useState([]);
  const [commessaSearchFilter, setCommessaSearchFilter] = useState('');

  // Filtra commesse: solo "Aperta" o "In Lavorazione" + ricerca testuale
  const commesseFiltrate = useMemo(() => {
    if (!commesse || commesse.length === 0) return [];

    return commesse.filter(c => {
      // Filtro per stato
      if (!['Aperta', 'In Lavorazione'].includes(c.stato)) return false;

      // Filtro per ricerca testuale
      if (commessaSearchFilter.trim() !== '') {
        const searchLower = commessaSearchFilter.toLowerCase();
        const codiceMatch = c.codice_commessa?.toLowerCase().includes(searchLower);
        const descrizioneMatch = c.descrizione_commessa?.toLowerCase().includes(searchLower);

        // Trova nome cliente
        const cliente = clienti.find(cl => cl.id === c.cliente_id);
        const clienteMatch = cliente?.nome_azienda?.toLowerCase().includes(searchLower);

        return codiceMatch || descrizioneMatch || clienteMatch;
      }

      return true;
    });
  }, [commesse, clienti, commessaSearchFilter]);

  // Inizializza form in modalità edit
  useEffect(() => {
    if (isEditMode && pianificazioneToEdit) {
      setFormData({
        foglio_assistenza_id: pianificazioneToEdit.foglio_assistenza_id || '',
        commessa_id: pianificazioneToEdit.commessa_id || '',
        cliente_id: pianificazioneToEdit.cliente_id || '',
        data_inizio_pianificata: pianificazioneToEdit.data_inizio_pianificata,
        ora_inizio_pianificata: pianificazioneToEdit.ora_inizio_pianificata || '08:00',
        data_fine_pianificata: pianificazioneToEdit.data_fine_pianificata,
        ora_fine_pianificata: pianificazioneToEdit.ora_fine_pianificata || '17:00',
        tutto_il_giorno: pianificazioneToEdit.tutto_il_giorno || false,
        salta_sabato: pianificazioneToEdit.salta_sabato || false,
        salta_domenica: pianificazioneToEdit.salta_domenica || false,
        salta_festivi: pianificazioneToEdit.salta_festivi || false,
        tecnici_assegnati: pianificazioneToEdit.tecnici_assegnati || [],
        mezzo_principale_id: pianificazioneToEdit.mezzo_principale_id || '',
        mezzi_secondari_ids: pianificazioneToEdit.mezzi_secondari_ids || [],
        stato_pianificazione: pianificazioneToEdit.stato_pianificazione || 'Pianificata',
        descrizione: pianificazioneToEdit.descrizione || '',
        ricorrente: pianificazioneToEdit.ricorrente || false,
        giorni_settimana: pianificazioneToEdit.giorni_settimana || [],
        data_fine_ricorrenza: pianificazioneToEdit.data_fine_ricorrenza || '',
      });
    }
  }, [isEditMode, pianificazioneToEdit]);

  // Pre-compila dati dal foglio se presente
  useEffect(() => {
    if (!isEditMode && foglio) {
      const updates = {};

      // Pre-compila commessa e cliente dal foglio
      if (foglio.commessa_id) updates.commessa_id = foglio.commessa_id;
      if (foglio.cliente_id) updates.cliente_id = foglio.cliente_id;

      // Pre-compila tecnico dal foglio
      if (foglio.assegnato_a_user_id && tecnici.length > 0) {
        const tecnicoAssegnato = tecnici.find(t => t.user_id === foglio.assegnato_a_user_id);
        if (tecnicoAssegnato) {
          updates.tecnici_assegnati = [tecnicoAssegnato.id];
        }
      }

      if (Object.keys(updates).length > 0) {
        setFormData(prev => ({ ...prev, ...updates }));
      }
    }
  }, [isEditMode, foglio, tecnici]);

  // Filtra mezzi attivi
  const mezziAttivi = useMemo(() => {
    return mezzi.filter((m) => m.attivo);
  }, [mezzi]);

  // Filtra mezzi secondari (escludi mezzo principale)
  const mezziSecondariDisponibili = useMemo(() => {
    return mezziAttivi.filter((m) => m.id !== formData.mezzo_principale_id);
  }, [mezziAttivi, formData.mezzo_principale_id]);

  // Gestione cambio campi
  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError('');
    setConflictWarnings([]);
  };

  // Gestione checkbox tecnici
  const handleTecnicoToggle = (tecnicoId) => {
    const isSelected = formData.tecnici_assegnati.includes(tecnicoId);
    const newTecnici = isSelected
      ? formData.tecnici_assegnati.filter((id) => id !== tecnicoId)
      : [...formData.tecnici_assegnati, tecnicoId];
    handleChange('tecnici_assegnati', newTecnici);
  };

  // Gestione checkbox mezzi secondari
  const handleMezzoSecondarioToggle = (mezzoId) => {
    const isSelected = formData.mezzi_secondari_ids.includes(mezzoId);
    const newMezzi = isSelected
      ? formData.mezzi_secondari_ids.filter((id) => id !== mezzoId)
      : [...formData.mezzi_secondari_ids, mezzoId];
    handleChange('mezzi_secondari_ids', newMezzi);
  };

  // Gestione checkbox giorni settimana
  const handleGiornoSettimanaToggle = (giorno) => {
    const isSelected = formData.giorni_settimana.includes(giorno);
    const newGiorni = isSelected
      ? formData.giorni_settimana.filter((g) => g !== giorno)
      : [...formData.giorni_settimana, giorno].sort((a, b) => a - b); // Ordina per giorno
    handleChange('giorni_settimana', newGiorni);
  };

  // Validazione form
  const validateForm = () => {
    // Almeno uno tra foglio o commessa deve essere specificato
    if (!formData.foglio_assistenza_id && !formData.commessa_id) {
      setError('Seleziona un foglio di assistenza o una commessa');
      return false;
    }

    // Se non c'è foglio, commessa è obbligatoria
    if (!formData.foglio_assistenza_id && !formData.commessa_id) {
      setError('La commessa è obbligatoria se non hai selezionato un foglio');
      return false;
    }

    if (!formData.data_inizio_pianificata) {
      setError('La data di inizio è obbligatoria');
      return false;
    }
    if (!formData.data_fine_pianificata) {
      setError('La data di fine è obbligatoria');
      return false;
    }
    if (formData.data_inizio_pianificata > formData.data_fine_pianificata) {
      setError('La data di inizio deve essere precedente o uguale alla data di fine');
      return false;
    }
    if (formData.tecnici_assegnati.length === 0) {
      setError('Seleziona almeno un tecnico');
      return false;
    }
    if (!formData.tutto_il_giorno) {
      if (!formData.ora_inizio_pianificata || !formData.ora_fine_pianificata) {
        setError('Gli orari sono obbligatori se non è selezionato "tutto il giorno"');
        return false;
      }
      if (
        formData.data_inizio_pianificata === formData.data_fine_pianificata &&
        formData.ora_inizio_pianificata >= formData.ora_fine_pianificata
      ) {
        setError("L'ora di inizio deve essere precedente all'ora di fine");
        return false;
      }
    }

    // Validazione ricorrenza
    if (formData.ricorrente) {
      if (formData.giorni_settimana.length === 0) {
        setError('Seleziona almeno un giorno della settimana per la ricorrenza');
        return false;
      }
    }

    return true;
  };

  // Verifica conflitti risorse (opzionale, warning non bloccante)
  const checkConflicts = async () => {
    const warnings = [];
    const pianificazioneId = isEditMode ? pianificazioneToEdit.id : null;

    // Verifica conflitti tecnici
    for (const tecnicoId of formData.tecnici_assegnati) {
      const { data, error: err } = await supabase.rpc('is_tecnico_disponibile', {
        p_tecnico_id: tecnicoId,
        p_data_inizio: formData.data_inizio_pianificata,
        p_data_fine: formData.data_fine_pianificata,
        p_ora_inizio: formData.tutto_il_giorno ? null : formData.ora_inizio_pianificata,
        p_ora_fine: formData.tutto_il_giorno ? null : formData.ora_fine_pianificata,
        p_escludi_pianificazione_id: pianificazioneId,
      });

      if (err) {
        console.error('Errore verifica disponibilità tecnico:', err);
      } else if (data === false) {
        const tecnico = tecnici.find((t) => t.id === tecnicoId);
        const tecnicoNome = tecnico ? `${tecnico.nome} ${tecnico.cognome}` : 'Tecnico';
        warnings.push(`${tecnicoNome} ha già pianificazioni nel periodo selezionato`);
      }
    }

    // Verifica conflitti mezzo principale
    if (formData.mezzo_principale_id) {
      const { data, error: err } = await supabase.rpc('is_mezzo_disponibile', {
        p_mezzo_id: formData.mezzo_principale_id,
        p_data_inizio: formData.data_inizio_pianificata,
        p_data_fine: formData.data_fine_pianificata,
        p_escludi_pianificazione_id: pianificazioneId,
      });

      if (err) {
        console.error('Errore verifica disponibilità mezzo:', err);
      } else if (data === false) {
        const mezzo = mezzi.find((m) => m.id === formData.mezzo_principale_id);
        const mezzoTarga = mezzo ? mezzo.targa : 'Mezzo';
        warnings.push(`${mezzoTarga} (principale) ha già pianificazioni nel periodo selezionato`);
      }
    }

    // Verifica conflitti mezzi secondari
    for (const mezzoId of formData.mezzi_secondari_ids) {
      const { data, error: err } = await supabase.rpc('is_mezzo_disponibile', {
        p_mezzo_id: mezzoId,
        p_data_inizio: formData.data_inizio_pianificata,
        p_data_fine: formData.data_fine_pianificata,
        p_escludi_pianificazione_id: pianificazioneId,
      });

      if (err) {
        console.error('Errore verifica disponibilità mezzo secondario:', err);
      } else if (data === false) {
        const mezzo = mezzi.find((m) => m.id === mezzoId);
        const mezzoTarga = mezzo ? mezzo.targa : 'Mezzo';
        warnings.push(`${mezzoTarga} (secondario) ha già pianificazioni nel periodo selezionato`);
      }
    }

    setConflictWarnings(warnings);
  };

  // Salvataggio
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setConflictWarnings([]);

    if (!validateForm()) return;

    // Verifica conflitti (non bloccante, solo warning)
    await checkConflicts();

    setSaving(true);

    try {
      const payload = {
        // Riferimenti (foglio opzionale, commessa/cliente diretti)
        // Converti stringhe vuote e 'SELECT' in null per evitare errori UUID
        foglio_assistenza_id: (formData.foglio_assistenza_id && formData.foglio_assistenza_id !== 'SELECT')
          ? formData.foglio_assistenza_id
          : null,
        commessa_id: (formData.commessa_id && formData.commessa_id !== 'SELECT')
          ? formData.commessa_id
          : null,
        cliente_id: formData.cliente_id || null,

        // Date e orari
        data_inizio_pianificata: formData.data_inizio_pianificata,
        ora_inizio_pianificata: formData.tutto_il_giorno ? null : formData.ora_inizio_pianificata,
        data_fine_pianificata: formData.data_fine_pianificata,
        ora_fine_pianificata: formData.tutto_il_giorno ? null : formData.ora_fine_pianificata,
        tutto_il_giorno: formData.tutto_il_giorno,

        // Esclusioni
        salta_sabato: formData.salta_sabato,
        salta_domenica: formData.salta_domenica,
        salta_festivi: formData.salta_festivi,

        // Risorse
        tecnici_assegnati: formData.tecnici_assegnati,
        mezzo_principale_id: (formData.mezzo_principale_id && formData.mezzo_principale_id !== '')
          ? formData.mezzo_principale_id
          : null,
        mezzi_secondari_ids: formData.mezzi_secondari_ids,

        // Stato e descrizione
        stato_pianificazione: formData.stato_pianificazione,
        descrizione: formData.descrizione || null,

        // Ricorrenza
        ricorrente: formData.ricorrente,
        giorni_settimana: formData.ricorrente ? formData.giorni_settimana : [],
        data_fine_ricorrenza: formData.ricorrente && formData.data_fine_ricorrenza ? formData.data_fine_ricorrenza : null,
      };

      let result;
      if (isEditMode) {
        result = await supabase
          .from('pianificazioni')
          .update(payload)
          .eq('id', pianificazioneToEdit.id)
          .select()
          .single();
      } else {
        result = await supabase.from('pianificazioni').insert(payload).select().single();
      }

      if (result.error) {
        throw result.error;
      }

      onSave(result.data);
    } catch (err) {
      console.error('Errore salvataggio pianificazione:', err);
      setError(err.message || 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-card">
      <h2>{isEditMode ? 'Modifica Pianificazione' : 'Nuova Pianificazione'}</h2>

      {error && <div className="error-message">{error}</div>}

      {conflictWarnings.length > 0 && (
        <div className="error-message" style={{ backgroundColor: '#fff3cd', color: '#856404', borderColor: '#ffeaa7' }}>
          <strong>⚠️ Attenzione - Conflitti rilevati:</strong>
          <ul style={{ margin: '5px 0 0 20px', padding: 0 }}>
            {conflictWarnings.map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
          <p style={{ margin: '10px 0 0 0', fontSize: '0.9em' }}>
            Puoi comunque salvare la pianificazione, ma verifica che i conflitti siano intenzionali.
          </p>
        </div>
      )}

      {/* Tipo Pianificazione: CON o SENZA foglio */}
      {!foglioAssistenzaId && !isEditMode && (
        <section style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
          <h3 style={{ fontSize: '1.1em', marginBottom: '10px' }}>Tipo Pianificazione</h3>
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="tipoPianificazione"
                checked={!!formData.foglio_assistenza_id}
                onChange={() => {
                  setFormData(prev => ({ ...prev, foglio_assistenza_id: 'SELECT', commessa_id: '', cliente_id: '' }));
                }}
              />
              Pianifica un foglio di assistenza esistente
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="tipoPianificazione"
                checked={formData.foglio_assistenza_id === '' && !!formData.commessa_id}
                onChange={() => {
                  setFormData(prev => ({ ...prev, foglio_assistenza_id: '', commessa_id: 'SELECT', cliente_id: '' }));
                }}
              />
              Pianifica direttamente una commessa (senza foglio)
            </label>
          </div>
        </section>
      )}

      {/* Selezione Foglio (solo se utente sceglie pianificazione CON foglio) */}
      {!foglioAssistenzaId && !isEditMode && !!formData.foglio_assistenza_id && formData.commessa_id === '' && (
        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1em', marginBottom: '10px' }}>Seleziona Foglio di Assistenza</h3>
          <select
            value={formData.foglio_assistenza_id === 'SELECT' ? '' : formData.foglio_assistenza_id}
            onChange={(e) => {
              const foglioId = e.target.value;
              if (foglioId) {
                const selectedFoglio = fogliDisponibili.find(f => f.id === foglioId);
                setFormData(prev => ({
                  ...prev,
                  foglio_assistenza_id: foglioId,
                  commessa_id: selectedFoglio?.commessa_id || '',
                  cliente_id: selectedFoglio?.cliente_id || ''
                }));
              } else {
                setFormData(prev => ({ ...prev, foglio_assistenza_id: 'SELECT', commessa_id: '', cliente_id: '' }));
              }
            }}
            style={{ width: '100%', padding: '8px 12px', fontSize: '0.95em', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">-- Seleziona Foglio --</option>
            {fogliDisponibili.map((f) => (
              <option key={f.id} value={f.id}>
                Foglio {f.numero_foglio} | {f.cliente_nome || 'N/A'} | {f.commessa_codice || 'N/A'} |{' '}
                {new Date(f.data_apertura_foglio).toLocaleDateString('it-IT')}
              </option>
            ))}
          </select>
        </section>
      )}

      {/* Selezione Commessa Diretta (solo se utente sceglie pianificazione SENZA foglio) */}
      {!foglioAssistenzaId && !isEditMode && formData.foglio_assistenza_id === '' && formData.commessa_id !== '' && (
        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1em', marginBottom: '10px' }}>Commessa *</h3>

          {/* Campo di ricerca testuale */}
          <input
            type="text"
            placeholder="🔍 Cerca per codice, descrizione o cliente..."
            value={commessaSearchFilter}
            onChange={(e) => setCommessaSearchFilter(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.95em',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '10px'
            }}
          />

          {/* Dropdown commesse filtrate */}
          <select
            value={formData.commessa_id === 'SELECT' ? '' : formData.commessa_id}
            onChange={(e) => {
              const commessaId = e.target.value;
              if (commessaId) {
                const selectedCommessa = commesse.find(c => c.id === commessaId);
                setFormData(prev => ({
                  ...prev,
                  commessa_id: commessaId,
                  cliente_id: selectedCommessa?.cliente_id || ''
                }));
              } else {
                setFormData(prev => ({ ...prev, commessa_id: 'SELECT', cliente_id: '' }));
              }
            }}
            required
            style={{ width: '100%', padding: '8px 12px', fontSize: '0.95em', border: '1px solid #ddd', borderRadius: '4px' }}
          >
            <option value="">-- Seleziona Commessa --</option>
            {commesseFiltrate.map((c) => {
              const cliente = clienti.find(cl => cl.id === c.cliente_id);
              const clienteNome = cliente?.nome_azienda || 'N/D';
              const descrizione = c.descrizione_commessa || 'Nessuna descrizione';

              return (
                <option key={c.id} value={c.id}>
                  {c.codice_commessa} - {descrizione} - Cliente: {clienteNome}
                </option>
              );
            })}
          </select>

          {commesseFiltrate.length === 0 && commessaSearchFilter.trim() !== '' && (
            <p style={{ marginTop: '8px', color: '#666', fontSize: '0.9em', fontStyle: 'italic' }}>
              Nessuna commessa trovata con il filtro "{commessaSearchFilter}"
            </p>
          )}

          {commesseFiltrate.length === 0 && commessaSearchFilter.trim() === '' && (
            <p style={{ marginTop: '8px', color: '#ff9800', fontSize: '0.9em', fontStyle: 'italic' }}>
              ⚠️ Nessuna commessa "Aperta" o "In Lavorazione" disponibile
            </p>
          )}
        </section>
      )}

      {/* Informazioni Commessa Selezionata (solo se commessa diretta è stata selezionata) */}
      {!foglioAssistenzaId && !isEditMode && formData.commessa_id && formData.commessa_id !== 'SELECT' && (
        <section style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '4px', border: '1px solid #90caf9' }}>
          <h3 style={{ fontSize: '1em', marginBottom: '10px', color: '#1976d2' }}>📋 Commessa Selezionata</h3>
          <div>
            {(() => {
              const commessaSelezionata = commesse.find(c => c.id === formData.commessa_id);
              const clienteSelezionato = clienti.find(cl => cl.id === commessaSelezionata?.cliente_id);
              return (
                <>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Codice:</strong> {commessaSelezionata?.codice_commessa || 'N/D'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <strong>Descrizione:</strong> {commessaSelezionata?.descrizione_commessa || 'Nessuna descrizione'}
                  </div>
                  <div>
                    <strong>Cliente:</strong> {clienteSelezionato?.nome_azienda || 'N/D'}
                  </div>
                </>
              );
            })()}
          </div>
        </section>
      )}

      {/* Informazioni Foglio (se passato come prop) */}
      {foglio && (
        <section style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h3 style={{ fontSize: '1em', marginBottom: '10px' }}>Foglio di Assistenza</h3>
          <div>
            <strong>Numero:</strong> {foglio.numero_foglio} | <strong>Cliente:</strong> {foglio.cliente_nome} |{' '}
            <strong>Commessa:</strong> {foglio.commessa_codice}
          </div>
        </section>
      )}

      {/* Date e Orari */}
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1em', marginBottom: '10px' }}>Date e Orari</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Data Inizio *</label>
            <input
              type="date"
              value={formData.data_inizio_pianificata}
              onChange={(e) => handleChange('data_inizio_pianificata', e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Data Fine *</label>
            <input
              type="date"
              value={formData.data_fine_pianificata}
              onChange={(e) => handleChange('data_fine_pianificata', e.target.value)}
              required
            />
          </div>
        </div>

        <div className="form-row" style={{ alignItems: 'center' }}>
          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={formData.tutto_il_giorno}
                onChange={(e) => handleChange('tutto_il_giorno', e.target.checked)}
              />
              Tutto il giorno
            </label>
          </div>
        </div>

        {!formData.tutto_il_giorno && (
          <div className="form-row">
            <div className="form-group">
              <label>Ora Inizio *</label>
              <input
                type="time"
                value={formData.ora_inizio_pianificata}
                onChange={(e) => handleChange('ora_inizio_pianificata', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Ora Fine *</label>
              <input
                type="time"
                value={formData.ora_fine_pianificata}
                onChange={(e) => handleChange('ora_fine_pianificata', e.target.value)}
                required
              />
            </div>
          </div>
        )}
      </section>

      {/* Descrizione */}
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1em', marginBottom: '10px' }}>Descrizione (opzionale)</h3>
        <textarea
          value={formData.descrizione}
          onChange={(e) => handleChange('descrizione', e.target.value)}
          rows={4}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            fontSize: '0.95em',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
          placeholder="Aggiungi note o dettagli sulla pianificazione..."
        />
      </section>

      {/* Esclusioni Giorni */}
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1em', marginBottom: '10px' }}>Esclusioni</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={formData.salta_sabato}
              onChange={(e) => handleChange('salta_sabato', e.target.checked)}
            />
            Salta Sabato
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={formData.salta_domenica}
              onChange={(e) => handleChange('salta_domenica', e.target.checked)}
            />
            Salta Domenica
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <input
              type="checkbox"
              checked={formData.salta_festivi}
              onChange={(e) => handleChange('salta_festivi', e.target.checked)}
            />
            Salta Festivi
          </label>
        </div>
      </section>

      {/* Tecnici Assegnati */}
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1em', marginBottom: '10px' }}>Tecnici Assegnati *</h3>
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
          {tecnici.length > 0 ? (
            tecnici.map((tecnico) => (
              <label
                key={tecnico.id}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}
              >
                <input
                  type="checkbox"
                  checked={formData.tecnici_assegnati.includes(tecnico.id)}
                  onChange={() => handleTecnicoToggle(tecnico.id)}
                />
                {tecnico.nome} {tecnico.cognome}
              </label>
            ))
          ) : (
            <p style={{ color: '#999', margin: 0 }}>Nessun tecnico disponibile</p>
          )}
        </div>
        {formData.tecnici_assegnati.length === 0 && (
          <p style={{ color: '#dc3545', fontSize: '0.9em', margin: '5px 0 0 0' }}>
            Seleziona almeno un tecnico
          </p>
        )}
      </section>

      {/* Mezzi */}
      <section style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '1.1em', marginBottom: '10px' }}>Mezzi</h3>
        <div className="form-row">
          <div className="form-group">
            <label>Mezzo Principale</label>
            <select
              value={formData.mezzo_principale_id}
              onChange={(e) => handleChange('mezzo_principale_id', e.target.value)}
            >
              <option value="">-- Nessuno --</option>
              {mezziAttivi.map((mezzo) => (
                <option key={mezzo.id} value={mezzo.id}>
                  {mezzo.targa} ({mezzo.tipo_mezzo} - {mezzo.marca} {mezzo.modello})
                </option>
              ))}
            </select>
          </div>
        </div>

        {mezziSecondariDisponibili.length > 0 && (
          <div style={{ marginTop: '15px' }}>
            <label style={{ fontWeight: '500', marginBottom: '10px', display: 'block' }}>
              Mezzi Secondari (opzionale)
            </label>
            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', borderRadius: '4px' }}>
              {mezziSecondariDisponibili.map((mezzo) => (
                <label
                  key={mezzo.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={formData.mezzi_secondari_ids.includes(mezzo.id)}
                    onChange={() => handleMezzoSecondarioToggle(mezzo.id)}
                  />
                  {mezzo.targa} ({mezzo.tipo_mezzo} - {mezzo.marca} {mezzo.modello})
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Ricorrenza (solo in creazione, non in edit) */}
      {!isEditMode && (
        <section style={{ marginBottom: '20px', padding: '15px', border: '2px solid #ddd', borderRadius: '4px' }}>
          <h3 style={{ fontSize: '1.1em', marginBottom: '10px' }}>Pianificazione Ricorrente (Template)</h3>
          <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '15px' }}>
            Abilita questa opzione per creare pianificazioni che si ripetono settimanalmente nei giorni selezionati.
          </p>

          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.ricorrente}
                onChange={(e) => handleChange('ricorrente', e.target.checked)}
              />
              <strong>Abilita Ricorrenza</strong>
            </label>
          </div>

          {formData.ricorrente && (
            <>
              {/* Giorni Settimana */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: '500', marginBottom: '10px', display: 'block' }}>
                  Giorni della Settimana *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                  {[
                    { value: 1, label: 'Lunedì' },
                    { value: 2, label: 'Martedì' },
                    { value: 3, label: 'Mercoledì' },
                    { value: 4, label: 'Giovedì' },
                    { value: 5, label: 'Venerdì' },
                    { value: 6, label: 'Sabato' },
                    { value: 0, label: 'Domenica' },
                  ].map(({ value, label }) => (
                    <label
                      key={value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px',
                        border: formData.giorni_settimana.includes(value) ? '2px solid #0066cc' : '1px solid #ddd',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        backgroundColor: formData.giorni_settimana.includes(value) ? '#e3f2fd' : 'white',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.giorni_settimana.includes(value)}
                        onChange={() => handleGiornoSettimanaToggle(value)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {formData.giorni_settimana.length === 0 && (
                  <p style={{ color: '#dc3545', fontSize: '0.9em', margin: '5px 0 0 0' }}>
                    Seleziona almeno un giorno
                  </p>
                )}
              </div>

              {/* Data Fine Ricorrenza */}
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontWeight: '500', marginBottom: '10px', display: 'block' }}>
                  Data Fine Ricorrenza (opzionale)
                </label>
                <input
                  type="date"
                  value={formData.data_fine_ricorrenza}
                  onChange={(e) => handleChange('data_fine_ricorrenza', e.target.value)}
                  style={{
                    width: '100%',
                    maxWidth: '300px',
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                  }}
                />
                <p style={{ fontSize: '0.85em', color: '#666', margin: '5px 0 0 0' }}>
                  Lascia vuoto per ricorrenza illimitata
                </p>
              </div>

              {/* Preview Count */}
              {formData.giorni_settimana.length > 0 && formData.data_inizio_pianificata && formData.data_fine_pianificata && (
                <div style={{ padding: '12px', backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffeaa7' }}>
                  <p style={{ margin: 0, fontSize: '0.95em', color: '#856404' }}>
                    <strong>ℹ️ Anteprima:</strong> Verrà creata una pianificazione per ogni occorrenza del giorno selezionato nel periodo specificato.
                  </p>
                  {formData.data_fine_ricorrenza && (
                    <p style={{ margin: '5px 0 0 0', fontSize: '0.85em', color: '#856404' }}>
                      Le occorrenze termineranno il {new Date(formData.data_fine_ricorrenza).toLocaleDateString('it-IT')}.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* Azioni */}
      <div className="form-actions">
        <button type="submit" className="button" disabled={saving}>
          {saving ? 'Salvataggio...' : isEditMode ? 'Salva Modifiche' : 'Crea Pianificazione'}
        </button>
        <button type="button" className="button" onClick={onCancel} disabled={saving}>
          Annulla
        </button>
      </div>
    </form>
  );
}

PianificazioneForm.propTypes = {
  pianificazioneToEdit: PropTypes.object,
  foglioAssistenzaId: PropTypes.string,
  foglio: PropTypes.object,
  fogliDisponibili: PropTypes.array,
  commesse: PropTypes.array,
  clienti: PropTypes.array,
  tecnici: PropTypes.array.isRequired,
  mezzi: PropTypes.array.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default PianificazioneForm;
