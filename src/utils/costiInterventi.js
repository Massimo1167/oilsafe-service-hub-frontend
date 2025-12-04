/**
 * Utility functions for calculating intervention costs based on job roles
 * Used to determine hourly rates based on tipo_orario and ubicazione
 */

/**
 * Get the appropriate hourly cost from a mansione object
 * based on tipo_orario and ubicazione
 *
 * @param {Object} mansione - The mansione object from database with all cost fields
 * @param {string} tipoOrario - Type of hours: 'normale', 'straordinario', 'festivo', 'straordinario_festivo'
 * @param {string} ubicazione - Location: 'oilsafe', 'cliente', 'teleassistenza'
 * @returns {number} The applicable hourly cost in euros
 */
export const getCostoOrarioFromMansione = (mansione, tipoOrario, ubicazione) => {
  if (!mansione) return 0;

  // Map tipo_orario and ubicazione to the correct cost field
  const costFieldMap = {
    'normale': {
      'oilsafe': 'costo_orario_oilsafe',
      'cliente': 'costo_orario_cliente',
      'teleassistenza': 'costo_orario_teleassistenza',
      // Retrocompatibilità
      'sede': 'costo_orario_oilsafe',
      'trasferta': 'costo_orario_cliente'
    },
    'straordinario': {
      'oilsafe': 'costo_straordinario_oilsafe',
      'cliente': 'costo_straordinario_cliente',
      'teleassistenza': 'costo_straordinario_teleassistenza',
      // Retrocompatibilità
      'sede': 'costo_straordinario_oilsafe',
      'trasferta': 'costo_straordinario_cliente'
    },
    'festivo': {
      'oilsafe': 'costo_festivo_oilsafe',
      'cliente': 'costo_festivo_cliente',
      'teleassistenza': 'costo_festivo_teleassistenza',
      // Retrocompatibilità
      'sede': 'costo_festivo_oilsafe',
      'trasferta': 'costo_festivo_cliente'
    },
    'straordinario_festivo': {
      'oilsafe': 'costo_straordinario_festivo_oilsafe',
      'cliente': 'costo_straordinario_festivo_cliente',
      'teleassistenza': 'costo_straordinario_festivo_teleassistenza',
      // Retrocompatibilità
      'sede': 'costo_straordinario_festivo_oilsafe',
      'trasferta': 'costo_straordinario_festivo_cliente'
    }
  };

  const fieldName = costFieldMap[tipoOrario]?.[ubicazione];
  if (!fieldName) {
    console.warn(`Invalid tipo_orario (${tipoOrario}) or ubicazione (${ubicazione})`);
    return 0;
  }

  return parseFloat(mansione[fieldName]) || 0;
};

/**
 * Calculate total cost for an intervention
 *
 * @param {number} oreLavorate - Hours worked (decimal, e.g., 2.5 for 2h 30m)
 * @param {number} costoOrario - Hourly rate in euros
 * @returns {number} Total cost (oreLavorate × costoOrario)
 */
export const calcolaCostoTotale = (oreLavorate, costoOrario) => {
  const ore = parseFloat(oreLavorate) || 0;
  const costo = parseFloat(costoOrario) || 0;
  return ore * costo;
};

/**
 * Map tipo_intervento to ubicazione for cost calculation
 * Handles both new and legacy values for retrocompatibility
 *
 * @param {string} tipoIntervento - The intervention type ('Sede Cliente', 'Sede Oilsafe', 'Teleassistenza', 'In Loco', 'Remoto')
 * @returns {string} The ubicazione key for cost field mapping ('oilsafe', 'cliente', 'teleassistenza')
 */
export const getUbicazioneFromTipoIntervento = (tipoIntervento) => {
  const mapping = {
    'Sede Cliente': 'cliente',
    'Sede Oilsafe': 'oilsafe',
    'Teleassistenza': 'teleassistenza',
    // Retrocompatibilità per valori storici
    'In Loco': 'cliente',
    'In loco': 'cliente',
    'Remoto': 'oilsafe'
  };
  return mapping[tipoIntervento] || 'oilsafe';
};

/**
 * Format cost for display (with 2 decimal places and euro symbol)
 *
 * @param {number} cost - Cost in euros
 * @returns {string} Formatted cost string (e.g., "€ 125.50")
 */
export const formatCosto = (cost) => {
  const costValue = parseFloat(cost) || 0;
  return `€ ${costValue.toFixed(2)}`;
};

/**
 * Get label for tipo_orario in Italian
 *
 * @param {string} tipoOrario - Type of hours
 * @returns {string} Italian label
 */
export const getTipoOrarioLabel = (tipoOrario) => {
  const labels = {
    'normale': 'Normale',
    'straordinario': 'Straordinario',
    'festivo': 'Festivo',
    'straordinario_festivo': 'Straordinario Festivo'
  };
  return labels[tipoOrario] || tipoOrario;
};

/**
 * Get label for ubicazione in Italian
 *
 * @param {string} ubicazione - Location
 * @returns {string} Italian label
 */
export const getUbicazioneLabel = (ubicazione) => {
  const labels = {
    'oilsafe': 'Sede Oilsafe',
    'cliente': 'Sede Cliente',
    'teleassistenza': 'Teleassistenza',
    // Retrocompatibilità per valori storici
    'sede': 'Sede Oilsafe',
    'trasferta': 'Sede Cliente'
  };
  return labels[ubicazione] || ubicazione;
};

/**
 * Convert hours in decimal format to hours:minutes format
 *
 * @param {number} decimalHours - Hours in decimal (e.g., 2.5)
 * @returns {string} Formatted string (e.g., "2h 30m")
 */
export const formatOreDecimaliToOreMinuti = (decimalHours) => {
  const ore = parseFloat(decimalHours) || 0;
  const hours = Math.floor(ore);
  const minutes = Math.round((ore - hours) * 60);

  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
};

/**
 * Convert hours:minutes string to decimal hours
 *
 * @param {number} hours - Whole hours
 * @param {number} minutes - Minutes (0-59)
 * @returns {number} Decimal hours (e.g., 2.5 for 2h 30m)
 */
export const convertOreMinutiToDecimale = (hours, minutes) => {
  const h = parseInt(hours) || 0;
  const m = parseInt(minutes) || 0;
  return h + (m / 60);
};

/**
 * Validate that cost fields are >= 0
 *
 * @param {number} value - Value to validate
 * @returns {boolean} True if valid
 */
export const isValidCost = (value) => {
  const cost = parseFloat(value);
  return !isNaN(cost) && cost >= 0;
};

/**
 * Get all available tipo_orario options for select dropdown
 *
 * @returns {Array} Array of {value, label} objects
 */
export const getTipoOrarioOptions = () => {
  return [
    { value: 'normale', label: 'Normale' },
    { value: 'straordinario', label: 'Straordinario' },
    { value: 'festivo', label: 'Festivo' },
    { value: 'straordinario_festivo', label: 'Straordinario Festivo' }
  ];
};

/**
 * Get all available ubicazione options for select dropdown
 *
 * @returns {Array} Array of {value, label} objects
 */
export const getUbicazioneOptions = () => {
  return [
    { value: 'oilsafe', label: 'Sede Oilsafe' },
    { value: 'cliente', label: 'Sede Cliente' },
    { value: 'teleassistenza', label: 'Teleassistenza' }
  ];
};
