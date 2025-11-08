import React, { useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Modal per visualizzare dettagli completi di una pianificazione
 * Mostra informazioni foglio, tecnici, mezzi, date/orari, stato
 * Permette azioni: modifica, cancellazione, cambio stato, navigazione al foglio
 */
function ModalDettagliPianificazione({
  pianificazione,
  onClose,
  onEdit,
  onDelete,
  onChangeState,
  onNavigateToFoglio,
  clienti,
  tecnici,
  commesse,
  mezzi,
}) {
  const [deleting, setDeleting] = useState(false);

  if (!pianificazione) return null;

  const {
    id,
    foglio_assistenza_id,
    numeroFoglio,
    clienteNome,
    commessaCodice,
    commessaDescrizione,
    data_inizio_pianificata,
    ora_inizio_pianificata,
    data_fine_pianificata,
    ora_fine_pianificata,
    tutto_il_giorno,
    salta_sabato,
    salta_domenica,
    salta_festivi,
    tecnici_assegnati,
    mezzo_principale_id,
    mezzi_secondari_ids,
    stato_pianificazione,
  } = pianificazione;

  // Risolvi nomi tecnici da UUID array
  const tecniciNomi = (tecnici_assegnati || [])
    .map((tecnicoId) => {
      const tecnico = tecnici.find((t) => t.id === tecnicoId);
      return tecnico ? `${tecnico.nome} ${tecnico.cognome}` : 'N/A';
    })
    .filter((nome) => nome !== 'N/A');

  // Risolvi mezzo principale
  const mezzoPrincipale = mezzo_principale_id
    ? mezzi.find((m) => m.id === mezzo_principale_id)
    : null;

  // Risolvi mezzi secondari
  const mezziSecondari = (mezzi_secondari_ids || [])
    .map((mezzoId) => mezzi.find((m) => m.id === mezzoId))
    .filter((m) => m);

  // Formatta date
  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT');
  };

  // Formatta orario
  const formatTime = (timeStr) => {
    if (!timeStr) return 'N/A';
    return timeStr.substring(0, 5); // HH:MM
  };

  // Colore stato
  const getStatoColor = (stato) => {
    switch (stato) {
      case 'Pianificata':
        return '#6c757d';
      case 'Confermata':
        return '#007bff';
      case 'In Corso':
        return '#ffc107';
      case 'Completata':
        return '#28a745';
      case 'Cancellata':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  };

  // Prossimi stati possibili
  const getNextStates = (currentState) => {
    switch (currentState) {
      case 'Pianificata':
        return ['Confermata', 'In Corso', 'Cancellata'];
      case 'Confermata':
        return ['In Corso', 'Pianificata', 'Cancellata'];
      case 'In Corso':
        return ['Completata', 'Confermata', 'Cancellata'];
      case 'Completata':
        return ['In Corso', 'Cancellata'];
      case 'Cancellata':
        return ['Pianificata'];
      default:
        return [];
    }
  };

  const nextStates = getNextStates(stato_pianificazione);

  const handleDelete = async () => {
    if (!window.confirm(`Sei sicuro di voler eliminare questa pianificazione?`)) {
      return;
    }
    setDeleting(true);
    await onDelete(id);
    setDeleting(false);
  };

  const handleChangeState = async (newState) => {
    if (!window.confirm(`Confermi il cambio di stato a "${newState}"?`)) {
      return;
    }
    await onChangeState(id, newState);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Dettagli Pianificazione</h2>
          <button className="modal-close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Informazioni Foglio */}
          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1em', marginBottom: '10px', color: '#333' }}>
              Foglio di Assistenza
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <strong>Numero Foglio:</strong> {numeroFoglio || 'N/A'}
              </div>
              <div>
                <strong>Cliente:</strong> {clienteNome || 'N/A'}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Commessa:</strong> {commessaCodice || 'N/A'}
                {commessaDescrizione && ` - ${commessaDescrizione}`}
              </div>
            </div>
          </section>

          {/* Date e Orari */}
          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1em', marginBottom: '10px', color: '#333' }}>
              Date e Orari
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <strong>Data Inizio:</strong> {formatDate(data_inizio_pianificata)}
              </div>
              <div>
                <strong>Data Fine:</strong> {formatDate(data_fine_pianificata)}
              </div>
              {!tutto_il_giorno && (
                <>
                  <div>
                    <strong>Ora Inizio:</strong> {formatTime(ora_inizio_pianificata)}
                  </div>
                  <div>
                    <strong>Ora Fine:</strong> {formatTime(ora_fine_pianificata)}
                  </div>
                </>
              )}
              <div style={{ gridColumn: '1 / -1' }}>
                <strong>Tutto il giorno:</strong> {tutto_il_giorno ? 'Sì' : 'No'}
              </div>
            </div>
          </section>

          {/* Opzioni Giorni */}
          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1em', marginBottom: '10px', color: '#333' }}>
              Esclusioni
            </h3>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="checkbox" checked={salta_sabato} disabled />
                Salta Sabato
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="checkbox" checked={salta_domenica} disabled />
                Salta Domenica
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <input type="checkbox" checked={salta_festivi} disabled />
                Salta Festivi
              </label>
            </div>
          </section>

          {/* Tecnici Assegnati */}
          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1em', marginBottom: '10px', color: '#333' }}>
              Tecnici Assegnati
            </h3>
            <div>
              {tecniciNomi.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  {tecniciNomi.map((nome, idx) => (
                    <li key={idx}>{nome}</li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: '#999', margin: 0 }}>Nessun tecnico assegnato</p>
              )}
            </div>
          </section>

          {/* Mezzi Assegnati */}
          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1em', marginBottom: '10px', color: '#333' }}>
              Mezzi Assegnati
            </h3>
            <div>
              {mezzoPrincipale && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Mezzo Principale:</strong> {mezzoPrincipale.targa} (
                  {mezzoPrincipale.tipo_mezzo} - {mezzoPrincipale.marca} {mezzoPrincipale.modello})
                </div>
              )}
              {mezziSecondari.length > 0 && (
                <div>
                  <strong>Mezzi Secondari:</strong>
                  <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px' }}>
                    {mezziSecondari.map((mezzo) => (
                      <li key={mezzo.id}>
                        {mezzo.targa} ({mezzo.tipo_mezzo} - {mezzo.marca} {mezzo.modello})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {!mezzoPrincipale && mezziSecondari.length === 0 && (
                <p style={{ color: '#999', margin: 0 }}>Nessun mezzo assegnato</p>
              )}
            </div>
          </section>

          {/* Stato */}
          <section style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1em', marginBottom: '10px', color: '#333' }}>Stato</h3>
            <div
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                borderRadius: '4px',
                backgroundColor: getStatoColor(stato_pianificazione),
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              {stato_pianificazione}
            </div>
          </section>

          {/* Cambio Stato */}
          {nextStates.length > 0 && (
            <section style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.1em', marginBottom: '10px', color: '#333' }}>
                Cambia Stato
              </h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {nextStates.map((state) => (
                  <button
                    key={state}
                    className="button small"
                    onClick={() => handleChangeState(state)}
                    style={{
                      backgroundColor: getStatoColor(state),
                      color: 'white',
                      border: 'none',
                    }}
                  >
                    → {state}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="modal-footer">
          <button className="button" onClick={() => onNavigateToFoglio(foglio_assistenza_id)}>
            Vai al Foglio
          </button>
          <button className="button" onClick={() => onEdit(pianificazione)}>
            Modifica
          </button>
          <button
            className="button danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? 'Eliminazione...' : 'Elimina'}
          </button>
          <button className="button" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

ModalDettagliPianificazione.propTypes = {
  pianificazione: PropTypes.shape({
    id: PropTypes.string.isRequired,
    foglio_assistenza_id: PropTypes.string.isRequired,
    numeroFoglio: PropTypes.string,
    clienteNome: PropTypes.string,
    commessaCodice: PropTypes.string,
    commessaDescrizione: PropTypes.string,
    data_inizio_pianificata: PropTypes.string.isRequired,
    ora_inizio_pianificata: PropTypes.string,
    data_fine_pianificata: PropTypes.string.isRequired,
    ora_fine_pianificata: PropTypes.string,
    tutto_il_giorno: PropTypes.bool,
    salta_sabato: PropTypes.bool,
    salta_domenica: PropTypes.bool,
    salta_festivi: PropTypes.bool,
    tecnici_assegnati: PropTypes.arrayOf(PropTypes.string),
    mezzo_principale_id: PropTypes.string,
    mezzi_secondari_ids: PropTypes.arrayOf(PropTypes.string),
    stato_pianificazione: PropTypes.string.isRequired,
  }),
  onClose: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onChangeState: PropTypes.func.isRequired,
  onNavigateToFoglio: PropTypes.func.isRequired,
  clienti: PropTypes.array.isRequired,
  tecnici: PropTypes.array.isRequired,
  commesse: PropTypes.array.isRequired,
  mezzi: PropTypes.array.isRequired,
};

export default ModalDettagliPianificazione;
