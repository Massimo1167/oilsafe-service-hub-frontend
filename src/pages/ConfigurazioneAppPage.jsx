import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './ConfigurazioneAppPage.css';

function ConfigurazioneAppPage({ session }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Configurazioni
  const [responsabileMezzi, setResponsabileMezzi] = useState(null);
  const [soglie, setSoglie] = useState({
    revisione_giorni: 45,
    assicurazione_giorni: 30,
    bollo_giorni: 30,
    manutenzione_giorni: 15,
  });

  // Lista manager disponibili
  const [managers, setManagers] = useState([]);

  const userRole = (session?.user?.role || '').trim().toLowerCase();
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (!isAdmin) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Carica manager disponibili
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .eq('role', 'manager')
          .order('full_name');

        if (profilesError) throw profilesError;
        setManagers(profilesData || []);

        // Carica configurazione responsabile mezzi
        const { data: respData, error: respError } = await supabase
          .from('app_configurazioni')
          .select('valore')
          .eq('chiave', 'responsabile_mezzi')
          .single();

        if (!respError && respData?.valore) {
          setResponsabileMezzi(respData.valore.profile_id || null);
        }

        // Carica soglie alert
        const { data: soglieData, error: soglieError } = await supabase
          .from('app_configurazioni')
          .select('valore')
          .eq('chiave', 'soglie_alert_mezzi')
          .single();

        if (!soglieError && soglieData?.valore) {
          setSoglie(soglieData.valore);
        }
      } catch (err) {
        console.error('Errore caricamento configurazioni:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccessMessage('');

    try {
      // Salva responsabile mezzi
      const selectedManager = managers.find(m => m.id === responsabileMezzi);
      const { error: respError } = await supabase
        .from('app_configurazioni')
        .update({
          valore: {
            profile_id: responsabileMezzi,
            nome: selectedManager?.full_name || null,
          },
        })
        .eq('chiave', 'responsabile_mezzi');

      if (respError) throw respError;

      // Salva soglie
      const { error: soglieError } = await supabase
        .from('app_configurazioni')
        .update({ valore: soglie })
        .eq('chiave', 'soglie_alert_mezzi');

      if (soglieError) throw soglieError;

      setSuccessMessage('Configurazioni salvate con successo');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Errore salvataggio:', err);
      setError('Errore nel salvataggio: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="config-page">
        <h1>Configurazione Applicazione</h1>
        <p>Solo gli amministratori possono accedere a questa pagina.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="config-page">
        <h1>Configurazione Applicazione</h1>
        <p>Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="config-page">
      <h1>Configurazione Applicazione</h1>

      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      {/* Sezione Responsabile Mezzi */}
      <div className="config-section">
        <h2>Gestione Mezzi</h2>
        <div className="config-group">
          <label>Responsabile Mezzi</label>
          <p className="config-description">
            Seleziona il manager responsabile per la gestione dei mezzi e delle relative scadenze.
          </p>
          <select
            value={responsabileMezzi || ''}
            onChange={(e) => setResponsabileMezzi(e.target.value || null)}
            disabled={saving}
          >
            <option value="">-- Nessun responsabile --</option>
            {managers.map(m => (
              <option key={m.id} value={m.id}>
                {m.full_name || m.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sezione Soglie Alert */}
      <div className="config-section">
        <h2>Soglie Alert Scadenze</h2>
        <p className="config-description">
          Definisci i giorni di anticipo per gli alert delle scadenze mezzi.
        </p>

        <div className="config-group-row">
          <div className="config-group">
            <label>Revisione (giorni)</label>
            <input
              type="number"
              value={soglie.revisione_giorni}
              onChange={(e) => setSoglie({ ...soglie, revisione_giorni: parseInt(e.target.value) || 0 })}
              min="1"
              max="365"
              disabled={saving}
            />
          </div>

          <div className="config-group">
            <label>Assicurazione (giorni)</label>
            <input
              type="number"
              value={soglie.assicurazione_giorni}
              onChange={(e) => setSoglie({ ...soglie, assicurazione_giorni: parseInt(e.target.value) || 0 })}
              min="1"
              max="365"
              disabled={saving}
            />
          </div>

          <div className="config-group">
            <label>Bollo (giorni)</label>
            <input
              type="number"
              value={soglie.bollo_giorni}
              onChange={(e) => setSoglie({ ...soglie, bollo_giorni: parseInt(e.target.value) || 0 })}
              min="1"
              max="365"
              disabled={saving}
            />
          </div>

          <div className="config-group">
            <label>Manutenzione (giorni)</label>
            <input
              type="number"
              value={soglie.manutenzione_giorni}
              onChange={(e) => setSoglie({ ...soglie, manutenzione_giorni: parseInt(e.target.value) || 0 })}
              min="1"
              max="365"
              disabled={saving}
            />
          </div>
        </div>
      </div>

      {/* Bottoni azione */}
      <div className="config-actions">
        <button onClick={handleSave} className="button primary" disabled={saving}>
          {saving ? 'Salvataggio...' : 'Salva Configurazioni'}
        </button>
      </div>

      <div className="config-footer">
        <p>
          Le modifiche alle configurazioni sono immediatamente operative per tutti gli utenti.
        </p>
      </div>
    </div>
  );
}

export default ConfigurazioneAppPage;
