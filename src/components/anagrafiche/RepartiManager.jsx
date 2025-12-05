import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Navigate } from 'react-router-dom';

/**
 * RepartiManager
 *
 * Component for managing departments/reparti master data.
 * Provides CRUD operations for organizing technicians by department.
 * Protected by user role checks - only admin/manager can modify.
 */
function RepartiManager({ session, onDataChanged }) {
  const [reparti, setReparti] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [formCodice, setFormCodice] = useState('');
  const [formDescrizione, setFormDescrizione] = useState('');
  const [formAttivo, setFormAttivo] = useState(true);
  const [formNote, setFormNote] = useState('');

  const [editingReparto, setEditingReparto] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const userRole = (session?.user?.role || '').trim().toLowerCase();
  const canManage = userRole === 'admin' || userRole === 'manager';

  const fetchReparti = async () => {
    setPageLoading(true);
    setError(null);

    let query = supabase
      .from('reparti')
      .select('*')
      .order('codice');

    if (!showInactive) {
      query = query.eq('attivo', true);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      console.error('Errore fetch reparti:', fetchError);
      setReparti([]);
    } else {
      setReparti(data || []);
    }
    setPageLoading(false);
  };

  useEffect(() => {
    if (canManage) {
      fetchReparti();
    } else {
      setPageLoading(false);
    }
  }, [canManage, showInactive]);

  const resetForm = () => {
    setFormCodice('');
    setFormDescrizione('');
    setFormAttivo(true);
    setFormNote('');
    setEditingReparto(null);
  };

  const handleEditReparto = (reparto) => {
    if (!canManage) {
      alert('Non hai i permessi per modificare.');
      return;
    }
    setEditingReparto(reparto);
    setFormCodice(reparto.codice);
    setFormDescrizione(reparto.descrizione || '');
    setFormAttivo(reparto.attivo !== false);
    setFormNote(reparto.note || '');
    window.scrollTo(0, 0);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!canManage) {
      alert('Non hai i permessi.');
      return;
    }
    if (!formCodice.trim() || !formDescrizione.trim()) {
      alert('Codice e Descrizione sono obbligatori.');
      return;
    }

    setLoadingActions(true);
    setError(null);
    setSuccessMessage('');

    const repartoData = {
      codice: formCodice.trim().toUpperCase(),
      descrizione: formDescrizione.trim(),
      attivo: formAttivo,
      note: formNote.trim() || null
    };

    let opError;
    if (editingReparto) {
      const { error } = await supabase
        .from('reparti')
        .update(repartoData)
        .eq('id', editingReparto.id);
      opError = error;
    } else {
      const { error } = await supabase.from('reparti').insert([repartoData]);
      opError = error;
    }

    if (opError) {
      setError(opError.message);
      alert(
        (editingReparto ? 'Modifica reparto fallita: ' : 'Inserimento reparto fallito: ') +
          opError.message
      );
    } else {
      resetForm();
      await fetchReparti();
      if (onDataChanged) onDataChanged();
      setSuccessMessage(
        editingReparto ? 'Reparto modificato con successo!' : 'Reparto aggiunto con successo!'
      );
      setTimeout(() => setSuccessMessage(''), 3000);
    }
    setLoadingActions(false);
  };

  const handleDeleteReparto = async (repartoId) => {
    if (!canManage) {
      alert('Non hai i permessi.');
      return;
    }
    if (
      window.confirm(
        'Sei sicuro di voler eliminare questo reparto?\n\nATTENZIONE: I tecnici collegati a questo reparto verranno dissociati (reparto_id = NULL).'
      )
    ) {
      setLoadingActions(true);
      setError(null);
      setSuccessMessage('');

      const { error: delError } = await supabase
        .from('reparti')
        .delete()
        .eq('id', repartoId);

      if (delError) {
        setError(delError.message);
        alert('Eliminazione fallita: ' + delError.message);
      } else {
        await fetchReparti();
        if (onDataChanged) onDataChanged();
        if (editingReparto && editingReparto.id === repartoId) resetForm();
        setSuccessMessage('Reparto eliminato con successo!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      setLoadingActions(false);
    }
  };

  const handleToggleActive = async (reparto) => {
    if (!canManage) {
      alert('Non hai i permessi.');
      return;
    }

    setLoadingActions(true);
    setError(null);

    const { error } = await supabase
      .from('reparti')
      .update({ attivo: !reparto.attivo })
      .eq('id', reparto.id);

    if (error) {
      setError(error.message);
      alert('Errore aggiornamento stato: ' + error.message);
    } else {
      await fetchReparti();
      if (onDataChanged) onDataChanged();
      setSuccessMessage(
        `Reparto ${reparto.attivo ? 'disattivato' : 'attivato'} con successo!`
      );
      setTimeout(() => setSuccessMessage(''), 3000);
    }
    setLoadingActions(false);
  };

  if (pageLoading) return <p>Caricamento anagrafica reparti...</p>;
  if (!canManage && session) return <p>Non hai i permessi per gestire questa anagrafica.</p>;
  if (!session && !pageLoading) return <Navigate to="/login" replace />;

  return (
    <div>
      <h2>Anagrafica Reparti</h2>
      <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '20px' }}>
        Gestisci i reparti/dipartimenti per organizzare i tecnici per area di competenza o specializzazione.
      </p>

      {successMessage && <p style={{ color: 'green', fontWeight: 'bold' }}>{successMessage}</p>}
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>ERRORE: {error}</p>}

      <div style={{ marginBottom: '20px' }}>
        <label>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          <span style={{ marginLeft: '5px' }}>Mostra anche reparti disattivati</span>
        </label>
      </div>

      {canManage && (
        <form
          onSubmit={handleSubmitForm}
          style={{
            marginBottom: '30px',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            backgroundColor: '#fafafa'
          }}
        >
          <h3>{editingReparto ? 'Modifica Reparto' : 'Nuovo Reparto'}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
            <div>
              <label htmlFor="formCodice">
                Codice Reparto: <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="formCodice"
                value={formCodice}
                onChange={(e) => setFormCodice(e.target.value)}
                placeholder="es: REP-MECC, REP-ELETT, REP-IMPL"
                required
                style={{ textTransform: 'uppercase' }}
              />
              <small style={{ display: 'block', marginTop: '3px', color: '#666' }}>
                Il codice verrà convertito automaticamente in maiuscolo
              </small>
            </div>

            <div>
              <label htmlFor="formAttivo">Stato:</label>
              <select
                id="formAttivo"
                value={formAttivo}
                onChange={(e) => setFormAttivo(e.target.value === 'true')}
              >
                <option value="true">Attivo</option>
                <option value="false">Disattivato</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label htmlFor="formDescrizione">
              Descrizione Completa: <span style={{ color: 'red' }}>*</span>
            </label>
            <textarea
              id="formDescrizione"
              value={formDescrizione}
              onChange={(e) => setFormDescrizione(e.target.value)}
              rows={2}
              placeholder="es: Reparto Meccanica - Manutenzione ordinaria e straordinaria..."
              required
            />
          </div>

          <div style={{ marginTop: '15px' }}>
            <label htmlFor="formNote">Note Aggiuntive:</label>
            <textarea
              id="formNote"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              rows={2}
              placeholder="Informazioni supplementari, responsabile reparto, orari..."
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <button type="submit" disabled={loadingActions}>
              {loadingActions ? 'Salvataggio...' : editingReparto ? 'Salva Modifiche' : 'Aggiungi Reparto'}
            </button>
            {editingReparto && (
              <button
                type="button"
                className="secondary"
                onClick={resetForm}
                disabled={loadingActions}
                style={{ marginLeft: '10px' }}
              >
                Annulla Modifica
              </button>
            )}
          </div>
        </form>
      )}

      <h3>Elenco Reparti ({reparti.length})</h3>
      {reparti.length === 0 && !pageLoading ? (
        <p style={{ padding: '20px', textAlign: 'center', color: '#666', backgroundColor: '#f9f9f9', borderRadius: '5px' }}>
          {showInactive ? 'Nessun reparto trovato.' : 'Nessun reparto attivo trovato. Attiva "Mostra anche reparti disattivati" per vedere tutti.'}
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>Codice</th>
              <th style={{ width: '50%' }}>Descrizione</th>
              <th style={{ width: '10%' }}>Stato</th>
              {canManage && <th style={{ width: '25%' }}>Azioni</th>}
            </tr>
          </thead>
          <tbody>
            {reparti.map((r) => (
              <tr
                key={r.id}
                style={{
                  backgroundColor: editingReparto && editingReparto.id === r.id ? '#e6f7ff' : r.attivo ? 'transparent' : '#f9f9f9',
                  opacity: r.attivo ? 1 : 0.6
                }}
              >
                <td>
                  <strong style={{ fontSize: '1.1em' }}>{r.codice}</strong>
                </td>
                <td>
                  <div>{r.descrizione}</div>
                  {r.note && (
                    <div style={{ fontSize: '0.85em', color: '#666', marginTop: '5px', fontStyle: 'italic' }}>
                      📝 {r.note}
                    </div>
                  )}
                </td>
                <td>
                  <span
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      fontSize: '0.85em',
                      fontWeight: '600',
                      backgroundColor: r.attivo ? '#d4edda' : '#f8d7da',
                      color: r.attivo ? '#155724' : '#721c24',
                      display: 'inline-block'
                    }}
                  >
                    {r.attivo ? '✓ Attivo' : '✗ Disattivo'}
                  </span>
                </td>
                {canManage && (
                  <td className="actions">
                    <button
                      className="button secondary small"
                      onClick={() => handleEditReparto(r)}
                      disabled={loadingActions}
                      title="Modifica reparto"
                    >
                      ✏️ Modifica
                    </button>
                    <button
                      className="button warning small"
                      onClick={() => handleToggleActive(r)}
                      disabled={loadingActions}
                      style={{ marginLeft: '5px' }}
                      title={r.attivo ? 'Disattiva reparto' : 'Attiva reparto'}
                    >
                      {r.attivo ? '⊗ Disattiva' : '⊕ Attiva'}
                    </button>
                    <button
                      className="button danger small"
                      onClick={() => handleDeleteReparto(r.id)}
                      disabled={loadingActions}
                      style={{ marginLeft: '5px' }}
                      title="Elimina reparto (ATTENZIONE: azione irreversibile)"
                    >
                      🗑️ Elimina
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default RepartiManager;
