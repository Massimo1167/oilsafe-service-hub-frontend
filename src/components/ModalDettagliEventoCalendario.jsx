import React from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import './ModalDettagliEventoCalendario.css';

/**
 * Modal per mostrare i dettagli di un evento del calendario
 * Mostra informazioni aggregate e lista interventi singoli
 */
function ModalDettagliEventoCalendario({ evento, onClose }) {
  const navigate = useNavigate();

  if (!evento) return null;

  const {
    commessaCodice,
    tecnicoNome,
    clienteNome,
    oreLavoro,
    oreViaggio,
    oreTotali,
    interventi,
  } = evento;

  const handleNavigateToFoglio = (foglioId) => {
    navigate(`/fogli-assistenza/${foglioId}`);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-dettagli" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Dettagli Evento</h2>
          <button className="modal-close-button" onClick={onClose} aria-label="Chiudi">
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* Informazioni principali */}
          <div className="dettaglio-grid">
            <div className="dettaglio-item">
              <strong>Cliente:</strong>
              <span>{clienteNome || 'N/A'}</span>
            </div>
            <div className="dettaglio-item">
              <strong>Commessa:</strong>
              <span>{commessaCodice || 'N/A'}</span>
            </div>
            <div className="dettaglio-item">
              <strong>Tecnico:</strong>
              <span>{tecnicoNome || 'N/A'}</span>
            </div>
            <div className="dettaglio-item">
              <strong>Ore Lavoro:</strong>
              <span>{oreLavoro ? `${oreLavoro.toFixed(1)}h` : '0h'}</span>
            </div>
            <div className="dettaglio-item">
              <strong>Ore Viaggio:</strong>
              <span>{oreViaggio ? `${oreViaggio.toFixed(1)}h` : '0h'}</span>
            </div>
            <div className="dettaglio-item">
              <strong>Ore Totali:</strong>
              <span>{oreTotali ? `${oreTotali.toFixed(1)}h` : '0h'}</span>
            </div>
          </div>

          {/* Lista interventi inclusi */}
          {interventi && interventi.length > 0 && (
            <div className="interventi-list">
              <h3>Interventi ({interventi.length})</h3>
              {interventi.map((intervento, idx) => (
                <div key={intervento.id || idx} className="intervento-item">
                  <div className="intervento-header">
                    <span className="intervento-numero">
                      Foglio: {intervento.numeroFoglio || 'N/A'}
                    </span>
                    <button
                      className="button secondary small"
                      onClick={() => handleNavigateToFoglio(intervento.foglioId)}
                    >
                      Vai al Foglio
                    </button>
                  </div>
                  {intervento.descrizione && (
                    <p className="intervento-descrizione">{intervento.descrizione}</p>
                  )}
                  <div className="intervento-ore">
                    Ore: {intervento.oreLavoro || 0}h (lavoro) + {intervento.oreViaggio || 0}h (viaggio)
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="button secondary" onClick={onClose}>
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
}

ModalDettagliEventoCalendario.propTypes = {
  evento: PropTypes.shape({
    commessaCodice: PropTypes.string,
    tecnicoNome: PropTypes.string,
    clienteNome: PropTypes.string,
    oreLavoro: PropTypes.number,
    oreViaggio: PropTypes.number,
    oreTotali: PropTypes.number,
    interventi: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        numeroFoglio: PropTypes.string,
        foglioId: PropTypes.string,
        descrizione: PropTypes.string,
        oreLavoro: PropTypes.number,
        oreViaggio: PropTypes.number,
      })
    ),
  }),
  onClose: PropTypes.func.isRequired,
};

ModalDettagliEventoCalendario.defaultProps = {
  evento: null,
};

export default ModalDettagliEventoCalendario;
