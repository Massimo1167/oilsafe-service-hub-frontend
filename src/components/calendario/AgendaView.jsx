import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { formatNumeroFoglio } from '../../utils/formatters';

/**
 * Vista Agenda: lista di eventi raggruppati per giorno → commessa → orario → tecnici
 * Ottimizzata per dispositivi mobili e lettura rapida
 */
const AgendaView = ({ events, date, onSelectEvent, getEventColor }) => {
    // Calcola l'intervallo settimanale
    const weekStart = useMemo(() => startOfWeek(date, { locale: it }), [date]);
    const weekEnd = useMemo(() => endOfWeek(date, { locale: it }), [date]);
    const days = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

    // Raggruppa eventi per giorno → commessa → orario
    const eventiRaggruppati = useMemo(() => {
        const grouped = {};

        // Inizializza struttura per ogni giorno della settimana
        days.forEach(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            grouped[dayKey] = {
                day,
                commesse: {} // { commessaId: { info, slots: {} } }
            };
        });

        // Raggruppa eventi per giorno → commessa → orario
        events.forEach(event => {
            // Trova i giorni che intersecano questo evento
            const eventDays = days.filter(day => {
                const dayStart = startOfDay(day);
                const dayEnd = endOfDay(day);
                return (event.start <= dayEnd && event.end >= dayStart);
            });

            eventDays.forEach(day => {
                const dayKey = format(day, 'yyyy-MM-dd');
                const commessaId = event.resource?.commessa_id || 'no-commessa';
                const commessaCodice = event.resource?.commessa_codice || 'N/A';
                const commessaDescrizione = event.resource?.commessa_descrizione || '';

                // Usa ID pianificazione come chiave per evitare aggregazione errata
                const pianificazioneId = event.resource?.id || event.id || `unknown-${Math.random()}`;
                const slotKey = pianificazioneId;

                // Inizializza commessa se non esiste
                if (!grouped[dayKey].commesse[commessaId]) {
                    grouped[dayKey].commesse[commessaId] = {
                        id: commessaId,
                        codice: commessaCodice,
                        descrizione: commessaDescrizione,
                        slots: {} // { slotKey: { orarioInizio, orarioFine, tecnici: [], foglio, ... } }
                    };
                }

                // Inizializza slot se non esiste (ogni pianificazione ha il suo slot)
                if (!grouped[dayKey].commesse[commessaId].slots[slotKey]) {
                    grouped[dayKey].commesse[commessaId].slots[slotKey] = {
                        orarioInizio: format(event.start, 'HH:mm'),
                        orarioFine: format(event.end, 'HH:mm'),
                        tecnici: event.resource?.tecnico_nome || 'N/A',  // Stringa diretta, non array
                        foglioId: event.resource?.foglio_id,
                        numeroFoglio: event.resource?.numero_foglio,
                        statoPianificazione: event.resource?.stato_pianificazione || 'Pianificata',
                        clienteNome: event.resource?.cliente_nome,
                        pianificazioneId: pianificazioneId,
                        originalEvent: event  // CRITICO: Riferimento all'evento completo
                    };
                }

                // Non serve più aggregare tecnici: ogni pianificazione ha il suo slot univoco
            });
        });

        return grouped;
    }, [events, days]);

    // Filtra solo i giorni con pianificazioni
    const daysWithEvents = useMemo(() => {
        return days.filter(day => {
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayData = eventiRaggruppati[dayKey];
            const commesseArray = Object.values(dayData.commesse);
            const totalSlots = commesseArray.reduce((sum, c) => sum + Object.keys(c.slots).length, 0);
            return totalSlots > 0;
        });
    }, [days, eventiRaggruppati]);

    return (
        <div className="agenda-view">
            {daysWithEvents.length === 0 ? (
                <div className="agenda-no-events" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
                    Nessuna pianificazione programmata per questa settimana
                </div>
            ) : (
                daysWithEvents.map(day => {
                    const dayKey = format(day, 'yyyy-MM-dd');
                    const dayData = eventiRaggruppati[dayKey];
                    const commesseArray = Object.values(dayData.commesse);
                    const totalSlots = commesseArray.reduce((sum, c) => sum + Object.keys(c.slots).length, 0);

                    return (
                        <div key={dayKey} className="agenda-day">
                        {/* Header giorno */}
                        <div className="agenda-day-header">
                            <div>
                                <div className="agenda-day-name">{format(day, 'EEEE', { locale: it })}</div>
                                <div className="agenda-day-date">{format(day, 'd MMMM yyyy', { locale: it })}</div>
                            </div>
                            <div className="agenda-day-count">
                                {totalSlots > 0 ? `${totalSlots} pianificazioni` : 'Nessuna pianificazione'}
                            </div>
                        </div>

                        {/* Contenuto giorno */}
                        <div className="agenda-day-events">
                            {commesseArray.length === 0 ? (
                                <div className="agenda-no-events">Nessuna pianificazione per questo giorno</div>
                            ) : (
                                commesseArray.map(commessa => {
                                    const slotsArray = Object.values(commessa.slots);

                                    return (
                                        <div key={commessa.id} className="agenda-commessa-group">
                                            {/* Header Commessa */}
                                            <div className="agenda-commessa-header">
                                                <span className="agenda-commessa-icon">📁</span>
                                                <span className="agenda-commessa-codice">{commessa.codice}</span>
                                                {commessa.descrizione && (
                                                    <span className="agenda-commessa-desc">- {commessa.descrizione}</span>
                                                )}
                                            </div>

                                            {/* Slots orari per questa commessa */}
                                            <div className="agenda-commessa-slots">
                                                {slotsArray.map((slot, idx) => {
                                                    const slotKey = `${commessa.id}-${slot.orarioInizio}-${slot.orarioFine}-${idx}`;
                                                    const colorCommessa = getEventColor ?
                                                        getEventColor({ resource: { commessa_id: commessa.id } }) :
                                                        '#6c757d';

                                                    return (
                                                        <div
                                                            key={slotKey}
                                                            className="agenda-event"
                                                            onClick={() => onSelectEvent && slot.originalEvent && onSelectEvent(slot.originalEvent)}
                                                        >
                                                            {/* Barra colorata laterale */}
                                                            <div
                                                                className="agenda-event-color-bar"
                                                                style={{ backgroundColor: colorCommessa }}
                                                            />

                                                            <div className="agenda-event-content">
                                                                {/* Orario */}
                                                                <div className="agenda-event-time">
                                                                    ⏰ {slot.orarioInizio} - {slot.orarioFine}
                                                                </div>

                                                                {/* Foglio (informazione secondaria) */}
                                                                {slot.numeroFoglio && (
                                                                    <div className="agenda-event-foglio">
                                                                        📄 Foglio #{formatNumeroFoglio(slot.numeroFoglio)}
                                                                    </div>
                                                                )}

                                                                {/* Tecnici */}
                                                                <div className="agenda-event-tecnici">
                                                                    👥 {slot.tecnici}
                                                                </div>

                                                                {/* Stato e Cliente */}
                                                                <div className="agenda-event-meta">
                                                                    <span className="agenda-event-stato">{slot.statoPianificazione}</span>
                                                                    {slot.clienteNome && (
                                                                        <span className="agenda-event-cliente"> • {slot.clienteNome}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                );
            })
            )}
        </div>
    );
};

AgendaView.propTypes = {
    events: PropTypes.array.isRequired,
    date: PropTypes.instanceOf(Date).isRequired,
    onSelectEvent: PropTypes.func,
    getEventColor: PropTypes.func,
};

export default AgendaView;
