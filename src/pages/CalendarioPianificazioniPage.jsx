import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/it';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { supabase } from '../supabaseClient';
import EventoPianificazione from '../components/EventoPianificazione';
import ModalDettagliPianificazione from '../components/ModalDettagliPianificazione';
import PianificazioneForm from '../components/PianificazioneForm';
import './CalendarioPianificazioniPage.css';
import { useNavigate, useSearchParams } from 'react-router-dom';

moment.locale('it');
const localizer = momentLocalizer(moment);

/**
 * Pagina principale calendario pianificazioni interventi
 * Mostra calendario con pianificazioni future, permette creazione/modifica/eliminazione
 * Filtraggio per tecnico, mezzo, stato, commessa
 */
function CalendarioPianificazioniPage({ session, clienti, tecnici, commesse, mezzi }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Stati principali
  const [pianificazioni, setPianificazioni] = useState([]);
  const [foglioMap, setFoglioMap] = useState({}); // Mappa foglio_id -> foglio data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Calendario
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day

  // Modal/Form
  const [showModal, setShowModal] = useState(false);
  const [selectedPianificazione, setSelectedPianificazione] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [pianificazioneToEdit, setPianificazioneToEdit] = useState(null);
  const [preselectedFoglioId, setPreselectedFoglioId] = useState(null);
  const [preselectedFoglio, setPreselectedFoglio] = useState(null);

  // Filtri
  const [filterTecnico, setFilterTecnico] = useState('');
  const [filterMezzo, setFilterMezzo] = useState('');
  const [filterStato, setFilterStato] = useState('');
  const [filterCommessa, setFilterCommessa] = useState('');

  // Fetch pianificazioni e fogli associati
  const fetchPianificazioni = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch pianificazioni
      const { data: pianiData, error: pianiError } = await supabase
        .from('pianificazioni')
        .select('*')
        .order('data_inizio_pianificata', { ascending: true });

      if (pianiError) throw pianiError;

      setPianificazioni(pianiData || []);

      // Fetch fogli associati
      const foglioIds = [...new Set(pianiData.map((p) => p.foglio_assistenza_id))];
      if (foglioIds.length > 0) {
        const { data: fogliData, error: fogliError } = await supabase
          .from('fogli_assistenza')
          .select('id, numero_foglio, cliente_id, commessa_id, stato_foglio')
          .in('id', foglioIds);

        if (fogliError) throw fogliError;

        const foglioMapping = {};
        fogliData.forEach((f) => {
          foglioMapping[f.id] = f;
        });
        setFoglioMap(foglioMapping);
      }
    } catch (err) {
      console.error('Errore caricamento pianificazioni:', err);
      setError(err.message || 'Errore durante il caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPianificazioni();
  }, [fetchPianificazioni]);

  // Gestisce query param foglioId per apertura diretta form
  useEffect(() => {
    const foglioIdParam = searchParams.get('foglioId');
    if (foglioIdParam && !showForm) {
      // Carica dati foglio
      const loadFoglioForPianificazione = async () => {
        try {
          const { data: foglioData, error: foglioError } = await supabase
            .from('fogli_assistenza')
            .select('*, clienti(nome_azienda), commesse(codice)')
            .eq('id', foglioIdParam)
            .single();

          if (foglioError) {
            console.error('Errore caricamento foglio:', foglioError);
            alert('Foglio non trovato o non hai i permessi');
            setSearchParams({});
            return;
          }

          setPreselectedFoglioId(foglioIdParam);
          setPreselectedFoglio({
            ...foglioData,
            numero_foglio: foglioData.numero_foglio,
            cliente_nome: foglioData.clienti?.nome_azienda,
            commessa_codice: foglioData.commesse?.codice,
          });
          setShowForm(true);
        } catch (err) {
          console.error('Errore:', err);
          setSearchParams({});
        }
      };

      loadFoglioForPianificazione();
    }
  }, [searchParams, showForm, setSearchParams]);

  // Trasforma pianificazioni in eventi calendario
  const eventiCalendario = useMemo(() => {
    let filtered = [...pianificazioni];

    // Applica filtri
    if (filterTecnico) {
      filtered = filtered.filter((p) => p.tecnici_assegnati?.includes(filterTecnico));
    }
    if (filterMezzo) {
      filtered = filtered.filter(
        (p) => p.mezzo_principale_id === filterMezzo || p.mezzi_secondari_ids?.includes(filterMezzo)
      );
    }
    if (filterStato) {
      filtered = filtered.filter((p) => p.stato_pianificazione === filterStato);
    }
    if (filterCommessa) {
      filtered = filtered.filter((p) => {
        const foglio = foglioMap[p.foglio_assistenza_id];
        return foglio?.commessa_id === filterCommessa;
      });
    }

    // Trasforma in eventi
    return filtered.map((p) => {
      const foglio = foglioMap[p.foglio_assistenza_id] || {};
      const cliente = clienti.find((c) => c.id === foglio.cliente_id);
      const commessa = commesse.find((c) => c.id === foglio.commessa_id);

      // Risolvi nomi tecnici
      const tecniciNomi = (p.tecnici_assegnati || [])
        .map((tecnicoId) => {
          const tecnico = tecnici.find((t) => t.id === tecnicoId);
          return tecnico ? `${tecnico.nome} ${tecnico.cognome}` : null;
        })
        .filter((nome) => nome);

      // Risolvi targa mezzo principale
      const mezzo = mezzi.find((m) => m.id === p.mezzo_principale_id);
      const mezzoTarga = mezzo ? mezzo.targa : null;

      // Calcola start/end per calendario
      let start, end;
      if (p.tutto_il_giorno) {
        start = new Date(p.data_inizio_pianificata + 'T00:00:00');
        end = new Date(p.data_fine_pianificata + 'T23:59:59');
      } else {
        start = new Date(`${p.data_inizio_pianificata}T${p.ora_inizio_pianificata || '08:00'}`);
        end = new Date(`${p.data_fine_pianificata}T${p.ora_fine_pianificata || '17:00'}`);
      }

      return {
        id: p.id,
        title: `${commessa?.codice || 'N/A'} - ${tecniciNomi.join(', ') || 'N/A'}`,
        start,
        end,
        allDay: p.tutto_il_giorno,
        resource: p,
        // Dati per EventoPianificazione
        commessaCodice: commessa?.codice || 'N/A',
        tecniciNomi,
        statoPianificazione: p.stato_pianificazione,
        mezzoTarga,
        // Dati completi per modal
        numeroFoglio: foglio.numero_foglio,
        clienteNome: cliente?.nome_azienda || 'N/A',
        commessaDescrizione: commessa?.descrizione || '',
        ...p,
      };
    });
  }, [pianificazioni, foglioMap, clienti, tecnici, commesse, mezzi, filterTecnico, filterMezzo, filterStato, filterCommessa]);

  // Handler click evento
  const handleSelectEvent = useCallback((event) => {
    setSelectedPianificazione(event);
    setShowModal(true);
  }, []);

  // Handler nuova pianificazione
  const handleNuovaPianificazione = () => {
    setPianificazioneToEdit(null);
    setPreselectedFoglioId(null);
    setPreselectedFoglio(null);
    setSearchParams({});
    setShowForm(true);
  };

  // Handler modifica pianificazione
  const handleEditPianificazione = (pianificazione) => {
    setShowModal(false);
    setPianificazioneToEdit(pianificazione);
    setPreselectedFoglioId(null);
    setPreselectedFoglio(null);
    setShowForm(true);
  };

  // Handler salvataggio form
  const handleSaveForm = async () => {
    setShowForm(false);
    setPianificazioneToEdit(null);
    setPreselectedFoglioId(null);
    setPreselectedFoglio(null);
    setSearchParams({});
    await fetchPianificazioni();
  };

  // Handler annulla form
  const handleCancelForm = () => {
    setShowForm(false);
    setPianificazioneToEdit(null);
    setPreselectedFoglioId(null);
    setPreselectedFoglio(null);
    setSearchParams({});
  };

  // Handler eliminazione pianificazione
  const handleDeletePianificazione = async (pianificazioneId) => {
    try {
      const { error: delError } = await supabase.from('pianificazioni').delete().eq('id', pianificazioneId);

      if (delError) throw delError;

      setShowModal(false);
      await fetchPianificazioni();
    } catch (err) {
      console.error('Errore eliminazione pianificazione:', err);
      alert(`Errore eliminazione: ${err.message}`);
    }
  };

  // Handler cambio stato
  const handleChangeState = async (pianificazioneId, newState) => {
    try {
      const { error: updateError } = await supabase
        .from('pianificazioni')
        .update({ stato_pianificazione: newState })
        .eq('id', pianificazioneId);

      if (updateError) throw updateError;

      setShowModal(false);
      await fetchPianificazioni();
    } catch (err) {
      console.error('Errore cambio stato:', err);
      alert(`Errore cambio stato: ${err.message}`);
    }
  };

  // Handler navigazione al foglio
  const handleNavigateToFoglio = (foglioId) => {
    navigate(`/fogli/${foglioId}`);
  };

  // Custom event style getter
  const eventStyleGetter = useCallback((event) => {
    const stato = event.resource.stato_pianificazione;
    let backgroundColor = '#6c757d';

    switch (stato) {
      case 'Pianificata':
        backgroundColor = '#6c757d';
        break;
      case 'Confermata':
        backgroundColor = '#007bff';
        break;
      case 'In Corso':
        backgroundColor = '#ffc107';
        break;
      case 'Completata':
        backgroundColor = '#28a745';
        break;
      case 'Cancellata':
        backgroundColor = '#dc3545';
        break;
      default:
        backgroundColor = '#6c757d';
    }

    return {
      style: {
        backgroundColor,
        color: 'white',
        borderRadius: '4px',
        border: 'none',
        display: 'block',
      },
    };
  }, []);

  // Custom components
  const components = useMemo(
    () => ({
      event: EventoPianificazione,
    }),
    []
  );

  if (loading) {
    return (
      <div className="calendario-page">
        <h1>Calendario Pianificazioni</h1>
        <p>Caricamento in corso...</p>
      </div>
    );
  }

  return (
    <div className="calendario-page">
      <h1>Calendario Pianificazioni Interventi</h1>

      {error && <div className="error-message">{error}</div>}

      {/* Toolbar */}
      <div className="calendario-toolbar">
        <button className="button" onClick={handleNuovaPianificazione}>
          + Nuova Pianificazione
        </button>
        <button className="button" onClick={fetchPianificazioni}>
          🔄 Ricarica
        </button>
      </div>

      {/* Filtri */}
      <div className="calendario-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Filtra per Tecnico:</label>
            <select value={filterTecnico} onChange={(e) => setFilterTecnico(e.target.value)}>
              <option value="">-- Tutti --</option>
              {tecnici.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} {t.cognome}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Filtra per Mezzo:</label>
            <select value={filterMezzo} onChange={(e) => setFilterMezzo(e.target.value)}>
              <option value="">-- Tutti --</option>
              {mezzi.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.targa} ({m.tipo_mezzo})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Filtra per Stato:</label>
            <select value={filterStato} onChange={(e) => setFilterStato(e.target.value)}>
              <option value="">-- Tutti --</option>
              <option value="Pianificata">Pianificata</option>
              <option value="Confermata">Confermata</option>
              <option value="In Corso">In Corso</option>
              <option value="Completata">Completata</option>
              <option value="Cancellata">Cancellata</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Filtra per Commessa:</label>
            <select value={filterCommessa} onChange={(e) => setFilterCommessa(e.target.value)}>
              <option value="">-- Tutte --</option>
              {commesse.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codice} - {c.descrizione}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-actions">
          <button
            className="button small"
            onClick={() => {
              setFilterTecnico('');
              setFilterMezzo('');
              setFilterStato('');
              setFilterCommessa('');
            }}
          >
            Reimposta Filtri
          </button>
        </div>
      </div>

      {/* Statistiche */}
      <div className="calendario-stats">
        <p>
          <strong>Pianificazioni visualizzate:</strong> {eventiCalendario.length} / {pianificazioni.length}
        </p>
      </div>

      {/* Calendario */}
      <div className="calendario-container">
        <Calendar
          localizer={localizer}
          events={eventiCalendario}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 700 }}
          view={view}
          onView={setView}
          date={currentDate}
          onNavigate={setCurrentDate}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          components={components}
          messages={{
            today: 'Oggi',
            previous: 'Indietro',
            next: 'Avanti',
            month: 'Mese',
            week: 'Settimana',
            day: 'Giorno',
            agenda: 'Agenda',
            date: 'Data',
            time: 'Ora',
            event: 'Evento',
            noEventsInRange: 'Nessuna pianificazione in questo periodo.',
            showMore: (total) => `+ Altri ${total}`,
          }}
        />
      </div>

      {/* Legenda Stati */}
      <div className="calendario-legenda">
        <h3>Legenda Stati:</h3>
        <div className="legenda-items">
          <div className="legenda-item">
            <span className="legenda-color" style={{ backgroundColor: '#6c757d' }}></span>
            Pianificata
          </div>
          <div className="legenda-item">
            <span className="legenda-color" style={{ backgroundColor: '#007bff' }}></span>
            Confermata
          </div>
          <div className="legenda-item">
            <span className="legenda-color" style={{ backgroundColor: '#ffc107' }}></span>
            In Corso
          </div>
          <div className="legenda-item">
            <span className="legenda-color" style={{ backgroundColor: '#28a745' }}></span>
            Completata
          </div>
          <div className="legenda-item">
            <span className="legenda-color" style={{ backgroundColor: '#dc3545' }}></span>
            Cancellata
          </div>
        </div>
      </div>

      {/* Modal Dettagli */}
      {showModal && selectedPianificazione && (
        <ModalDettagliPianificazione
          pianificazione={selectedPianificazione}
          onClose={() => setShowModal(false)}
          onEdit={handleEditPianificazione}
          onDelete={handleDeletePianificazione}
          onChangeState={handleChangeState}
          onNavigateToFoglio={handleNavigateToFoglio}
          clienti={clienti}
          tecnici={tecnici}
          commesse={commesse}
          mezzi={mezzi}
        />
      )}

      {/* Form Creazione/Modifica */}
      {showForm && (
        <div className="modal-overlay" onClick={handleCancelForm}>
          <div className="modal-content form-modal" onClick={(e) => e.stopPropagation()}>
            <PianificazioneForm
              pianificazioneToEdit={pianificazioneToEdit}
              foglioAssistenzaId={preselectedFoglioId}
              foglio={preselectedFoglio}
              tecnici={tecnici}
              mezzi={mezzi}
              onSave={handleSaveForm}
              onCancel={handleCancelForm}
            />
          </div>
        </div>
      )}
    </div>
  );
}

CalendarioPianificazioniPage.propTypes = {
  session: PropTypes.object.isRequired,
  clienti: PropTypes.array.isRequired,
  tecnici: PropTypes.array.isRequired,
  commesse: PropTypes.array.isRequired,
  mezzi: PropTypes.array.isRequired,
};

export default CalendarioPianificazioniPage;
