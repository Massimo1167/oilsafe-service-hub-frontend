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

  // Cost fields - normale (3 locations: oilsafe, cliente, teleassistenza)
  const [formCostoOrarioOilsafe, setFormCostoOrarioOilsafe] = useState('0.00');
  const [formCostoOrarioCliente, setFormCostoOrarioCliente] = useState('0.00');
  const [formCostoOrarioTeleassistenza, setFormCostoOrarioTeleassistenza] = useState('0.00');

  // Cost fields - straordinario
  const [formCostoStraordinarioOilsafe, setFormCostoStraordinarioOilsafe] = useState('0.00');
  const [formCostoStraordinarioCliente, setFormCostoStraordinarioCliente] = useState('0.00');
  const [formCostoStraordinarioTeleassistenza, setFormCostoStraordinarioTeleassistenza] = useState('0.00');

  // Cost fields - festivo
  const [formCostoFestivoOilsafe, setFormCostoFestivoOilsafe] = useState('0.00');
  const [formCostoFestivoCliente, setFormCostoFestivoCliente] = useState('0.00');
  const [formCostoFestivoTeleassistenza, setFormCostoFestivoTeleassistenza] = useState('0.00');

  // Cost fields - straordinario festivo
  const [formCostoStraordinarioFestivoOilsafe, setFormCostoStraordinarioFestivoOilsafe] = useState('0.00');
  const [formCostoStraordinarioFestivoCliente, setFormCostoStraordinarioFestivoCliente] = useState('0.00');
  const [formCostoStraordinarioFestivoTeleassistenza, setFormCostoStraordinarioFestivoTeleassistenza] = useState('0.00');

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
    // Reset tutti i 12 campi costo (3 ubicazioni × 4 categorie orarie)
    setFormCostoOrarioOilsafe('0.00');
    setFormCostoOrarioCliente('0.00');
    setFormCostoOrarioTeleassistenza('0.00');
    setFormCostoStraordinarioOilsafe('0.00');
    setFormCostoStraordinarioCliente('0.00');
    setFormCostoStraordinarioTeleassistenza('0.00');
    setFormCostoFestivoOilsafe('0.00');
    setFormCostoFestivoCliente('0.00');
    setFormCostoFestivoTeleassistenza('0.00');
    setFormCostoStraordinarioFestivoOilsafe('0.00');
    setFormCostoStraordinarioFestivoCliente('0.00');
    setFormCostoStraordinarioFestivoTeleassistenza('0.00');
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
    // Carica tutti i 12 campi costo dalla mansione
    setFormCostoOrarioOilsafe(mansione.costo_orario_oilsafe || '0.00');
    setFormCostoOrarioCliente(mansione.costo_orario_cliente || '0.00');
    setFormCostoOrarioTeleassistenza(mansione.costo_orario_teleassistenza || '0.00');
    setFormCostoStraordinarioOilsafe(mansione.costo_straordinario_oilsafe || '0.00');
    setFormCostoStraordinarioCliente(mansione.costo_straordinario_cliente || '0.00');
    setFormCostoStraordinarioTeleassistenza(mansione.costo_straordinario_teleassistenza || '0.00');
    setFormCostoFestivoOilsafe(mansione.costo_festivo_oilsafe || '0.00');
    setFormCostoFestivoCliente(mansione.costo_festivo_cliente || '0.00');
    setFormCostoFestivoTeleassistenza(mansione.costo_festivo_teleassistenza || '0.00');
    setFormCostoStraordinarioFestivoOilsafe(mansione.costo_straordinario_festivo_oilsafe || '0.00');
    setFormCostoStraordinarioFestivoCliente(mansione.costo_straordinario_festivo_cliente || '0.00');
    setFormCostoStraordinarioFestivoTeleassistenza(mansione.costo_straordinario_festivo_teleassistenza || '0.00');
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
      // Costi per ubicazione Oilsafe
      costo_orario_oilsafe: parseFloat(formCostoOrarioOilsafe) || 0,
      costo_straordinario_oilsafe: parseFloat(formCostoStraordinarioOilsafe) || 0,
      costo_festivo_oilsafe: parseFloat(formCostoFestivoOilsafe) || 0,
      costo_straordinario_festivo_oilsafe: parseFloat(formCostoStraordinarioFestivoOilsafe) || 0,
      // Costi per ubicazione Cliente
      costo_orario_cliente: parseFloat(formCostoOrarioCliente) || 0,
      costo_straordinario_cliente: parseFloat(formCostoStraordinarioCliente) || 0,
      costo_festivo_cliente: parseFloat(formCostoFestivoCliente) || 0,
      costo_straordinario_festivo_cliente: parseFloat(formCostoStraordinarioFestivoCliente) || 0,
      // Costi per ubicazione Teleassistenza
      costo_orario_teleassistenza: parseFloat(formCostoOrarioTeleassistenza) || 0,
      costo_straordinario_teleassistenza: parseFloat(formCostoStraordinarioTeleassistenza) || 0,
      costo_festivo_teleassistenza: parseFloat(formCostoFestivoTeleassistenza) || 0,
      costo_straordinario_festivo_teleassistenza: parseFloat(formCostoStraordinarioFestivoTeleassistenza) || 0,
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
                <label htmlFor="formCostoOrarioOilsafe">Sede Oilsafe:</label>
                <input
                  type="number"
                  id="formCostoOrarioOilsafe"
                  value={formCostoOrarioOilsafe}
                  onChange={(e) => setFormCostoOrarioOilsafe(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="es. 25.00"
                />
              </div>
              <div>
                <label htmlFor="formCostoOrarioCliente">Sede Cliente:</label>
                <input
                  type="number"
                  id="formCostoOrarioCliente"
                  value={formCostoOrarioCliente}
                  onChange={(e) => setFormCostoOrarioCliente(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="es. 30.00"
                />
              </div>
              <div>
                <label htmlFor="formCostoOrarioTeleassistenza">Teleassistenza:</label>
                <input
                  type="number"
                  id="formCostoOrarioTeleassistenza"
                  value={formCostoOrarioTeleassistenza}
                  onChange={(e) => setFormCostoOrarioTeleassistenza(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="es. 27.50"
                />
              </div>
            </div>

            <div>
              <h5 style={{ marginBottom: '10px', color: '#555' }}>Orario Straordinario</h5>
              <div>
                <label htmlFor="formCostoStraordinarioOilsafe">Sede Oilsafe:</label>
                <input
                  type="number"
                  id="formCostoStraordinarioOilsafe"
                  value={formCostoStraordinarioOilsafe}
                  onChange={(e) => setFormCostoStraordinarioOilsafe(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="es. 32.50"
                />
              </div>
              <div>
                <label htmlFor="formCostoStraordinarioCliente">Sede Cliente:</label>
                <input
                  type="number"
                  id="formCostoStraordinarioCliente"
                  value={formCostoStraordinarioCliente}
                  onChange={(e) => setFormCostoStraordinarioCliente(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="es. 39.00"
                />
              </div>
              <div>
                <label htmlFor="formCostoStraordinarioTeleassistenza">Teleassistenza:</label>
                <input
                  type="number"
                  id="formCostoStraordinarioTeleassistenza"
                  value={formCostoStraordinarioTeleassistenza}
                  onChange={(e) => setFormCostoStraordinarioTeleassistenza(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="es. 35.75"
                />
              </div>
            </div>

            <div>
              <h5 style={{ marginBottom: '10px', color: '#555' }}>Orario Festivo</h5>
              <div>
                <label htmlFor="formCostoFestivoOilsafe">Sede Oilsafe:</label>
                <input
                  type="number"
                  id="formCostoFestivoOilsafe"
                  value={formCostoFestivoOilsafe}
                  onChange={(e) => setFormCostoFestivoOilsafe(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="es. 37.50"
                />
              </div>
              <div>
                <label htmlFor="formCostoFestivoCliente">Sede Cliente:</label>
                <input
                  type="number"
                  id="formCostoFestivoCliente"
                  value={formCostoFestivoCliente}
                  onChange={(e) => setFormCostoFestivoCliente(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="es. 45.00"
                />
              </div>
              <div>
                <label htmlFor="formCostoFestivoTeleassistenza">Teleassistenza:</label>
                <input
                  type="number"
                  id="formCostoFestivoTeleassistenza"
                  value={formCostoFestivoTeleassistenza}
                  onChange={(e) => setFormCostoFestivoTeleassistenza(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="es. 41.25"
                />
              </div>
            </div>

            <div>
              <h5 style={{ marginBottom: '10px', color: '#555' }}>Straordinario Festivo</h5>
              <div>
                <label htmlFor="formCostoStraordinarioFestivoOilsafe">Sede Oilsafe:</label>
                <input
                  type="number"
                  id="formCostoStraordinarioFestivoOilsafe"
                  value={formCostoStraordinarioFestivoOilsafe}
                  onChange={(e) => setFormCostoStraordinarioFestivoOilsafe(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="es. 43.75"
                />
              </div>
              <div>
                <label htmlFor="formCostoStraordinarioFestivoCliente">Sede Cliente:</label>
                <input
                  type="number"
                  id="formCostoStraordinarioFestivoCliente"
                  value={formCostoStraordinarioFestivoCliente}
                  onChange={(e) => setFormCostoStraordinarioFestivoCliente(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="es. 52.50"
                />
              </div>
              <div>
                <label htmlFor="formCostoStraordinarioFestivoTeleassistenza">Teleassistenza:</label>
                <input
                  type="number"
                  id="formCostoStraordinarioFestivoTeleassistenza"
                  value={formCostoStraordinarioFestivoTeleassistenza}
                  onChange={(e) => setFormCostoStraordinarioFestivoTeleassistenza(e.target.value)}
                  step="0.01"
                  min="0"
                  placeholder="es. 48.13"
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
        <div className="table-responsive-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ruolo</th>
                <th>Categoria</th>
                <th>Livello</th>
                <th>Costo Orario Oilsafe</th>
                <th>Costo Orario Cliente</th>
                <th>Costo Orario Teleass.</th>
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
                  <td>{formatCosto(m.costo_orario_oilsafe)}</td>
                  <td>{formatCosto(m.costo_orario_cliente)}</td>
                  <td>{formatCosto(m.costo_orario_teleassistenza)}</td>
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
