/**
 * Utility functions for formatting data
 */

/**
 * Abbrevia il numero di foglio rimuovendo gli zeri iniziali
 * Esempio: "FLE_00000038" → "FLE_38"
 *
 * @param {string} numeroFoglio - Il numero foglio completo
 * @returns {string} Il numero foglio abbreviato
 */
export function formatNumeroFoglio(numeroFoglio) {
  if (!numeroFoglio) return 'N/D';

  // Se il formato è PREFIX_NUMBERS (es. FLE_00000038)
  const match = numeroFoglio.match(/^([A-Z]+)_(\d+)$/);
  if (match) {
    const [, prefix, digits] = match;
    // Rimuovi zeri iniziali convertendo a numero e tornando a stringa
    const numeroAbbreviato = parseInt(digits, 10).toString();
    return `${prefix}_${numeroAbbreviato}`;
  }

  // Se non corrisponde al pattern, restituisci il numero originale
  return numeroFoglio;
}
