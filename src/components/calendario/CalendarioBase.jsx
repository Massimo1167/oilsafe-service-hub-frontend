import React from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import PropTypes from 'prop-types';

const locales = {
    'it': it
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

/**
 * Componente base per calendario condiviso
 * Fornisce configurazione comune per tutti i calendari dell'app
 */
const CalendarioBase = ({
    events,
    onSelectEvent,
    onSelectSlot,
    components,
    eventPropGetter,
    views,
    defaultView,
    toolbar,
    formats,
    messages,
    style,
    className,
    date,
    onNavigate,
    view,
    onView
}) => {
    // Messaggi italiani di default
    const defaultMessages = {
        date: 'Data',
        time: 'Ora',
        event: 'Evento',
        allDay: 'Tutto il giorno',
        week: 'Settimana',
        work_week: 'Settimana lavorativa',
        day: 'Giorno',
        month: 'Mese',
        previous: 'Precedente',
        next: 'Successivo',
        yesterday: 'Ieri',
        tomorrow: 'Domani',
        today: 'Oggi',
        agenda: 'Agenda',
        noEventsInRange: 'Nessun evento in questo periodo.',
        showMore: total => `+${total} altri`,
    };

    // Formati italiani di default
    const defaultFormats = {
        dateFormat: 'dd',
        dayFormat: 'EEEE dd/MM',
        weekdayFormat: 'EEEE',
        monthHeaderFormat: 'MMMM yyyy',
        dayHeaderFormat: 'EEEE dd MMMM yyyy',
        dayRangeHeaderFormat: ({ start, end }) =>
            `${format(start, 'dd/MM/yyyy', { locale: it })} - ${format(end, 'dd/MM/yyyy', { locale: it })}`,
        agendaHeaderFormat: ({ start, end }) =>
            `${format(start, 'dd/MM/yyyy', { locale: it })} - ${format(end, 'dd/MM/yyyy', { locale: it })}`,
        agendaDateFormat: 'EEEE dd/MM',
        agendaTimeFormat: 'HH:mm',
        agendaTimeRangeFormat: ({ start, end }) =>
            `${format(start, 'HH:mm', { locale: it })} - ${format(end, 'HH:mm', { locale: it })}`,
    };

    return (
        <Calendar
            localizer={localizer}
            events={events}
            onSelectEvent={onSelectEvent}
            onSelectSlot={onSelectSlot}
            selectable
            culture="it"
            messages={{ ...defaultMessages, ...messages }}
            formats={{ ...defaultFormats, ...formats }}
            components={components}
            eventPropGetter={eventPropGetter}
            views={views}
            defaultView={defaultView || 'month'}
            view={view}
            onView={onView}
            date={date}
            onNavigate={onNavigate}
            toolbar={toolbar !== undefined ? toolbar : true}
            style={{ height: 600, ...style }}
            className={className}
        />
    );
};

CalendarioBase.propTypes = {
    events: PropTypes.arrayOf(PropTypes.shape({
        title: PropTypes.string.isRequired,
        start: PropTypes.instanceOf(Date).isRequired,
        end: PropTypes.instanceOf(Date).isRequired,
        resource: PropTypes.object,
    })).isRequired,
    onSelectEvent: PropTypes.func,
    onSelectSlot: PropTypes.func,
    components: PropTypes.object,
    eventPropGetter: PropTypes.func,
    views: PropTypes.array,
    defaultView: PropTypes.string,
    view: PropTypes.string,
    onView: PropTypes.func,
    date: PropTypes.instanceOf(Date),
    onNavigate: PropTypes.func,
    toolbar: PropTypes.bool,
    formats: PropTypes.object,
    messages: PropTypes.object,
    style: PropTypes.object,
    className: PropTypes.string,
};

export default CalendarioBase;
