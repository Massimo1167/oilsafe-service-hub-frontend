/**
 * Utility per gestione colori nel calendario
 * - Genera colori deterministici per commesse (basati su hash ID)
 * - Genera stili bordo per differenziare tecnici
 */

/**
 * Semplice hash function per generare un numero da una stringa
 * @param {string} str - Stringa da hashare (es. UUID commessa)
 * @returns {number} Hash numerico
 */
function hashString(str) {
  if (!str) return 0;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Genera un colore HSL deterministico da un ID commessa
 * @param {string} commessaId - UUID della commessa
 * @returns {string} Colore in formato "hsl(h, s%, l%)"
 */
export function getColorForCommessa(commessaId) {
  if (!commessaId) {
    return 'hsl(0, 0%, 80%)'; // Grigio per commesse senza ID
  }

  const hash = hashString(commessaId);

  // Hue: 0-360, distribuiamo uniformemente
  const hue = hash % 360;

  // Saturazione: 60-80% per colori vivaci ma non troppo
  const saturation = 60 + (hash % 20);

  // Luminosità: 45-65% per buona leggibilità del testo
  const lightness = 45 + (hash % 20);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Genera uno stile bordo deterministico da un ID tecnico
 * Usa combinazioni di stile bordo e spessore per differenziare tecnici
 * @param {string} tecnicoId - UUID del tecnico
 * @returns {object} Oggetto con proprietà borderStyle e borderWidth
 */
export function getBorderStyleForTecnico(tecnicoId) {
  if (!tecnicoId) {
    return { borderStyle: 'solid', borderWidth: '2px' };
  }

  const hash = hashString(tecnicoId);

  // Stili disponibili: solid, dashed, dotted, double
  const styles = ['solid', 'dashed', 'dotted', 'double'];
  const borderStyle = styles[hash % styles.length];

  // Spessori: 2px, 3px, 4px
  const widths = ['2px', '3px', '4px'];
  const borderWidth = widths[(hash >> 2) % widths.length];

  return { borderStyle, borderWidth };
}

/**
 * Genera uno stile completo per un evento del calendario
 * combina colore commessa e bordo tecnico
 * @param {string} commessaId - UUID della commessa
 * @param {string} tecnicoId - UUID del tecnico
 * @returns {object} Oggetto stile React (backgroundColor, border, borderColor)
 */
export function getEventStyle(commessaId, tecnicoId) {
  const backgroundColor = getColorForCommessa(commessaId);
  const { borderStyle, borderWidth } = getBorderStyleForTecnico(tecnicoId);

  return {
    backgroundColor,
    border: `${borderWidth} ${borderStyle} rgba(0, 0, 0, 0.4)`,
    borderRadius: '4px',
    color: '#ffffff',
    fontWeight: '500',
  };
}
