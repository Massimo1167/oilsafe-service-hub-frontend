import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { supabase } from '../supabaseClient';

/**
 * Form per creazione/modifica pianificazioni interventi
 * Permette di assegnare tecnici, mezzi, definire date/orari, esclusioni giorni
 * Validazione conflitti risorse tramite funzioni helper database
 */
function PianificazioneForm({
  pianificazioneToEdit = null,
  foglioAssistenzaId = null,
  foglio = null,
  fogliDisponibili = [],
  tecnici,
  mezzi,
  onSave,
  onCancel,
}) {
  const isEditMode = !!pianificazioneToEdit;

  // Form state
  const [formData, setFormData] = useState({
    foglio_assistenza_id: foglioAssistenzaId || '',
    data_inizio_pianificata: '',
    ora_inizio_pianificata: '08:00',
    data_fine_pianificata: '',
    ora_fine_pianificata: '17:00',
    tutto_il_giorno: false,
    salta_sabato: false,
    salta_domenica: true,
    salta_festivi: true,
    tecnici_assegnati: [],
    mezzo_principale_id: '',
    mezzi_secondari_ids: [],
    stato_pianificazione: 'Pianificata',
    descrizione: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [conflictWarnings, setConflictWarnings] = useState([]);

  // Inizializza form in modalità edit
  useEffect(() => {
    if (isEditMode && pianificazioneToEdit) {
      setFormData({
        foglio_assistenza_id: pianificazioneToEdit.foglio_assistenza_id,
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
      });
    }
  }, [isEditMode, pianificazioneToEdit]);

  // Pre-compila tecnico dal foglio se presente
  useEffect(() => {
    if (!isEditMode && foglio && foglio.assegnato_a_user_id && tecnici.length > 0) {
      // Trova il tecnico_id corrispondente al user_id assegnato nel foglio
      const tecnicoAssegnato = tecnici.find(t => t.user_id === foglio.assegnato_a_user_id);
      if (tecnicoAssegnato) {
        setFormData(prev => ({
          ...prev,
          tecnici_assegnati: [tecnicoAssegnato.id]
        }));
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

  // Validazione form
  const validateForm = () => {
    if (!formData.foglio_assistenza_id) {
      setError('Il foglio di assistenza è obbligatorio');
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
        foglio_assistenza_id: formData.foglio_assistenza_id,
        data_inizio_pianificata: formData.data_inizio_pianificata,
        ora_inizio_pianificata: formData.tutto_il_giorno ? null : formData.ora_inizio_pianificata,
        data_fine_pianificata: formData.data_fine_pianificata,
        ora_fine_pianificata: formData.tutto_il_giorno ? null : formData.ora_fine_pianificata,
        tutto_il_giorno: formData.tutto_il_giorno,
        salta_sabato: formData.salta_sabato,
        salta_domenica: formData.salta_domenica,
        salta_festivi: formData.salta_festivi,
        tecnici_assegnati: formData.tecnici_assegnati,
        mezzo_principale_id: formData.mezzo_principale_id || null,
        mezzi_secondari_ids: formData.mezzi_secondari_ids,
        stato_pianificazione: formData.stato_pianificazione,
        descrizione: formData.descrizione || null,
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

      {/* Selezione Foglio (se NON preselezionato e NON in modalità edit) */}
      {!foglioAssistenzaId && !isEditMode && (
        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.1em', marginBottom: '10px' }}>Seleziona Foglio di Assistenza *</h3>
          <select
            value={formData.foglio_assistenza_id}
            onChange={(e) => handleChange('foglio_assistenza_id', e.target.value)}
            required
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
          {formData.foglio_assistenza_id === '' && (
            <p style={{ color: '#dc3545', fontSize: '0.9em', margin: '5px 0 0 0' }}>
              Seleziona un foglio per procedere
            </p>
          )}
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
  tecnici: PropTypes.array.isRequired,
  mezzi: PropTypes.array.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default PianificazioneForm;
