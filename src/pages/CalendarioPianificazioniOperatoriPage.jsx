import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import CalendarioBase from '../components/calendario/CalendarioBase';
import CalendarioToolbar from '../components/calendario/CalendarioToolbar';
import EventoPianificazioneCompatto from '../components/calendario/EventoPianificazioneCompatto';
import TimelineView from '../components/calendario/TimelineView';
import AgendaView from '../components/calendario/AgendaView';
import { getColorForCommessa, getColorForTecnico } from '../utils/calendarioColors';
import ModalDettagliEventoCalendario from '../components/ModalDettagliEventoCalendario';
import './CalendarioPianificazioniOperatoriPage.css';

/**
 * Pagina Calendario Pianificazioni per Operatori
 * - Visualizza pianificazioni future (read-only)
 * - Supporta viste multiple: Mese, Settimana, Agenda, Timeline
 * - Toggle colori per tecnico o commessa
 * - Ottimizzato per mobile/tablet
 */
function CalendarioPianificazioniOperatoriPage({ user, userRole, clienti, tecnici, commesse }) {
  const [pianificazioni, setPianificazioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvento, setSelectedEvento] = useState(null);

  // Stati per controlli calendario
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [colorMode, setColorMode] = useState('commessa'); // 'tecnico' o 'commessa'
  const [tecnicoFilter, setTecnicoFilter] = useState(null); // Per admin/manager

  // Determina se mostrare filtro tecnico (solo admin/manager)
  const showTecnicoFilter = userRole === 'admin' || userRole === 'manager';

  // Se è operatore, prendi solo le sue pianificazioni
  const userId = user?.id;

  // Fetch pianificazioni future
  useEffect(() => {
    const fetchPianificazioni = async () => {
      try {
        setLoading(true);
        setError(null);

        const oggi = new Date();
        oggi.setHours(0, 0, 0, 0);
        const oggiStr = oggi.toISOString().split('T')[0]; // Formato DATE: YYYY-MM-DD

        let query = supabase
          .from('pianificazioni')
          .select(`
            id,
            data_inizio_pianificata,
            data_fine_pianificata,
            stato_pianificazione,
            foglio_assistenza_id,
            tecnici_assegnati,
            fogli_assistenza (
              id,
              numero_foglio,
              cliente_id,
              commessa_id
            )
          `)
          .gte('data_inizio_pianificata', oggiStr)
          .in('stato_pianificazione', ['Pianificata', 'Confermata', 'In Corso'])
          .order('data_inizio_pianificata', { ascending: true });

        // Se operatore, filtra solo le sue pianificazioni
        if (userRole === 'user' && userId) {
          // Prima recupera il tecnico_id dell'utente
          const { data: tecnicoData } = await supabase
            .from('tecnici')
            .select('id')
            .eq('user_id', userId)
            .single();

          if (tecnicoData?.id) {
            // Filtra pianificazioni dove il tecnico è nell'array tecnici_assegnati
            query = query.contains('tecnici_assegnati', [tecnicoData.id]);
          } else {
            // Se l'utente non ha un tecnico associato, non mostrare nulla
            setPianificazioni([]);
            setLoading(false);
            return;
          }
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;

        setPianificazioni(data || []);
      } catch (err) {
        console.error('Errore nel caricamento delle pianificazioni:', err);
        setError('Impossibile caricare le pianificazioni. Riprova.');
      } finally {
        setLoading(false);
      }
    };

    fetchPianificazioni();
  }, [userId, userRole]);

  // Converti pianificazioni in eventi per calendario
  // IMPORTANTE: Duplica eventi per ogni tecnico assegnato
  const eventiCalendario = useMemo(() => {
    if (!pianificazioni.length) return [];

    // Applica filtro tecnico se impostato (solo per admin/manager)
    let pianificazioniFiltrate = pianificazioni;
    if (showTecnicoFilter && tecnicoFilter) {
      // Filtra solo pianificazioni che includono il tecnico selezionato
      pianificazioniFiltrate = pianificazioni.filter(p =>
        p.tecnici_assegnati?.includes(tecnicoFilter)
      );
    }

    // Duplica eventi: crea un evento per ogni tecnico nell'array tecnici_assegnati
    return pianificazioniFiltrate.flatMap(p => {
      const commessa = commesse?.find(c => c.id === p.fogli_assistenza?.commessa_id);
      const cliente = clienti?.find(cl => cl.id === p.fogli_assistenza?.cliente_id);

      // Se non ci sono tecnici assegnati, crea un evento generico
      if (!p.tecnici_assegnati || p.tecnici_assegnati.length === 0) {
        return [{
          title: `#${p.fogli_assistenza?.numero_foglio || 'N/D'} - ${commessa?.codice_commessa || 'N/A'}`,
          start: new Date(p.data_inizio_pianificata + 'T00:00:00'),
          end: new Date(p.data_fine_pianificata + 'T23:59:59'),
          resource: {
            id: p.id,
            numero_foglio: p.fogli_assistenza?.numero_foglio,
            stato: p.stato_pianificazione,
            tecnico_id: null,
            tecnico_nome: 'Nessun tecnico',
            commessa_id: p.fogli_assistenza?.commessa_id,
            commessa_codice: commessa?.codice_commessa,
            commessa_descrizione: commessa?.descrizione,
            cliente_id: p.fogli_assistenza?.cliente_id,
            cliente_nome: cliente?.ragione_sociale,
            foglio_id: p.foglio_assistenza_id,
          }
        }];
      }

      // Crea un evento separato per ogni tecnico assegnato
      return p.tecnici_assegnati.map(tecnicoId => {
        const tecnico = tecnici?.find(t => t.id === tecnicoId);

        return {
          title: `#${p.fogli_assistenza?.numero_foglio || 'N/D'} - ${commessa?.codice_commessa || 'N/A'}`,
          start: new Date(p.data_inizio_pianificata + 'T00:00:00'),
          end: new Date(p.data_fine_pianificata + 'T23:59:59'),
          resource: {
            id: p.id,
            numero_foglio: p.fogli_assistenza?.numero_foglio,
            stato: p.stato_pianificazione,
            tecnico_id: tecnicoId,
            tecnico_nome: tecnico ? `${tecnico.nome} ${tecnico.cognome}` : 'N/D',
            commessa_id: p.fogli_assistenza?.commessa_id,
            commessa_codice: commessa?.codice_commessa,
            commessa_descrizione: commessa?.descrizione,
            cliente_id: p.fogli_assistenza?.cliente_id,
            cliente_nome: cliente?.ragione_sociale,
            foglio_id: p.foglio_assistenza_id,
          }
        };
      });
    });
  }, [pianificazioni, tecnici, commesse, clienti, tecnicoFilter, showTecnicoFilter]);

  // Filtra tecnici che hanno pianificazioni
  const tecniciConPianificazioni = useMemo(() => {
    if (!eventiCalendario.length) return [];
    const tecnicoIds = new Set(
      eventiCalendario.map(e => e.resource.tecnico_id).filter(Boolean)
    );
    return tecnici?.filter(t => tecnicoIds.has(t.id)) || [];
  }, [eventiCalendario, tecnici]);

  // Funzione per ottenere colore evento
  const getEventColor = useCallback((event) => {
    const { commessa_id, tecnico_id } = event.resource || {};
    if (colorMode === 'tecnico') {
      return getColorForTecnico(tecnico_id);
    } else {
      return getColorForCommessa(commessa_id);
    }
  }, [colorMode]);

  // Custom event style
  const eventStyleGetter = useCallback((event) => {
    const backgroundColor = getEventColor(event);

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        border: '1px solid rgba(0, 0, 0, 0.2)',
        color: '#ffffff',
        fontWeight: '500',
        fontSize: '0.9em',
        padding: '2px 5px',
      }
    };
  }, [getEventColor]);

  // Handler per click su evento
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvento(event.resource);
  }, []);

  // Handler per chiusura modal
  const handleCloseModal = useCallback(() => {
    setSelectedEvento(null);
  }, []);

  // Custom toolbar
  const CustomToolbar = useCallback((toolbarProps) => {
    return (
      <CalendarioToolbar
        {...toolbarProps}
        view={view}
        views={['month', 'week', 'agenda', 'timeline']}
        colorMode={colorMode}
        onColorModeChange={setColorMode}
        showColorModeToggle={true}
        tecnicoFilter={tecnicoFilter}
        onTecnicoFilterChange={setTecnicoFilter}
        tecnici={showTecnicoFilter ? tecnici : []}
        showTecnicoFilter={showTecnicoFilter}
      />
    );
  }, [view, colorMode, tecnicoFilter, showTecnicoFilter, tecnici]);

  // Render vista personalizzata
  const renderView = () => {
    if (view === 'timeline') {
      return (
        <TimelineView
          events={eventiCalendario}
          date={currentDate}
          tecnici={tecniciConPianificazioni}
          onSelectEvent={handleSelectEvent}
          getEventColor={getEventColor}
        />
      );
    } else if (view === 'agenda') {
      return (
        <AgendaView
          events={eventiCalendario}
          date={currentDate}
          onSelectEvent={handleSelectEvent}
          getEventColor={getEventColor}
        />
      );
    } else {
      // Month o Week - usa CalendarioBase
      return (
        <CalendarioBase
          events={eventiCalendario}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          components={{
            event: EventoPianificazioneCompatto,
          }}
          views={['month', 'week']}
          defaultView={view}
          toolbar={false}
          style={{ height: 600 }}
        />
      );
    }
  };

  return (
    <div className="calendario-pianificazioni-page">
      <div className="calendario-container">
        <div className="calendario-header">
          <h1>Calendario Pianificazioni</h1>
          <p className="calendario-subtitle">
            {showTecnicoFilter ? 'Visualizza tutte le pianificazioni future' : 'Le tue pianificazioni future'}
          </p>
        </div>

        {loading && (
          <div className="loading-message">Caricamento pianificazioni...</div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}

        {!loading && !error && (
          <>
            {/* Toolbar personalizzata */}
            <CustomToolbar
              date={currentDate}
              onNavigate={(action) => {
                if (action === 'TODAY') {
                  setCurrentDate(new Date());
                } else if (action === 'PREV') {
                  const newDate = new Date(currentDate);
                  if (view === 'month') {
                    newDate.setMonth(newDate.getMonth() - 1);
                  } else if (view === 'week' || view === 'timeline' || view === 'agenda') {
                    newDate.setDate(newDate.getDate() - 7);
                  }
                  setCurrentDate(newDate);
                } else if (action === 'NEXT') {
                  const newDate = new Date(currentDate);
                  if (view === 'month') {
                    newDate.setMonth(newDate.getMonth() + 1);
                  } else if (view === 'week' || view === 'timeline' || view === 'agenda') {
                    newDate.setDate(newDate.getDate() + 7);
                  }
                  setCurrentDate(newDate);
                }
              }}
              onView={setView}
              label={currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}
            />

            {/* Vista calendario */}
            <div className="calendario-wrapper">
              {eventiCalendario.length === 0 ? (
                <div className="empty-state">
                  <p>Nessuna pianificazione futura trovata.</p>
                </div>
              ) : (
                renderView()
              )}
            </div>
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

export default CalendarioPianificazioniOperatoriPage;
