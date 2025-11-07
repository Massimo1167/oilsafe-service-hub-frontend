import React from 'react';
import PropTypes from 'prop-types';

/**
 * Componente per rendering personalizzato di un evento nel calendario
 * Mostra: codice commessa, nome tecnico, ore totali
 */
function EventoCalendario({ event }) {
  const { commessaCodice, tecnicoNome, oreTotali } = event;

  return (
    <div className="evento-calendario" style={{ padding: '2px 4px', overflow: 'hidden' }}>
      <div style={{
        fontSize: '0.85em',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {commessaCodice || 'N/A'}
      </div>
      <div style={{
        fontSize: '0.75em',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
      }}>
        {tecnicoNome || 'N/A'}
      </div>
      <div style={{
        fontSize: '0.7em',
        fontWeight: '500'
      }}>
        {oreTotali ? `${oreTotali.toFixed(1)}h` : '0h'}
      </div>
    </div>
  );
}

EventoCalendario.propTypes = {
  event: PropTypes.shape({
    title: PropTypes.string,
    commessaCodice: PropTypes.string,
    tecnicoNome: PropTypes.string,
    oreTotali: PropTypes.number,
  }).isRequired,
};

export default EventoCalendario;
