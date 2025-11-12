import React from 'react';
import PropTypes from 'prop-types';
import { parseFormattedText } from '../../utils/textFormatter';

/**
 * Componente per visualizzare testo con formattazione markdown
 * Supporta: **grassetto**, *corsivo*, ***grassetto corsivo***
 * Preserva gli a capo (newline)
 */
const FormattedText = ({ text, className }) => {
  if (!text || text.trim() === '') {
    return <div className={className}>-</div>;
  }

  // Dividi il testo per newline per preservare gli a capo
  const lines = text.split('\n');

  return (
    <div className={className} style={{ whiteSpace: 'pre-wrap' }}>
      {lines.map((line, lineIndex) => (
        <React.Fragment key={lineIndex}>
          {lineIndex > 0 && <br />}
          {line.trim() === '' ? (
            // Riga vuota - aggiungi uno spazio per preservare l'a capo
            '\u00A0'
          ) : (
            // Processa la formattazione markdown
            parseFormattedText(line).map((segment, segmentIndex) => {
              const { text: segmentText, style } = segment;

              // Mappa lo style alle proprietà CSS corrette
              const fontWeight = (style === 'bold' || style === 'bolditalic') ? 'bold' : 'normal';
              const fontStyle = (style === 'italic' || style === 'bolditalic') ? 'italic' : 'normal';

              return (
                <span key={segmentIndex} style={{ fontWeight, fontStyle }}>
                  {segmentText}
                </span>
              );
            })
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

FormattedText.propTypes = {
  text: PropTypes.string,
  className: PropTypes.string,
};

export default FormattedText;
