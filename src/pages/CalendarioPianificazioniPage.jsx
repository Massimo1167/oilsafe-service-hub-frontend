import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { supabase } from '../supabaseClient';
import EventoPianificazione from '../components/EventoPianificazione';
import ModalDettagliPianificazione from '../components/ModalDettagliPianificazione';
import PianificazioneForm from '../components/PianificazioneForm';
import './CalendarioPianificazioniPage.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getColorForCommessa } from '../utils/calendarioColors';
import LegendaColoriCalendario from '../components/LegendaColoriCalendario';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: it }),
  getDay,
  locales: { 'it': it },
});
const DnDCalendar = withDragAndDrop(Calendar);

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
  const [filterFoglio, setFilterFoglio] = useState('');
  const [filterDataInizio, setFilterDataInizio] = useState('');
  const [filterDataFine, setFilterDataFine] = useState('');

  // Lista fogli disponibili per dropdown form
  const [fogliDisponibili, setFogliDisponibili] = useState([]);
  const [alertMezzi, setAlertMezzi] = useState({ scadute: 0, inScadenza: 0 });

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

  // Fetch fogli pianificabili per dropdown form
  const fetchFogliPianificabili = useCallback(async () => {
    try {
      console.log('CalendarioPianificazioni: Inizio fetch fogli pianificabili...');

      // Prima query: fogli base
      const { data: fogliData, error: fogliError } = await supabase
        .from('fogli_assistenza')
        .select('id, numero_foglio, data_apertura_foglio, cliente_id, commessa_id')
        .in('stato_foglio', ['Aperto', 'In Lavorazione', 'Attesa Firma'])
        .order('data_apertura_foglio', { ascending: false });

      if (fogliError) {
        console.error('Errore caricamento fogli pianificabili:', fogliError);
        setFogliDisponibili([]);
        return;
      }

      console.log(`CalendarioPianificazioni: Caricati ${fogliData?.length || 0} fogli pianificabili`);

      if (!fogliData || fogliData.length === 0) {
        console.log('CalendarioPianificazioni: Nessun foglio pianificabile trovato');
        setFogliDisponibili([]);
        return;
      }

      // Arricchisci con nomi cliente e commessa
      const fogliArricchiti = fogliData.map((f) => {
        const cliente = clienti.find((c) => c.id === f.cliente_id);
        const commessa = commesse.find((c) => c.id === f.commessa_id);
        return {
          ...f,
          cliente_nome: cliente?.nome_azienda || 'N/A',
          commessa_codice: commessa?.codice_commessa || 'N/A',
        };
      });

      console.log('CalendarioPianificazioni: Fogli arricchiti con successo:', fogliArricchiti.length);
      setFogliDisponibili(fogliArricchiti);
    } catch (err) {
      console.error('Errore fetch fogli pianificabili:', err);
      setFogliDisponibili([]);
    }
  }, [clienti, commesse]);

  useEffect(() => {
    fetchFogliPianificabili();
  }, [fetchFogliPianificabili]);

  // Fetch alert mezzi
  const fetchAlertMezzi = useCallback(async () => {
    try {
      const { data: configData } = await supabase
        .from('app_configurazioni')
        .select('valore')
        .eq('chiave', 'soglie_alert_mezzi')
        .single();

      const soglie = configData?.valore || {
        revisione_giorni: 45,
        assicurazione_giorni: 30,
        bollo_giorni: 30,
        manutenzione_giorni: 15,
      };

      const oggi = new Date();
      let scadute = 0;
      let inScadenza = 0;

      mezzi.forEach(mezzo => {
        if (!mezzo.attivo) return;

        [
          { campo: 'scadenza_revisione', soglia: soglie.revisione_giorni },
          { campo: 'scadenza_assicurazione', soglia: soglie.assicurazione_giorni },
          { campo: 'scadenza_bollo', soglia: soglie.bollo_giorni },
          { campo: 'scadenza_manutenzione', soglia: soglie.manutenzione_giorni },
        ].forEach(({ campo, soglia }) => {
          const data = mezzo[campo];
          if (!data) return;

          const giorni = Math.ceil((new Date(data) - oggi) / (1000 * 60 * 60 * 24));
          if (giorni < 0) scadute++;
          else if (giorni <= soglia) inScadenza++;
        });
      });

      setAlertMezzi({ scadute, inScadenza });
    } catch (err) {
      console.error('Errore calcolo alert mezzi:', err);
    }
  }, [mezzi]);

  useEffect(() => {
    fetchAlertMezzi();
  }, [fetchAlertMezzi]);

  // Refresh automatico quando si torna alla pagina (focus window)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Ricarica pianificazioni e fogli quando la tab diventa visibile
        fetchPianificazioni();
      }
    };

    const handleFocus = () => {
      // Ricarica quando la finestra torna in focus
      fetchPianificazioni();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
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
            .select('*, clienti(nome_azienda), commesse(codice_commessa)')
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
            commessa_codice: foglioData.commesse?.codice_commessa,
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
    if (filterFoglio) {
      filtered = filtered.filter((p) => p.foglio_assistenza_id === filterFoglio);
    }
    if (filterDataInizio) {
      filtered = filtered.filter((p) => p.data_inizio_pianificata >= filterDataInizio);
    }
    if (filterDataFine) {
      filtered = filtered.filter((p) => p.data_fine_pianificata <= filterDataFine);
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
        title: `${commessa?.codice_commessa || 'N/A'} - ${tecniciNomi.join(', ') || 'N/A'}`,
        start,
        end,
        allDay: p.tutto_il_giorno,
        resource: p,
        // Dati per EventoPianificazione
        commessaCodice: commessa?.codice_commessa || 'N/A',
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
  }, [pianificazioni, foglioMap, clienti, tecnici, commesse, mezzi, filterTecnico, filterMezzo, filterStato, filterCommessa, filterFoglio, filterDataInizio, filterDataFine]);

  // Commesse filtrate - solo quelle con pianificazioni
  const commesseConPianificazioni = useMemo(() => {
    const commesseIds = new Set();
    Object.values(foglioMap).forEach((f) => {
      if (f.commessa_id) commesseIds.add(f.commessa_id);
    });
    return commesse
      .filter((c) => commesseIds.has(c.id))
      .sort((a, b) => (a.codice || '').localeCompare(b.codice || ''));
  }, [commesse, foglioMap]);

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
    navigate(`/fogli-assistenza/${foglioId}`);
  };

  // Handler duplicazione pianificazione
  const handleDuplicatePianificazione = (pianificazione) => {
    // Chiudi modal dettagli
    setShowModal(false);

    // Crea una copia della pianificazione senza id, created_at, updated_at
    const duplicatedData = {
      foglio_assistenza_id: pianificazione.foglio_assistenza_id,
      data_inizio_pianificata: pianificazione.data_inizio_pianificata,
      ora_inizio_pianificata: pianificazione.ora_inizio_pianificata,
      data_fine_pianificata: pianificazione.data_fine_pianificata,
      ora_fine_pianificata: pianificazione.ora_fine_pianificata,
      tutto_il_giorno: pianificazione.tutto_il_giorno,
      salta_sabato: pianificazione.salta_sabato,
      salta_domenica: pianificazione.salta_domenica,
      salta_festivi: pianificazione.salta_festivi,
      tecnici_assegnati: pianificazione.tecnici_assegnati,
      mezzo_principale_id: pianificazione.mezzo_principale_id,
      mezzi_secondari_ids: pianificazione.mezzi_secondari_ids,
      stato_pianificazione: 'Pianificata', // Reset stato a Pianificata
      descrizione: pianificazione.descrizione,
    };

    // Apri form in modalità duplicazione (come edit ma senza id)
    setPianificazioneToEdit(duplicatedData);
    setPreselectedFoglioId(pianificazione.foglio_assistenza_id);
    setShowForm(true);
  };

  // Handler drag & drop evento
  const handleEventDrop = async ({ event, start, end }) => {
    try {
      const pianificazioneId = event.resource.id;

      // Formatta date e orari
      const dataInizio = format(start, 'yyyy-MM-dd');
      const dataFine = format(end, 'yyyy-MM-dd');
      const oraInizio = format(start, 'HH:mm:ss');
      const oraFine = format(end, 'HH:mm:ss');

      // Update nel database
      const { error: updateError } = await supabase
        .from('pianificazioni')
        .update({
          data_inizio_pianificata: dataInizio,
          data_fine_pianificata: dataFine,
          ora_inizio_pianificata: event.resource.tutto_il_giorno ? null : oraInizio,
          ora_fine_pianificata: event.resource.tutto_il_giorno ? null : oraFine,
        })
        .eq('id', pianificazioneId);

      if (updateError) throw updateError;

      // Ricarica pianificazioni
      await fetchPianificazioni();
    } catch (err) {
      console.error('Errore spostamento evento:', err);
      alert(`Errore spostamento evento: ${err.message}`);
    }
  };

  // Handler resize evento
  const handleEventResize = async ({ event, start, end }) => {
    try {
      const pianificazioneId = event.resource.id;

      // Formatta date e orari
      const dataInizio = format(start, 'yyyy-MM-dd');
      const dataFine = format(end, 'yyyy-MM-dd');
      const oraInizio = format(start, 'HH:mm:ss');
      const oraFine = format(end, 'HH:mm:ss');

      // Update nel database
      const { error: updateError } = await supabase
        .from('pianificazioni')
        .update({
          data_inizio_pianificata: dataInizio,
          data_fine_pianificata: dataFine,
          ora_inizio_pianificata: event.resource.tutto_il_giorno ? null : oraInizio,
          ora_fine_pianificata: event.resource.tutto_il_giorno ? null : oraFine,
        })
        .eq('id', pianificazioneId);

      if (updateError) throw updateError;

      // Ricarica pianificazioni
      await fetchPianificazioni();
    } catch (err) {
      console.error('Errore ridimensionamento evento:', err);
      alert(`Errore ridimensionamento evento: ${err.message}`);
    }
  };

  // Commesse visibili nel calendario
  const commesseVisibili = useMemo(() => {
    const commesseIds = new Set();
    eventiCalendario.forEach((e) => {
      const foglio = foglioMap[e.resource.foglio_assistenza_id];
      if (foglio?.commessa_id) commesseIds.add(foglio.commessa_id);
    });
    return commesse.filter((c) => commesseIds.has(c.id));
  }, [eventiCalendario, foglioMap, commesse]);

  // Riepilogo stati con count
  const conteggioStati = useMemo(() => {
    const count = {
      Pianificata: 0,
      Confermata: 0,
      'In Corso': 0,
      Completata: 0,
      Cancellata: 0,
    };
    pianificazioni.forEach((p) => {
      if (count.hasOwnProperty(p.stato_pianificazione)) {
        count[p.stato_pianificazione]++;
      }
    });
    return count;
  }, [pianificazioni]);

  // Custom event style getter - Colora per commessa
  const eventStyleGetter = useCallback(
    (event) => {
      const foglioId = event.resource.foglio_assistenza_id;
      const foglio = foglioMap[foglioId];
      const commessaId = foglio?.commessa_id;

      let backgroundColor = '#6c757d'; // default grigio

      if (commessaId) {
        backgroundColor = getColorForCommessa(commessaId);
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
    },
    [foglioMap]
  );

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

        {/* Alert Mezzi */}
        {(alertMezzi.scadute > 0 || alertMezzi.inScadenza > 0) && (
          <div className="alert-mezzi-badge" style={{ marginLeft: 'auto' }}>
            <span
              onClick={() => navigate('/scadenze-mezzi')}
              style={{
                cursor: 'pointer',
                background: '#dc3545',
                color: 'white',
                padding: '8px 15px',
                borderRadius: '20px',
                fontSize: '0.9em',
                fontWeight: 'bold',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              }}
              title="Clicca per visualizzare dettagli scadenze mezzi"
            >
              ⚠️ Scadenze Mezzi:
              {alertMezzi.scadute > 0 && ` ${alertMezzi.scadute} scadute`}
              {alertMezzi.scadute > 0 && alertMezzi.inScadenza > 0 && ' • '}
              {alertMezzi.inScadenza > 0 && ` ${alertMezzi.inScadenza} in scadenza`}
            </span>
          </div>
        )}
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
            <label>Filtra per Foglio:</label>
            <select value={filterFoglio} onChange={(e) => setFilterFoglio(e.target.value)}>
              <option value="">-- Tutti --</option>
              {fogliDisponibili
                .sort((a, b) => (b.numero_foglio || '').localeCompare(a.numero_foglio || ''))
                .map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.numero_foglio} - {f.cliente_nome || 'N/A'}
                  </option>
                ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Filtra per Commessa:</label>
            <select value={filterCommessa} onChange={(e) => setFilterCommessa(e.target.value)}>
              <option value="">-- Tutte --</option>
              {commesseConPianificazioni.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codice} - {c.descrizione}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Data Inizio (da):</label>
            <input
              type="date"
              value={filterDataInizio}
              onChange={(e) => setFilterDataInizio(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9em' }}
            />
          </div>

          <div className="filter-group">
            <label>Data Fine (a):</label>
            <input
              type="date"
              value={filterDataFine}
              onChange={(e) => setFilterDataFine(e.target.value)}
              style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9em' }}
            />
          </div>
        </div>

        <div className="filter-actions">
          <button
            className="button small"
            onClick={() => {
              setFilterTecnico('');
              setFilterMezzo('');
              setFilterStato('');
              setFilterFoglio('');
              setFilterCommessa('');
              setFilterDataInizio('');
              setFilterDataFine('');
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
        <DnDCalendar
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
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          components={components}
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
            event: 'Evento',
            noEventsInRange: 'Nessuna pianificazione in questo periodo.',
            showMore: (total) => `+ Altri ${total}`,
            tomorrow: 'Domani',
            yesterday: 'Ieri',
            work_week: 'Settimana lavorativa',
          }}
          formats={{
            dateFormat: 'd',
            dayFormat: 'EEE d/M',
            weekdayFormat: 'EEE',
            monthHeaderFormat: 'MMMM yyyy',
            dayHeaderFormat: 'EEEE d MMMM yyyy',
            dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
              `${localizer.format(start, 'd MMMM', culture)} - ${localizer.format(end, 'd MMMM yyyy', culture)}`,
            agendaHeaderFormat: ({ start, end }, culture, localizer) =>
              `${localizer.format(start, 'd MMMM', culture)} - ${localizer.format(end, 'd MMMM yyyy', culture)}`,
            agendaDateFormat: 'EEE d MMM',
            agendaTimeFormat: 'HH:mm',
            agendaTimeRangeFormat: ({ start, end }, culture, localizer) =>
              `${localizer.format(start, 'HH:mm', culture)} - ${localizer.format(end, 'HH:mm', culture)}`,
          }}
          draggableAccessor={() => true}
          resizable
          onEventDrop={handleEventDrop}
          onEventResize={handleEventResize}
        />
      </div>

      {/* Legenda Commesse */}
      <LegendaColoriCalendario commesse={commesseVisibili} />

      {/* Riepilogo Stati */}
      <div
        className="calendario-stati-summary"
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '15px',
          marginTop: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 10px 0', fontSize: '1em', color: '#333' }}>Riepilogo Stati:</h3>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <span
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.9em',
              fontWeight: '500',
            }}
          >
            Pianificata: {conteggioStati['Pianificata']}
          </span>
          <span
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.9em',
              fontWeight: '500',
            }}
          >
            Confermata: {conteggioStati['Confermata']}
          </span>
          <span
            style={{
              backgroundColor: '#ffc107',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.9em',
              fontWeight: '500',
            }}
          >
            In Corso: {conteggioStati['In Corso']}
          </span>
          <span
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.9em',
              fontWeight: '500',
            }}
          >
            Completata: {conteggioStati['Completata']}
          </span>
          <span
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '0.9em',
              fontWeight: '500',
            }}
          >
            Cancellata: {conteggioStati['Cancellata']}
          </span>
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
          onDuplicate={handleDuplicatePianificazione}
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
              fogliDisponibili={fogliDisponibili}
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
