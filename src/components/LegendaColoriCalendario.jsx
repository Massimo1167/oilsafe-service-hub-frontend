import React from 'react';
import PropTypes from 'prop-types';
import { getColorForCommessa, getBorderStyleForTecnico } from '../utils/calendarioColors';
import './LegendaColoriCalendario.css';

/**
 * Componente Leggenda per il calendario
 * Mostra mappatura colori → commesse e pattern bordi → tecnici
 */
function LegendaColoriCalendario({ commesse, tecnici }) {
  return (
    <div className="leggenda-calendario">
      <h3>Leggenda</h3>

      {/* Sezione Commesse */}
      {commesse && commesse.length > 0 && (
        <div className="leggenda-sezione">
          <h4>Commesse (Colori)</h4>
          <div className="leggenda-items">
            {commesse.map((commessa) => {
              const color = getColorForCommessa(commessa.id);
              return (
                <div key={commessa.id} className="leggenda-item">
                  <div
                    className="leggenda-color-box"
                    style={{ backgroundColor: color }}
                  />
                  <span className="leggenda-label">
                    {commessa.codice_commessa || 'N/A'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sezione Tecnici */}
      {tecnici && tecnici.length > 0 && (
        <div className="leggenda-sezione">
          <h4>Tecnici (Bordi)</h4>
          <div className="leggenda-items">
            {tecnici.map((tecnico) => {
              const { borderStyle, borderWidth } = getBorderStyleForTecnico(tecnico.id);
              return (
                <div key={tecnico.id} className="leggenda-item">
                  <div
                    className="leggenda-border-box"
                    style={{
                      border: `${borderWidth} ${borderStyle} #333`,
                      backgroundColor: '#f0f0f0'
                    }}
                  />
                  <span className="leggenda-label">
                    {tecnico.nome} {tecnico.cognome}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

LegendaColoriCalendario.propTypes = {
  commesse: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      codice_commessa: PropTypes.string,
    })
  ),
  tecnici: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      nome: PropTypes.string,
      cognome: PropTypes.string,
    })
  ),
};

LegendaColoriCalendario.defaultProps = {
  commesse: [],
  tecnici: [],
};

export default LegendaColoriCalendario;
