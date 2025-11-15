import React from 'react';
import PropTypes from 'prop-types';

/**
 * Toolbar personalizzata per calendario con:
 * - Navigazione (Oggi, Indietro, Avanti)
 * - Selettore vista (Mese, Settimana, Agenda, Timeline)
 * - Toggle modalità colore (per Tecnico / per Commessa)
 * - Filtro tecnico (per operatori che vedono tutti i tecnici)
 */
const CalendarioToolbar = ({
    view,
    views,
    onNavigate,
    onView,
    colorMode,
    onColorModeChange,
    showColorModeToggle,
    tecnicoFilter,
    onTecnicoFilterChange,
    tecnici,
    showTecnicoFilter,
    label
}) => {
    const viewLabels = {
        month: 'Mese',
        week: 'Settimana',
        agenda: 'Agenda',
        timeline: 'Timeline'
    };

    return (
        <div className="calendario-toolbar">
            {/* Riga 1: Navigazione e Data */}
            <div className="calendario-toolbar-row">
                <div className="calendario-nav">
                    <button
                        className="button secondary small"
                        onClick={() => onNavigate('TODAY')}
                    >
                        Oggi
                    </button>
                    <button
                        className="button secondary small"
                        onClick={() => onNavigate('PREV')}
                    >
                        ◀
                    </button>
                    <button
                        className="button secondary small"
                        onClick={() => onNavigate('NEXT')}
                    >
                        ▶
                    </button>
                </div>

                <div className="calendario-label">
                    <h2>{label}</h2>
                </div>

                <div className="calendario-spacer" />
            </div>

            {/* Riga 2: Viste e Filtri */}
            <div className="calendario-toolbar-row">
                {/* Selettore Vista */}
                <div className="calendario-views">
                    {views && views.map(v => (
                        <button
                            key={v}
                            className={`button small ${view === v ? 'primary' : 'secondary'}`}
                            onClick={() => onView(v)}
                        >
                            {viewLabels[v] || v}
                        </button>
                    ))}
                </div>

                {/* Toggle Modalità Colore */}
                {showColorModeToggle && (
                    <div className="calendario-color-mode">
                        <label style={{ marginRight: '10px', fontWeight: '600' }}>
                            Colori per:
                        </label>
                        <button
                            className={`button small ${colorMode === 'tecnico' ? 'primary' : 'secondary'}`}
                            onClick={() => onColorModeChange('tecnico')}
                        >
                            Tecnico
                        </button>
                        <button
                            className={`button small ${colorMode === 'commessa' ? 'primary' : 'secondary'}`}
                            onClick={() => onColorModeChange('commessa')}
                            style={{ marginLeft: '5px' }}
                        >
                            Commessa
                        </button>
                    </div>
                )}

                {/* Filtro Tecnico (per admin/manager) */}
                {showTecnicoFilter && tecnici && tecnici.length > 0 && (
                    <div className="calendario-tecnico-filter">
                        <label style={{ marginRight: '10px', fontWeight: '600' }}>
                            Tecnico:
                        </label>
                        <select
                            value={tecnicoFilter || ''}
                            onChange={(e) => onTecnicoFilterChange(e.target.value || null)}
                            className="form-control"
                            style={{ width: '200px' }}
                        >
                            <option value="">Tutti i tecnici</option>
                            {tecnici.map(t => (
                                <option key={t.id} value={t.id}>
                                    {t.nome} {t.cognome}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );
};

CalendarioToolbar.propTypes = {
    view: PropTypes.string,
    views: PropTypes.array,
    onNavigate: PropTypes.func.isRequired,
    onView: PropTypes.func.isRequired,
    colorMode: PropTypes.oneOf(['tecnico', 'commessa']),
    onColorModeChange: PropTypes.func,
    showColorModeToggle: PropTypes.bool,
    tecnicoFilter: PropTypes.string,
    onTecnicoFilterChange: PropTypes.func,
    tecnici: PropTypes.array,
    showTecnicoFilter: PropTypes.bool,
    label: PropTypes.string,
};

CalendarioToolbar.defaultProps = {
    showColorModeToggle: true,
    showTecnicoFilter: false,
    colorMode: 'commessa',
};

export default CalendarioToolbar;
