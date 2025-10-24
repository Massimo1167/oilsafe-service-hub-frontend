/**
 * Management component for job roles/qualifications ("mansioni").
 * Provides CRUD operations for managing technician job roles with hourly costs.
 * Protected by user role checks from App.jsx - only admin/manager can modify.
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Navigate } from 'react-router-dom';
import { formatCosto } from '../../utils/costiInterventi';

function MansioniManager({ session }) {
  const [mansioni, setMansioni] = useState([]);
  const [loadingActions, setLoadingActions] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Form state
  const [formRuolo, setFormRuolo] = useState('');
  const [formDescrizione, setFormDescrizione] = useState('');
  const [formLivello, setFormLivello] = useState('generico');
  const [formCategoria, setFormCategoria] = useState('operaio');

  // Cost fields - normale
  const [formCostoOrarioSede, setFormCostoOrarioSede] = useState('0.00');
  const [formCostoOrarioTrasferta, setFormCostoOrarioTrasferta] = useState('0.00');

  // Cost fields - straordinario
  const [formCostoStraordinarioSede, setFormCostoStraordinarioSede] = useState('0.00');
  const [formCostoStraordinarioTrasferta, setFormCostoStraordinarioTrasferta] = useState('0.00');

  // Cost fields - festivo
  const [formCostoFestivoSede, setFormCostoFestivoSede] = useState('0.00');
  const [formCostoFestivoTrasferta, setFormCostoFestivoTrasferta] = useState('0.00');

  // Cost fields - straordinario festivo
  const [formCostoStraordinarioFestivoSede, setFormCostoStraordinarioFestivoSede] = useState('0.00');
  const [formCostoStraordinarioFestivoTrasferta, setFormCostoStraordinarioFestivoTrasferta] = useState('0.00');

  const [formAttivo, setFormAttivo] = useState(true);
  const [formNote, setFormNote] = useState('');

  const [editingMansione, setEditingMansione] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  const userRole = (session?.user?.role || '').trim().toLowerCase();
  const canManage = userRole === 'admin' || userRole === 'manager';

  const livelliOptions = [
    { value: 'generico', label: 'Generico' },
    { value: 'junior', label: 'Junior' },
    { value: 'senior', label: 'Senior' }
  ];

  const categorieOptions = [
    { value: 'operaio', label: 'Operaio' },
    { value: 'carpentiere', label: 'Carpentiere' },
    { value: 'oleodinamico', label: 'Oleodinamico' },
    { value: 'meccanico', label: 'Meccanico' },
    { value: 'elettricista', label: 'Elettricista' },
    { value: 'softwarista', label: 'Softwarista' },
    { value: 'progettista', label: 'Progettista' },
    { value: 'amministrazione', label: 'Amministrazione' }
  ];

  const fetchMansioni = async () => {
    setPageLoading(true);
    setError(null);

    let query = supabase
      .from('mansioni')
      .select('*')
      .order('categoria')
      .order('livello')
      .order('ruolo');

    if (!showInactive) {
      query = query.eq('attivo', true);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      console.error('Errore fetch mansioni:', fetchError);
      setMansioni([]);
    } else {
      setMansioni(data || []);
    }
    setPageLoading(false);
  };

  useEffect(() => {
    if (canManage) {
      fetchMansioni();
    } else {
      setPageLoading(false);
    }
  }, [canManage, showInactive]);

  const resetForm = () => {
    setFormRuolo('');
    setFormDescrizione('');
    setFormLivello('generico');
    setFormCategoria('operaio');
    setFormCostoOrarioSede('0.00');
    setFormCostoOrarioTrasferta('0.00');
    setFormCostoStraordinarioSede('0.00');
    setFormCostoStraordinarioTrasferta('0.00');
    setFormCostoFestivoSede('0.00');
    setFormCostoFestivoTrasferta('0.00');
    setFormCostoStraordinarioFestivoSede('0.00');
    setFormCostoStraordinarioFestivoTrasferta('0.00');
    setFormAttivo(true);
    setFormNote('');
    setEditingMansione(null);
  };

  const handleEditMansione = (mansione) => {
    if (!canManage) {
      alert('Non hai i permessi per modificare.');
      return;
    }
    setEditingMansione(mansione);
    setFormRuolo(mansione.ruolo);
    setFormDescrizione(mansione.descrizione || '');
    setFormLivello(mansione.livello || 'generico');
    setFormCategoria(mansione.categoria || 'operaio');
    setFormCostoOrarioSede(mansione.costo_orario_sede || '0.00');
    setFormCostoOrarioTrasferta(mansione.costo_orario_trasferta || '0.00');
    setFormCostoStraordinarioSede(mansione.costo_straordinario_sede || '0.00');
    setFormCostoStraordinarioTrasferta(mansione.costo_straordinario_trasferta || '0.00');
    setFormCostoFestivoSede(mansione.costo_festivo_sede || '0.00');
    setFormCostoFestivoTrasferta(mansione.costo_festivo_trasferta || '0.00');
    setFormCostoStraordinarioFestivoSede(mansione.costo_straordinario_festivo_sede || '0.00');
    setFormCostoStraordinarioFestivoTrasferta(mansione.costo_straordinario_festivo_trasferta || '0.00');
    setFormAttivo(mansione.attivo !== false);
    setFormNote(mansione.note || '');
    window.scrollTo(0, 0);
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!canManage) {
      alert('Non hai i permessi.');
      return;
    }
    if (!formRuolo.trim()) {
      alert('Il campo Ruolo è obbligatorio.');
      return;
    }

    setLoadingActions(true);
    setError(null);
    setSuccessMessage('');

    const mansioneData = {
      ruolo: formRuolo.trim(),
      descrizione: formDescrizione.trim() || null,
      livello: formLivello,
      categoria: formCategoria,
      costo_orario_sede: parseFloat(formCostoOrarioSede) || 0,
      costo_orario_trasferta: parseFloat(formCostoOrarioTrasferta) || 0,
      costo_straordinario_sede: parseFloat(formCostoStraordinarioSede) || 0,
      costo_straordinario_trasferta: parseFloat(formCostoStraordinarioTrasferta) || 0,
      costo_festivo_sede: parseFloat(formCostoFestivoSede) || 0,
      costo_festivo_trasferta: parseFloat(formCostoFestivoTrasferta) || 0,
      costo_straordinario_festivo_sede: parseFloat(formCostoStraordinarioFestivoSede) || 0,
      costo_straordinario_festivo_trasferta: parseFloat(formCostoStraordinarioFestivoTrasferta) || 0,
      attivo: formAttivo,
      note: formNote.trim() || null
    };

    let opError;
    if (editingMansione) {
      const { error } = await supabase
        .from('mansioni')
        .update(mansioneData)
        .eq('id', editingMansione.id);
      opError = error;
    } else {
      const { error } = await supabase.from('mansioni').insert([mansioneData]);
      opError = error;
    }

    if (opError) {
      setError(opError.message);
      alert(
        (editingMansione ? 'Modifica mansione fallita: ' : 'Inserimento mansione fallito: ') +
          opError.message
      );
    } else {
      resetForm();
      await fetchMansioni();
      setSuccessMessage(
        editingMansione ? 'Mansione modificata con successo!' : 'Mansione aggiunta con successo!'
      );
      setTimeout(() => setSuccessMessage(''), 3000);
    }
    setLoadingActions(false);
  };

  const handleDeleteMansione = async (mansioneId) => {
    if (!canManage) {
      alert('Non hai i permessi.');
      return;
    }
    if (
      window.confirm(
        'Sei sicuro di voler eliminare questa mansione? ATTENZIONE: potrebbe influenzare i tecnici collegati.'
      )
    ) {
      setLoadingActions(true);
      setError(null);
      setSuccessMessage('');

      const { error: delError } = await supabase
        .from('mansioni')
        .delete()
        .eq('id', mansioneId);

      if (delError) {
        setError(delError.message);
        alert('Eliminazione fallita: ' + delError.message);
      } else {
        await fetchMansioni();
        if (editingMansione && editingMansione.id === mansioneId) resetForm();
        setSuccessMessage('Mansione eliminata con successo!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
      setLoadingActions(false);
    }
  };

  const handleToggleActive = async (mansione) => {
    if (!canManage) {
      alert('Non hai i permessi.');
      return;
    }

    setLoadingActions(true);
    setError(null);

    const { error } = await supabase
      .from('mansioni')
      .update({ attivo: !mansione.attivo })
      .eq('id', mansione.id);

    if (error) {
      setError(error.message);
      alert('Errore aggiornamento stato: ' + error.message);
    } else {
      await fetchMansioni();
      setSuccessMessage(
        `Mansione ${mansione.attivo ? 'disattivata' : 'attivata'} con successo!`
      );
      setTimeout(() => setSuccessMessage(''), 3000);
    }
    setLoadingActions(false);
  };

  if (pageLoading) return <p>Caricamento anagrafica mansioni...</p>;
  if (!canManage && session) return <p>Non hai i permessi per gestire questa anagrafica.</p>;
  if (!session && !pageLoading) return <Navigate to="/login" replace />;

  return (
    <div>
      <h2>Anagrafica Mansioni</h2>
      <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '20px' }}>
        Gestisci le qualifiche/ruoli dei tecnici con i relativi costi orari. I costi sono
        differenziati per tipo orario (normale/straordinario/festivo) e ubicazione (sede/trasferta).
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
          Mostra anche mansioni disattivate
        </label>
      </div>

      {canManage && (
        <form
          onSubmit={handleSubmitForm}
          style={{
            marginBottom: '30px',
            padding: '20px',
            border: '1px solid #eee',
            borderRadius: '5px',
            backgroundColor: '#fafafa'
          }}
        >
          <h3>{editingMansione ? 'Modifica Mansione' : 'Nuova Mansione'}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <label htmlFor="formRuolo">
                Ruolo: <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                id="formRuolo"
                value={formRuolo}
                onChange={(e) => setFormRuolo(e.target.value)}
                placeholder="es: Meccanico Senior"
                required
              />
            </div>

            <div>
              <label htmlFor="formCategoria">Categoria:</label>
              <select
                id="formCategoria"
                value={formCategoria}
                onChange={(e) => setFormCategoria(e.target.value)}
              >
                {categorieOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="formLivello">Livello:</label>
              <select
                id="formLivello"
                value={formLivello}
                onChange={(e) => setFormLivello(e.target.value)}
              >
                {livelliOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
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
            <label htmlFor="formDescrizione">Descrizione:</label>
            <textarea
              id="formDescrizione"
              value={formDescrizione}
              onChange={(e) => setFormDescrizione(e.target.value)}
              rows={2}
              placeholder="Descrizione dettagliata della mansione..."
            />
          </div>

          <h4 style={{ marginTop: '20px', marginBottom: '10px', borderBottom: '2px solid #007bff' }}>
            Costi Orari (€/ora)
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <h5 style={{ marginBottom: '10px', color: '#555' }}>Orario Normale</h5>
              <div>
                <label htmlFor="formCostoOrarioSede">Sede:</label>
                <input
                  type="number"
                  id="formCostoOrarioSede"
                  value={formCostoOrarioSede}
                  onChange={(e) => setFormCostoOrarioSede(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="formCostoOrarioTrasferta">Trasferta:</label>
                <input
                  type="number"
                  id="formCostoOrarioTrasferta"
                  value={formCostoOrarioTrasferta}
                  onChange={(e) => setFormCostoOrarioTrasferta(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div>
              <h5 style={{ marginBottom: '10px', color: '#555' }}>Orario Straordinario</h5>
              <div>
                <label htmlFor="formCostoStraordinarioSede">Sede:</label>
                <input
                  type="number"
                  id="formCostoStraordinarioSede"
                  value={formCostoStraordinarioSede}
                  onChange={(e) => setFormCostoStraordinarioSede(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="formCostoStraordinarioTrasferta">Trasferta:</label>
                <input
                  type="number"
                  id="formCostoStraordinarioTrasferta"
                  value={formCostoStraordinarioTrasferta}
                  onChange={(e) => setFormCostoStraordinarioTrasferta(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div>
              <h5 style={{ marginBottom: '10px', color: '#555' }}>Orario Festivo</h5>
              <div>
                <label htmlFor="formCostoFestivoSede">Sede:</label>
                <input
                  type="number"
                  id="formCostoFestivoSede"
                  value={formCostoFestivoSede}
                  onChange={(e) => setFormCostoFestivoSede(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="formCostoFestivoTrasferta">Trasferta:</label>
                <input
                  type="number"
                  id="formCostoFestivoTrasferta"
                  value={formCostoFestivoTrasferta}
                  onChange={(e) => setFormCostoFestivoTrasferta(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>

            <div>
              <h5 style={{ marginBottom: '10px', color: '#555' }}>Straordinario Festivo</h5>
              <div>
                <label htmlFor="formCostoStraordinarioFestivoSede">Sede:</label>
                <input
                  type="number"
                  id="formCostoStraordinarioFestivoSede"
                  value={formCostoStraordinarioFestivoSede}
                  onChange={(e) => setFormCostoStraordinarioFestivoSede(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label htmlFor="formCostoStraordinarioFestivoTrasferta">Trasferta:</label>
                <input
                  type="number"
                  id="formCostoStraordinarioFestivoTrasferta"
                  value={formCostoStraordinarioFestivoTrasferta}
                  onChange={(e) => setFormCostoStraordinarioFestivoTrasferta(e.target.value)}
                  step="0.01"
                  min="0"
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label htmlFor="formNote">Note:</label>
            <textarea
              id="formNote"
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              rows={2}
              placeholder="Note aggiuntive..."
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <button type="submit" disabled={loadingActions}>
              {loadingActions ? 'Salvataggio...' : editingMansione ? 'Salva Modifiche' : 'Aggiungi Mansione'}
            </button>
            {editingMansione && (
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

      <h3>Elenco Mansioni ({mansioni.length})</h3>
      {mansioni.length === 0 && !pageLoading ? (
        <p>Nessuna mansione trovata.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Ruolo</th>
                <th>Categoria</th>
                <th>Livello</th>
                <th>Costo Orario Sede</th>
                <th>Costo Orario Trasferta</th>
                <th>Stato</th>
                {canManage && <th>Azioni</th>}
              </tr>
            </thead>
            <tbody>
              {mansioni.map((m) => (
                <tr
                  key={m.id}
                  style={{
                    backgroundColor: editingMansione && editingMansione.id === m.id ? '#e6f7ff' : m.attivo ? 'transparent' : '#f9f9f9',
                    opacity: m.attivo ? 1 : 0.6
                  }}
                >
                  <td>
                    <strong>{m.ruolo}</strong>
                    {m.descrizione && (
                      <div style={{ fontSize: '0.85em', color: '#666', marginTop: '3px' }}>
                        {m.descrizione}
                      </div>
                    )}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{m.categoria}</td>
                  <td style={{ textTransform: 'capitalize' }}>{m.livello}</td>
                  <td>{formatCosto(m.costo_orario_sede)}</td>
                  <td>{formatCosto(m.costo_orario_trasferta)}</td>
                  <td>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '3px',
                        fontSize: '0.85em',
                        backgroundColor: m.attivo ? '#d4edda' : '#f8d7da',
                        color: m.attivo ? '#155724' : '#721c24'
                      }}
                    >
                      {m.attivo ? 'Attivo' : 'Disattivato'}
                    </span>
                  </td>
                  {canManage && (
                    <td className="actions">
                      <button
                        className="button secondary small"
                        onClick={() => handleEditMansione(m)}
                        disabled={loadingActions}
                      >
                        Modifica
                      </button>
                      <button
                        className="button warning small"
                        onClick={() => handleToggleActive(m)}
                        disabled={loadingActions}
                        style={{ marginLeft: '5px' }}
                      >
                        {m.attivo ? 'Disattiva' : 'Attiva'}
                      </button>
                      <button
                        className="button danger small"
                        onClick={() => handleDeleteMansione(m.id)}
                        disabled={loadingActions}
                        style={{ marginLeft: '5px' }}
                      >
                        Elimina
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MansioniManager;
