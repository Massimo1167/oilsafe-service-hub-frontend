import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Vista Timeline: griglia con una riga per tecnico e colonne per giorni
 * Mostra le pianificazioni in formato compatto per avere una visione d'insieme
 */
const TimelineView = ({ events, date, tecnici, onSelectEvent, getEventColor }) => {
    // Calcola l'intervallo settimanale
    const weekStart = useMemo(() => startOfWeek(date, { locale: it }), [date]);
    const weekEnd = useMemo(() => endOfWeek(date, { locale: it }), [date]);
    const days = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

    // Raggruppa eventi per tecnico e giorno
    const eventiPerTecnico = useMemo(() => {
        const grouped = {};

        // Inizializza struttura per ogni tecnico
        tecnici.forEach(tecnico => {
            grouped[tecnico.id] = {
                tecnico,
                giorniEventi: {}
            };

            // Inizializza array vuoto per ogni giorno
            days.forEach(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                grouped[tecnico.id].giorniEventi[dayKey] = [];
            });
        });

        // Distribuisci eventi
        events.forEach(event => {
            const tecnicoId = event.resource?.tecnico_id;
            if (!tecnicoId || !grouped[tecnicoId]) return;

            // Trova tutti i giorni coperti da questo evento
            const eventStart = event.start;
            const eventEnd = event.end;

            days.forEach(day => {
                const dayStart = new Date(day);
                dayStart.setHours(0, 0, 0, 0);
                const dayEnd = new Date(day);
                dayEnd.setHours(23, 59, 59, 999);

                // Se l'evento interseca questo giorno
                if (isWithinInterval(eventStart, { start: dayStart, end: dayEnd }) ||
                    isWithinInterval(eventEnd, { start: dayStart, end: dayEnd }) ||
                    (eventStart <= dayStart && eventEnd >= dayEnd)) {

                    const dayKey = format(day, 'yyyy-MM-dd');
                    grouped[tecnicoId].giorniEventi[dayKey].push(event);
                }
            });
        });

        return grouped;
    }, [events, tecnici, days]);

    return (
        <div className="timeline-view">
            <div className="timeline-header">
                <div className="timeline-header-cell timeline-tecnico-column">
                    Tecnico
                </div>
                {days.map(day => (
                    <div key={format(day, 'yyyy-MM-dd')} className="timeline-header-cell">
                        <div className="timeline-day-name">
                            {format(day, 'EEE', { locale: it })}
                        </div>
                        <div className="timeline-day-date">
                            {format(day, 'dd/MM', { locale: it })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="timeline-body">
                {tecnici.map(tecnico => {
                    const tecnicoData = eventiPerTecnico[tecnico.id];
                    if (!tecnicoData) return null;

                    return (
                        <div key={tecnico.id} className="timeline-row">
                            <div className="timeline-cell timeline-tecnico-column">
                                <strong>{tecnico.nome} {tecnico.cognome}</strong>
                            </div>
                            {days.map(day => {
                                const dayKey = format(day, 'yyyy-MM-dd');
                                const dayEvents = tecnicoData.giorniEventi[dayKey] || [];

                                return (
                                    <div key={dayKey} className="timeline-cell timeline-day-cell">
                                        {dayEvents.map((event, idx) => {
                                            const backgroundColor = getEventColor(event);

                                            return (
                                                <div
                                                    key={idx}
                                                    className="timeline-event"
                                                    style={{ backgroundColor }}
                                                    onClick={() => onSelectEvent && onSelectEvent(event)}
                                                    title={`${event.resource?.numero_foglio || 'N/D'} - ${event.resource?.commessa_descrizione || event.resource?.commessa_codice || 'Nessuna commessa'}`}
                                                >
                                                    <div className="timeline-event-foglio">
                                                        #{event.resource?.numero_foglio || 'N/D'}
                                                    </div>
                                                    <div className="timeline-event-commessa">
                                                        {event.resource?.commessa_codice || 'N/A'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

TimelineView.propTypes = {
    events: PropTypes.array.isRequired,
    date: PropTypes.instanceOf(Date).isRequired,
    tecnici: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        nome: PropTypes.string.isRequired,
        cognome: PropTypes.string.isRequired,
    })).isRequired,
    onSelectEvent: PropTypes.func,
    getEventColor: PropTypes.func.isRequired,
};

export default TimelineView;
