import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { supabase } from '../supabaseClient';
import EventoCalendario from '../components/EventoCalendario';
import LegendaColoriCalendario from '../components/LegendaColoriCalendario';
import ModalDettagliEventoCalendario from '../components/ModalDettagliEventoCalendario';
import { getEventStyle } from '../utils/calendarioColors';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import './CalendarioFogliPage.css';

// Configurazione localizer per date-fns con locale italiana
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: it }),
  getDay,
  locales: { 'it': it },
});

// Messaggi in italiano per il calendario
const messages = {
  allDay: 'Tutto il giorno',
  previous: 'Precedente',
  next: 'Successivo',
  today: 'Oggi',
  month: 'Mese',
  week: 'Settimana',
  day: 'Giorno',
  agenda: 'Agenda',
  date: 'Data',
  time: 'Ora',
  event: 'Evento',
  noEventsInRange: 'Nessun evento in questo periodo',
  showMore: (total) => `+ Altri ${total}`,
};

function CalendarioFogliPage({ clienti, tecnici, commesse }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [eventi, setEventi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [view, setView] = useState('month'); // month, week, day
  const [currentDate, setCurrentDate] = useState(new Date()); // Data visualizzata nel calendario

  // Estrai IDs fogli dalla query string
  const foglioIds = useMemo(() => {
    const ids = searchParams.get('fogli');
    return ids ? ids.split(',').filter(Boolean) : [];
  }, [searchParams]);

  // Fetch interventi dal database
  useEffect(() => {
    const fetchInterventi = async () => {
      if (foglioIds.length === 0) {
        setEventi([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('interventi_assistenza')
          .select(`
            id,
            data_intervento_effettivo,
            ore_lavoro_effettive,
            ore_viaggio,
            descrizione_attivita_svolta_intervento,
            tecnico_id,
            tecnici (id, nome, cognome),
            foglio_assistenza_id,
            fogli_assistenza (
              id,
              numero_foglio,
              cliente_id,
              commessa_id
            )
          `)
          .in('foglio_assistenza_id', foglioIds)
          .not('data_intervento_effettivo', 'is', null)
          .order('data_intervento_effettivo', { ascending: true });

        if (fetchError) throw fetchError;

        setEventi(data || []);
      } catch (err) {
        console.error('Errore nel caricamento degli interventi:', err);
        setError('Impossibile caricare gli interventi. Riprova.');
      } finally {
        setLoading(false);
      }
    };

    fetchInterventi();
  }, [foglioIds]);

  // Aggrega interventi per (data, tecnico, commessa)
  const eventiCalendario = useMemo(() => {
    if (!eventi.length) return [];

    // Mappa per aggregare: chiave = "data|tecnico_id|commessa_id"
    const aggregazioneMap = new Map();

    eventi.forEach((intervento) => {
      const dataIntervento = intervento.data_intervento_effettivo;
      const tecnicoId = intervento.tecnico_id;
      const commessaId = intervento.fogli_assistenza?.commessa_id;
      const foglioId = intervento.foglio_assistenza_id;

      if (!dataIntervento || !tecnicoId) return;

      const chiave = `${dataIntervento}|${tecnicoId}|${commessaId || 'null'}`;

      if (!aggregazioneMap.has(chiave)) {
        aggregazioneMap.set(chiave, {
          data: dataIntervento,
          tecnicoId,
          commessaId,
          tecnicoNome: intervento.tecnici
            ? `${intervento.tecnici.nome} ${intervento.tecnici.cognome}`
            : 'N/A',
          commessaCodice: null, // Sarà risolto dopo
          clienteId: intervento.fogli_assistenza?.cliente_id,
          clienteNome: null, // Sarà risolto dopo
          oreLavoro: 0,
          oreViaggio: 0,
          interventi: [],
        });
      }

      const aggregato = aggregazioneMap.get(chiave);
      aggregato.oreLavoro += parseFloat(intervento.ore_lavoro_effettive || 0);
      aggregato.oreViaggio += parseFloat(intervento.ore_viaggio || 0);
      aggregato.interventi.push({
        id: intervento.id,
        foglioId: foglioId,
        numeroFoglio: intervento.fogli_assistenza?.numero_foglio,
        descrizione: intervento.descrizione_attivita_svolta_intervento,
        oreLavoro: parseFloat(intervento.ore_lavoro_effettive || 0),
        oreViaggio: parseFloat(intervento.ore_viaggio || 0),
      });
    });

    // Converti in array e risolvi codici commessa/clienti
    const eventiArray = Array.from(aggregazioneMap.values()).map((agg) => {
      const commessa = commesse?.find((c) => c.id === agg.commessaId);
      const cliente = clienti?.find((cl) => cl.id === agg.clienteId);

      return {
        ...agg,
        commessaCodice: commessa?.codice_commessa || 'N/A',
        clienteNome: cliente?.ragione_sociale || 'N/A',
        oreTotali: agg.oreLavoro + agg.oreViaggio,
      };
    });

    // Converti in formato eventi per react-big-calendar
    return eventiArray.map((agg) => {
      const date = new Date(agg.data + 'T00:00:00'); // Forza timezone locale

      return {
        title: `${agg.commessaCodice} - ${agg.tecnicoNome}`,
        start: date,
        end: date,
        allDay: true,
        resource: agg, // Dati completi per modal e rendering
        commessaCodice: agg.commessaCodice,
        tecnicoNome: agg.tecnicoNome,
        oreTotali: agg.oreTotali,
      };
    });
  }, [eventi, commesse, clienti]);

  // Estrai commesse e tecnici unici per la leggenda
  const commesseUniche = useMemo(() => {
    if (!eventiCalendario.length) return [];
    const commessaIds = new Set(
      eventiCalendario.map((e) => e.resource.commessaId).filter(Boolean)
    );
    return commesse?.filter((c) => commessaIds.has(c.id)) || [];
  }, [eventiCalendario, commesse]);

  const tecniciUnici = useMemo(() => {
    if (!eventiCalendario.length) return [];
    const tecnicoIds = new Set(
      eventiCalendario.map((e) => e.resource.tecnicoId).filter(Boolean)
    );
    return tecnici?.filter((t) => tecnicoIds.has(t.id)) || [];
  }, [eventiCalendario, tecnici]);

  // Handler per click su evento
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvento(event.resource);
  }, []);

  // Handler per chiusura modal
  const handleCloseModal = useCallback(() => {
    setSelectedEvento(null);
  }, []);

  // Calcola la data del primo intervento
  const primaDataIntervento = useMemo(() => {
    if (eventiCalendario.length === 0) return null;
    // Gli eventi sono già ordinati per data (dal fetch)
    const primoEvento = eventiCalendario[0];
    return primoEvento?.start || null;
  }, [eventiCalendario]);

  // Handler per saltare alla data del primo intervento
  const handleGoToPrimoIntervento = useCallback(() => {
    if (primaDataIntervento) {
      setCurrentDate(new Date(primaDataIntervento));
    }
  }, [primaDataIntervento]);

  // Custom event style
  const eventStyleGetter = useCallback((event) => {
    const { commessaId, tecnicoId } = event.resource || {};
    const style = getEventStyle(commessaId, tecnicoId);

    return { style };
  }, []);

  // Custom event component
  const EventComponent = useCallback(({ event }) => {
    return <EventoCalendario event={event} />;
  }, []);

  if (foglioIds.length === 0) {
    return (
      <div className="calendario-page">
        <div className="calendario-container">
          <h1>Storico Interventi</h1>
          <div className="empty-state" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📋</div>
            <h2 style={{ color: '#003366', marginBottom: '1rem' }}>Nessun foglio selezionato</h2>
            <p style={{ fontSize: '1.1rem', color: '#666', marginBottom: '2rem' }}>
              Per visualizzare gli interventi sul calendario, devi prima selezionare uno o più fogli dalla lista.
            </p>
            <button
              className="button primary"
              onClick={() => navigate('/fogli-assistenza')}
              style={{ fontSize: '1rem', padding: '0.75rem 1.5rem' }}
            >
              Vai alla Lista Fogli
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="calendario-page">
      <div className="calendario-container">
        <div className="calendario-header">
          <div className="calendario-header-top">
            <div>
              <h1>Storico Interventi</h1>
              <p className="fogli-count">
                {foglioIds.length} {foglioIds.length === 1 ? 'foglio selezionato' : 'fogli selezionati'}
              </p>
            </div>
            {primaDataIntervento && !loading && eventiCalendario.length > 0 && (
              <button
                onClick={handleGoToPrimoIntervento}
                className="button primary"
                title="Vai alla data del primo intervento"
              >
                Vai al Primo Intervento ({format(primaDataIntervento, 'dd/MM/yyyy', { locale: it })})
              </button>
            )}
          </div>
        </div>

        {loading && (
          <div className="loading-message">Caricamento interventi...</div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}

        {!loading && !error && (
          <>
            <div className="calendario-wrapper">
              <Calendar
                localizer={localizer}
                events={eventiCalendario}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '700px' }}
                messages={messages}
                culture="it"
                view={view}
                onView={setView}
                date={currentDate}
                onNavigate={setCurrentDate}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                components={{
                  event: EventComponent,
                }}
              />
            </div>

            {/* Leggenda */}
            {(commesseUniche.length > 0 || tecniciUnici.length > 0) && (
              <LegendaColoriCalendario
                commesse={commesseUniche}
                tecnici={tecniciUnici}
              />
            )}
          </>
        )}
      </div>

      {/* Modal dettagli evento */}
      {selectedEvento && (
        <ModalDettagliEventoCalendario
          evento={selectedEvento}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default CalendarioFogliPage;
