import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Vista Agenda: lista di eventi raggruppati per giorno
 * Ottimizzata per dispositivi mobili e lettura rapida
 */
const AgendaView = ({ events, date, onSelectEvent, getEventColor }) => {
    // Calcola l'intervallo settimanale
    const weekStart = useMemo(() => startOfWeek(date, { locale: it }), [date]);
    const weekEnd = useMemo(() => endOfWeek(date, { locale: it }), [date]);
    const days = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

    // Raggruppa eventi per giorno
    const eventiPerGiorno = useMemo(() => {
        const grouped = {};

        days.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            grouped[dayKey] = {
                day,
                events: []
            };
        });

        events.forEach(event => {
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
                    grouped[dayKey].events.push(event);
                }
            });
        });

        return grouped;
    }, [events, days]);

    return (
        <div className="agenda-view">
            {days.map(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const dayData = eventiPerGiorno[dayKey];
                const dayEvents = dayData?.events || [];

                return (
                    <div key={dayKey} className="agenda-day">
                        <div className="agenda-day-header">
                            <div className="agenda-day-name">
                                {format(day, 'EEEE', { locale: it })}
                            </div>
                            <div className="agenda-day-date">
                                {format(day, 'dd MMMM yyyy', { locale: it })}
                            </div>
                            <div className="agenda-day-count">
                                {dayEvents.length} {dayEvents.length === 1 ? 'pianificazione' : 'pianificazioni'}
                            </div>
                        </div>

                        <div className="agenda-day-events">
                            {dayEvents.length === 0 ? (
                                <div className="agenda-no-events">
                                    Nessuna pianificazione
                                </div>
                            ) : (
                                dayEvents.map((event, idx) => {
                                    const backgroundColor = getEventColor(event);
                                    const tecnicoNome = event.resource?.tecnico_nome || 'N/D';
                                    const numeroFoglio = event.resource?.numero_foglio || 'N/D';
                                    const commessa = event.resource?.commessa_descrizione || event.resource?.commessa_codice || 'Nessuna commessa';
                                    const cliente = event.resource?.cliente_nome || 'N/D';

                                    return (
                                        <div
                                            key={idx}
                                            className="agenda-event"
                                            onClick={() => onSelectEvent && onSelectEvent(event)}
                                        >
                                            <div
                                                className="agenda-event-color-bar"
                                                style={{ backgroundColor }}
                                            />
                                            <div className="agenda-event-content">
                                                <div className="agenda-event-header">
                                                    <div className="agenda-event-foglio">
                                                        <strong>Foglio #{numeroFoglio}</strong>
                                                    </div>
                                                    <div className="agenda-event-time">
                                                        {format(event.start, 'HH:mm', { locale: it })} - {format(event.end, 'HH:mm', { locale: it })}
                                                    </div>
                                                </div>
                                                <div className="agenda-event-details">
                                                    <div className="agenda-event-row">
                                                        <span className="agenda-event-label">Tecnico:</span>
                                                        <span className="agenda-event-value">{tecnicoNome}</span>
                                                    </div>
                                                    <div className="agenda-event-row">
                                                        <span className="agenda-event-label">Commessa:</span>
                                                        <span className="agenda-event-value">{commessa}</span>
                                                    </div>
                                                    <div className="agenda-event-row">
                                                        <span className="agenda-event-label">Cliente:</span>
                                                        <span className="agenda-event-value">{cliente}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

AgendaView.propTypes = {
    events: PropTypes.array.isRequired,
    date: PropTypes.instanceOf(Date).isRequired,
    onSelectEvent: PropTypes.func,
    getEventColor: PropTypes.func.isRequired,
};

export default AgendaView;
