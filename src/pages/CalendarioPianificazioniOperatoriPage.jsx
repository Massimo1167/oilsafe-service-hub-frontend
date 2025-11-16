import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import CalendarioBase from '../components/calendario/CalendarioBase';
import CalendarioToolbar from '../components/calendario/CalendarioToolbar';
import EventoPianificazioneCompatto from '../components/calendario/EventoPianificazioneCompatto';
import TimelineView from '../components/calendario/TimelineView';
import AgendaView from '../components/calendario/AgendaView';
import { getColorForCommessa, getColorForTecnico } from '../utils/calendarioColors';
import { formatNumeroFoglio } from '../utils/formatters';
import ModalDettagliPianificazione from '../components/ModalDettagliPianificazione';
import './CalendarioPianificazioniOperatoriPage.css';

/**
 * Pagina Calendario Pianificazioni per Operatori
 * - Visualizza pianificazioni future (read-only)
 * - Supporta viste multiple: Mese, Settimana, Agenda, Timeline
 * - Toggle colori per tecnico o commessa
 * - Ottimizzato per mobile/tablet
 */
function CalendarioPianificazioniOperatoriPage({ user, userRole, clienti, tecnici, commesse, mezzi }) {
  const navigate = useNavigate();
  const [pianificazioni, setPianificazioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvento, setSelectedEvento] = useState(null);

  // Stati per controlli calendario
  const [view, setView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [colorMode, setColorMode] = useState('commessa'); // 'tecnico' o 'commessa'
  const [tecnicoFilter, setTecnicoFilter] = useState(null); // Per admin/manager

  // Mostra filtro tecnico per tutti gli utenti
  const showTecnicoFilter = true;

  // Se è operatore, prendi solo le sue pianificazioni
  const userId = user?.id;

  // Imposta tecnico loggato come default per utenti "user"
  useEffect(() => {
    const setDefaultTecnicoForUser = async () => {
      if (userRole === 'user' && userId && tecnici.length > 0) {
        // Trova il tecnico associato all'utente loggato
        const tecnicoLoggato = tecnici.find(t => t.user_id === userId);
        if (tecnicoLoggato && !tecnicoFilter) {
          // Imposta il filtro solo se non è già impostato
          setTecnicoFilter(tecnicoLoggato.id);
        }
      }
    };

    setDefaultTecnicoForUser();
  }, [userRole, userId, tecnici, tecnicoFilter]);

  // Fetch pianificazioni future
  const fetchPianificazioni = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      const oggiStr = oggi.toISOString().split('T')[0]; // Formato DATE: YYYY-MM-DD

      const { data, error: fetchError } = await supabase
        .from('pianificazioni')
        .select(`
          id,
          data_inizio_pianificata,
          data_fine_pianificata,
          stato_pianificazione,
          foglio_assistenza_id,
          commessa_id,
          cliente_id,
          tecnici_assegnati,
          mezzo_principale_id,
          mezzi_secondari_ids,
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

      if (fetchError) throw fetchError;

      setPianificazioni(data || []);
    } catch (err) {
      console.error('Errore nel caricamento delle pianificazioni:', err);
      setError('Impossibile caricare le pianificazioni. Riprova.');
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    fetchPianificazioni();
  }, [fetchPianificazioni]);

  // Converti pianificazioni in eventi per calendario
  // IMPORTANTE: Duplica eventi per ogni tecnico assegnato
  const eventiCalendario = useMemo(() => {
    if (!pianificazioni.length) return [];

    // Applica filtro tecnico se impostato
    let pianificazioniFiltrate = pianificazioni;
    if (showTecnicoFilter && tecnicoFilter !== null && tecnicoFilter !== '') {
      // Filtra solo pianificazioni che includono il tecnico selezionato
      // Confronto type-safe: converte entrambi a stringa per gestire ID numerici o UUID
      pianificazioniFiltrate = pianificazioni.filter(p => {
        if (!p.tecnici_assegnati || !Array.isArray(p.tecnici_assegnati)) return false;
        return p.tecnici_assegnati.some(tecId => String(tecId) === String(tecnicoFilter));
      });
    }

    // Duplica eventi: crea un evento per ogni tecnico nell'array tecnici_assegnati
    return pianificazioniFiltrate.flatMap(p => {
      // Usa campi diretti con fallback ai campi del foglio
      const commessaId = p.commessa_id || p.fogli_assistenza?.commessa_id;
      const clienteId = p.cliente_id || p.fogli_assistenza?.cliente_id;
      const commessa = commesse?.find(c => c.id === commessaId);
      const cliente = clienti?.find(cl => cl.id === clienteId);

      // Se non ci sono tecnici assegnati, crea un evento generico
      if (!p.tecnici_assegnati || p.tecnici_assegnati.length === 0) {
        const numeroFoglioAbbreviato = formatNumeroFoglio(p.fogli_assistenza?.numero_foglio);
        return [{
          title: `#${numeroFoglioAbbreviato} - ${commessa?.codice_commessa || 'N/A'}`,
          start: new Date(p.data_inizio_pianificata + 'T00:00:00'),
          end: new Date(p.data_fine_pianificata + 'T23:59:59'),
          resource: {
            id: p.id,
            numero_foglio: p.fogli_assistenza?.numero_foglio,
            stato: p.stato_pianificazione,
            tecnico_id: null,
            tecnico_nome: 'Nessun tecnico',
            commessa_id: commessaId,
            commessa_codice: commessa?.codice_commessa,
            commessa_descrizione: commessa?.descrizione,
            cliente_id: clienteId,
            cliente_nome: cliente?.ragione_sociale,
            foglio_id: p.foglio_assistenza_id,
            mezzo_principale_id: p.mezzo_principale_id,
          }
        }];
      }

      // Crea un evento separato per ogni tecnico assegnato
      return p.tecnici_assegnati.map(tecnicoId => {
        const tecnico = tecnici?.find(t => t.id === tecnicoId);
        const numeroFoglioAbbreviato = formatNumeroFoglio(p.fogli_assistenza?.numero_foglio);

        return {
          title: `#${numeroFoglioAbbreviato} - ${commessa?.codice_commessa || 'N/A'}`,
          start: new Date(p.data_inizio_pianificata + 'T00:00:00'),
          end: new Date(p.data_fine_pianificata + 'T23:59:59'),
          resource: {
            id: p.id,
            numero_foglio: p.fogli_assistenza?.numero_foglio,
            stato: p.stato_pianificazione,
            tecnico_id: tecnicoId,
            tecnico_nome: tecnico ? `${tecnico.nome} ${tecnico.cognome}` : 'N/D',
            commessa_id: commessaId,
            commessa_codice: commessa?.codice_commessa,
            commessa_descrizione: commessa?.descrizione,
            cliente_id: clienteId,
            cliente_nome: cliente?.ragione_sociale,
            foglio_id: p.foglio_assistenza_id,
            mezzo_principale_id: p.mezzo_principale_id,
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
  const handleSelectEvent = useCallback(async (event) => {
    // Fetch complete pianificazione data from database
    try {
      const { data, error } = await supabase
        .from('pianificazioni')
        .select(`
          id,
          data_inizio_pianificata,
          ora_inizio_pianificata,
          data_fine_pianificata,
          ora_fine_pianificata,
          tutto_il_giorno,
          salta_sabato,
          salta_domenica,
          salta_festivi,
          stato_pianificazione,
          foglio_assistenza_id,
          commessa_id,
          cliente_id,
          tecnici_assegnati,
          mezzo_principale_id,
          mezzi_secondari_ids,
          descrizione,
          fogli_assistenza (
            id,
            numero_foglio,
            cliente_id,
            commessa_id
          )
        `)
        .eq('id', event.resource.id)
        .single();

      if (error) throw error;

      if (data) {
        // Enrich with resolved data
        const commessaId = data.commessa_id || data.fogli_assistenza?.commessa_id;
        const clienteId = data.cliente_id || data.fogli_assistenza?.cliente_id;
        const commessa = commesse?.find(c => c.id === commessaId);
        const cliente = clienti?.find(cl => cl.id === clienteId);

        const enrichedData = {
          ...data,
          numeroFoglio: data.fogli_assistenza?.numero_foglio,
          clienteNome: cliente?.ragione_sociale,
          commessaCodice: commessa?.codice_commessa,
          commessaDescrizione: commessa?.descrizione,
        };

        setSelectedEvento(enrichedData);
      }
    } catch (err) {
      console.error('Errore nel caricamento dei dettagli pianificazione:', err);
      // Fallback to basic resource data
      setSelectedEvento(event.resource);
    }
  }, [commesse, clienti]);

  // Handler per chiusura modal
  const handleCloseModal = useCallback(() => {
    setSelectedEvento(null);
  }, []);

  // Handler navigazione al foglio
  const handleNavigateToFoglio = useCallback((foglioId) => {
    navigate(`/fogli-assistenza/${foglioId}`);
  }, [navigate]);

  // Handlers per ModalDettagliPianificazione (read-only mode - no edit/delete/duplicate)
  const handleEditPianificazione = () => {
    alert('Modifica pianificazione non disponibile in modalità visualizzazione.');
  };

  const handleDeletePianificazione = () => {
    alert('Eliminazione pianificazione non disponibile in modalità visualizzazione.');
  };

  const handleChangeStatePianificazione = () => {
    alert('Cambio stato non disponibile in modalità visualizzazione.');
  };

  const handleDuplicatePianificazione = () => {
    alert('Duplicazione non disponibile in modalità visualizzazione.');
  };

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
          key={`${currentDate.toISOString()}-timeline`}
          events={eventiCalendario}
          date={currentDate}
          tecnici={tecniciConPianificazioni}
          onSelectEvent={handleSelectEvent}
          getEventColor={getEventColor}
          onPianificazioneUpdated={fetchPianificazioni}
        />
      );
    } else if (view === 'agenda') {
      return (
        <AgendaView
          key={`${currentDate.toISOString()}-agenda`}
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
          key={`${currentDate.toISOString()}-${view}`}
          events={eventiCalendario}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          components={{
            event: EventoPianificazioneCompatto,
          }}
          views={['month', 'week']}
          toolbar={false}
          date={currentDate}
          onNavigate={(newDate) => setCurrentDate(newDate)}
          view={view}
          onView={setView}
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
            Visualizza le pianificazioni future di tutti i tecnici
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

      {/* Modal dettagli pianificazione */}
      {selectedEvento && (
        <ModalDettagliPianificazione
          pianificazione={selectedEvento}
          onClose={handleCloseModal}
          onEdit={handleEditPianificazione}
          onDelete={handleDeletePianificazione}
          onChangeState={handleChangeStatePianificazione}
          onNavigateToFoglio={handleNavigateToFoglio}
          onDuplicate={handleDuplicatePianificazione}
          clienti={clienti || []}
          tecnici={tecnici || []}
          commesse={commesse || []}
          mezzi={mezzi || []}
        />
      )}
    </div>
  );
}

export default CalendarioPianificazioniOperatoriPage;
