import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import './CalendarioScadenzeMezziPage.css';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: it }),
  getDay,
  locales: { 'it': it },
});

function CalendarioScadenzeMezziPage({ session }) {
  const navigate = useNavigate();
  const [mezzi, setMezzi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMezzo, setFilterMezzo] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');

  const userRole = (session?.user?.role || '').trim().toLowerCase();
  const canAccess = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    if (!canAccess) return;

    const fetchMezzi = async () => {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('mezzi_trasporto')
          .select('*')
          .eq('attivo', true)
          .order('targa');

        if (fetchError) throw fetchError;
        setMezzi(data || []);
      } catch (err) {
        console.error('Errore caricamento mezzi:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMezzi();
  }, [canAccess]);

  // Trasforma scadenze in eventi calendario
  const eventiCalendario = useMemo(() => {
    const eventi = [];
    const oggi = new Date();

    const mezziFilteredList = mezzi.filter(m => {
      if (filterMezzo && m.id !== filterMezzo) return false;
      return true;
    });

    mezziFilteredList.forEach(mezzo => {
      const scadenze = [
        { tipo: 'Revisione', campo: 'scadenza_revisione', color: '#007bff' },
        { tipo: 'Assicurazione', campo: 'scadenza_assicurazione', color: '#28a745' },
        { tipo: 'Bollo', campo: 'scadenza_bollo', color: '#ffc107' },
        { tipo: 'Manutenzione', campo: 'scadenza_manutenzione', color: '#dc3545' },
      ];

      scadenze.forEach(({ tipo, campo, color }) => {
        if (filterTipo && filterTipo !== tipo) return;

        const dataScadenza = mezzo[campo];
        if (!dataScadenza) return;

        const dataObj = new Date(dataScadenza);
        const giorni = Math.ceil((dataObj - oggi) / (1000 * 60 * 60 * 24));

        eventi.push({
          id: `${mezzo.id}-${tipo}`,
          title: `${tipo} - ${mezzo.targa}`,
          start: dataObj,
          end: dataObj,
          allDay: true,
          resource: {
            mezzo,
            tipo,
            giorni,
            color,
            isScaduto: giorni < 0,
          },
        });
      });
    });

    return eventi;
  }, [mezzi, filterMezzo, filterTipo]);

  // Custom event style
  const eventStyleGetter = (event) => {
    const { color, isScaduto } = event.resource;
    return {
      style: {
        backgroundColor: isScaduto ? '#dc3545' : color,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        opacity: isScaduto ? 0.8 : 1,
      },
    };
  };

  if (!canAccess) {
    return (
      <div className="calendario-scadenze-page">
        <h1>Calendario Scadenze Mezzi</h1>
        <p>Non hai i permessi per visualizzare questa pagina.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="calendario-scadenze-page">
        <h1>Calendario Scadenze Mezzi</h1>
        <p>Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="calendario-scadenze-page">
      <h1>Calendario Scadenze Mezzi</h1>

      {error && <div className="error-message">{error}</div>}

      {/* Toolbar */}
      <div className="calendario-toolbar">
        <button onClick={() => navigate('/scadenze-mezzi')} className="button secondary">
          Dashboard Scadenze
        </button>
        <button onClick={() => navigate('/mezzi')} className="button secondary">
          Gestione Mezzi
        </button>
      </div>

      {/* Filtri */}
      <div className="calendario-filters">
        <div className="filter-group">
          <label>Filtra per Mezzo:</label>
          <select value={filterMezzo} onChange={(e) => setFilterMezzo(e.target.value)}>
            <option value="">-- Tutti i mezzi --</option>
            {mezzi.map(m => (
              <option key={m.id} value={m.id}>
                {m.targa} - {m.tipo_mezzo}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Filtra per Tipo Scadenza:</label>
          <select value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
            <option value="">-- Tutte le scadenze --</option>
            <option value="Revisione">Revisione</option>
            <option value="Assicurazione">Assicurazione</option>
            <option value="Bollo">Bollo</option>
            <option value="Manutenzione">Manutenzione</option>
          </select>
        </div>

        <button
          className="button small"
          onClick={() => {
            setFilterMezzo('');
            setFilterTipo('');
          }}
        >
          Reimposta Filtri
        </button>
      </div>

      {/* Legenda */}
      <div className="calendario-legend">
        <h3>Legenda:</h3>
        <div className="legend-items">
          <span className="legend-item" style={{ backgroundColor: '#007bff' }}>Revisione</span>
          <span className="legend-item" style={{ backgroundColor: '#28a745' }}>Assicurazione</span>
          <span className="legend-item" style={{ backgroundColor: '#ffc107', color: '#333' }}>Bollo</span>
          <span className="legend-item" style={{ backgroundColor: '#dc3545' }}>Manutenzione</span>
        </div>
      </div>

      {/* Calendario */}
      <div className="calendario-container">
        <Calendar
          localizer={localizer}
          culture="it"
          events={eventiCalendario}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 700 }}
          view={view}
          onView={setView}
          date={currentDate}
          onNavigate={setCurrentDate}
          eventPropGetter={eventStyleGetter}
          messages={{
            allDay: 'Tutto il giorno',
            previous: '‹',
            next: '›',
            today: 'Oggi',
            month: 'Mese',
            week: 'Settimana',
            day: 'Giorno',
            agenda: 'Agenda',
            date: 'Data',
            time: 'Ora',
            event: 'Scadenza',
            noEventsInRange: 'Nessuna scadenza in questo periodo.',
          }}
          formats={{
            dateFormat: 'd',
            dayFormat: 'EEE d/M',
            weekdayFormat: 'EEE',
            monthHeaderFormat: 'MMMM yyyy',
            dayHeaderFormat: 'EEEE d MMMM yyyy',
            dayRangeHeaderFormat: ({ start, end }) =>
              `${format(start, 'd MMMM', { locale: it })} - ${format(end, 'd MMMM yyyy', { locale: it })}`,
            agendaHeaderFormat: ({ start, end }) =>
              `${format(start, 'd MMMM', { locale: it })} - ${format(end, 'd MMMM yyyy', { locale: it })}`,
            agendaDateFormat: 'd MMMM',
            agendaTimeFormat: 'HH:mm',
            agendaTimeRangeFormat: ({ start, end }) =>
              `${format(start, 'HH:mm', { locale: it })} - ${format(end, 'HH:mm', { locale: it })}`,
          }}
        />
      </div>

      <div className="calendario-info">
        <p>Visualizzazione: {eventiCalendario.length} scadenze su calendario (solo mezzi attivi)</p>
        <p style={{ fontSize: '0.9em', color: '#666', marginTop: '10px' }}>
          Questo calendario è di sola visualizzazione. Per modificare le date delle scadenze,
          utilizzare la pagina Gestione Mezzi.
        </p>
      </div>
    </div>
  );
}

export default CalendarioScadenzeMezziPage;
