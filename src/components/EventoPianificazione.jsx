import React from 'react';
import PropTypes from 'prop-types';

/**
 * Componente per rendering personalizzato di un evento pianificato nel calendario
 * Mostra: codice commessa, tecnici assegnati, stato pianificazione
 */
function EventoPianificazione({ event }) {
  const { commessaCodice, tecniciNomi, statoPianificazione, mezzoTarga } = event;

  // Definisci colore bordo in base allo stato
  const getBorderColorByStato = (stato) => {
    switch (stato) {
      case 'Pianificata':
        return '#6c757d'; // Grigio
      case 'Confermata':
        return '#007bff'; // Blu
      case 'In Corso':
        return '#ffc107'; // Giallo/Arancio
      case 'Completata':
        return '#28a745'; // Verde
      case 'Cancellata':
        return '#dc3545'; // Rosso
      default:
        return '#6c757d';
    }
  };

  const borderColor = getBorderColorByStato(statoPianificazione);

  return (
    <div
      className="evento-pianificazione"
      style={{
        padding: '3px 5px',
        overflow: 'hidden',
        borderLeft: `4px solid ${borderColor}`,
      }}
    >
      {/* Codice Commessa */}
      <div style={{
        fontSize: '0.85em',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {commessaCodice || 'N/A'}
      </div>

      {/* Tecnici */}
      <div style={{
        fontSize: '0.75em',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        opacity: 0.9,
      }}>
        {tecniciNomi && tecniciNomi.length > 0 ? tecniciNomi.join(', ') : 'N/A'}
      </div>

      {/* Mezzo (se presente) */}
      {mezzoTarga && (
        <div style={{
          fontSize: '0.7em',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          opacity: 0.8,
        }}>
          🚗 {mezzoTarga}
        </div>
      )}

      {/* Stato (badge piccolo) */}
      <div style={{
        fontSize: '0.65em',
        marginTop: '2px',
        opacity: 0.7,
      }}>
        {statoPianificazione}
      </div>
    </div>
  );
}

EventoPianificazione.propTypes = {
  event: PropTypes.shape({
    commessaCodice: PropTypes.string,
    tecniciNomi: PropTypes.arrayOf(PropTypes.string),
    statoPianificazione: PropTypes.string,
    mezzoTarga: PropTypes.string,
  }).isRequired,
};

export default EventoPianificazione;
