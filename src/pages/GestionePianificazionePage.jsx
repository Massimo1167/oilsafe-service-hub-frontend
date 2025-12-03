import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, endOfWeek, startOfMonth, endOfMonth, getDay } from 'date-fns';
import { it } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import { supabase } from '../supabaseClient';
import EventoPianificazione from '../components/EventoPianificazione';
import ModalDettagliPianificazione from '../components/ModalDettagliPianificazione';
import PianificazioneForm from '../components/PianificazioneForm';
import AgendaView from '../components/calendario/AgendaView';
import './GestionePianificazionePage.css';
import './CalendarioPianificazioniOperatoriPage.css';
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
 * Pagina principale gestione pianificazioni interventi
 * Mostra calendario con pianificazioni future, permette creazione/modifica/eliminazione (manager/admin)
 * o visualizzazione read-only (user)
 * Filtraggio per tecnico, mezzo, stato, commessa
 */
function GestionePianificazionePage({ session, clienti, tecnici, commesse, mezzi, userRole }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Modalità read-only per utenti 'user'
  const isReadOnly = userRole === 'user';

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

  // Sincronizza filtri data con il range visibile del calendario (solo per viste Mese/Settimana/Giorno)
  // In modalità Agenda, preserva i valori inseriti manualmente dall'utente
  useEffect(() => {
    if (view === 'agenda') {
      // Non modificare i filtri in modalità Agenda - mantieni gli ultimi valori utilizzati
      return;
    }

    // Per viste Mese/Settimana/Giorno: calcola il range temporale visibile e aggiorna i filtri
    let rangeStart, rangeEnd;

    if (view === 'month') {
      rangeStart = startOfMonth(currentDate);
      rangeEnd = endOfMonth(currentDate);
    } else if (view === 'week') {
      rangeStart = startOfWeek(currentDate, { locale: it });
      rangeEnd = endOfWeek(currentDate, { locale: it });
    } else if (view === 'day') {
      rangeStart = currentDate;
      rangeEnd = currentDate;
    }

    // Aggiorna i filtri data per riflettere il periodo visualizzato
    if (rangeStart && rangeEnd) {
      setFilterDataInizio(format(rangeStart, 'yyyy-MM-dd'));
      setFilterDataFine(format(rangeEnd, 'yyyy-MM-dd'));
    }
  }, [view, currentDate]);

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

      // Fetch fogli associati (filtra null per pianificazioni dirette con commessa)
      const foglioIds = [...new Set(pianiData.map((p) => p.foglio_assistenza_id).filter(id => id !== null))];
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

  // Gestisce query param foglioId per apertura diretta form o filtro
  useEffect(() => {
    const foglioIdParam = searchParams.get('foglioId');
    if (foglioIdParam && !showForm && pianificazioni.length > 0) {
      // Verifica se esistono pianificazioni per questo foglio
      const pianificazioniFoglio = pianificazioni.filter(
        p => p.foglio_assistenza_id === foglioIdParam
      );

      if (pianificazioniFoglio.length === 0) {
        // Nessuna pianificazione esistente → Apri form creazione con pre-compilazione
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
              assegnato_a_user_id: foglioData.assegnato_a_user_id, // Per pre-compilare il tecnico
            });
            setShowForm(true);
          } catch (err) {
            console.error('Errore:', err);
            setSearchParams({});
          }
        };

        loadFoglioForPianificazione();
      } else {
        // Esistono pianificazioni → Applica filtro per mostrare solo quelle di questo foglio
        setFilterFoglio(foglioIdParam);
        // Opzionalmente, scorri verso il calendario per mostrare le pianificazioni
      }
    }
  }, [searchParams, showForm, pianificazioni, setSearchParams]);

  // Gestisce query params 'tecnico' e 'data' dalla Programmazione Settimanale
  useEffect(() => {
    const tecnicoParam = searchParams.get('tecnico');
    const dataParam = searchParams.get('data');

    if (tecnicoParam && dataParam && !showForm) {
      // Apri form con dati precompilati da Programmazione Settimanale
      const tecnicoId = tecnicoParam;
      const dataInizio = dataParam; // Formato yyyy-MM-dd

      // Pre-seleziona tecnico e data per il form
      setPianificazioneToEdit({
        tecnici_assegnati: [tecnicoId],
        data_inizio_pianificata: dataInizio,
        data_fine_pianificata: dataInizio,
        stato_pianificazione: 'Pianificata'
      });
      setShowForm(true);

      // Rimuovi parametri dall'URL dopo averli processati
      setSearchParams({});
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
        // Controlla sia campo diretto che campo del foglio
        const commessaId = p.commessa_id || foglio?.commessa_id;
        return commessaId === filterCommessa;
      });
    }
    if (filterFoglio) {
      filtered = filtered.filter((p) => p.foglio_assistenza_id === filterFoglio);
    }

    // Filtri data: applicare SEMPRE (sincronizzati automaticamente con il range visibile)
    if (filterDataInizio) {
      filtered = filtered.filter((p) => p.data_inizio_pianificata >= filterDataInizio);
    }
    if (filterDataFine) {
      filtered = filtered.filter((p) => p.data_fine_pianificata <= filterDataFine);
    }

    // Trasforma in eventi
    return filtered.map((p) => {
      const foglio = foglioMap[p.foglio_assistenza_id] || {};
      // Usa campi diretti con fallback ai campi del foglio
      const commessaId = p.commessa_id || foglio.commessa_id;
      const clienteId = p.cliente_id || foglio.cliente_id;
      const cliente = clienti.find((c) => c.id === clienteId);
      const commessa = commesse.find((c) => c.id === commessaId);

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
        resource: {
          // Campi per AgendaView (compatibili con CalendarioPianificazioniOperatoriPage)
          id: p.id,
          numero_foglio: foglio.numero_foglio,
          stato_pianificazione: p.stato_pianificazione,
          tecnico_id: p.tecnici_assegnati?.[0],
          tecnico_nome: tecniciNomi.join(', '),
          commessa_id: p.commessa_id,
          commessa_codice: commessa?.codice_commessa,
          commessa_descrizione: commessa?.descrizione,
          cliente_id: p.cliente_id,
          cliente_nome: cliente?.nome_azienda,
          foglio_id: p.foglio_assistenza_id,
          mezzo_principale_id: p.mezzo_principale_id,
          // Dati completi pianificazione (per modal e altri componenti)
          ...p,
        },
        // Mantieni campi legacy a livello radice per compatibilità con EventoPianificazione
        commessaCodice: commessa?.codice_commessa || 'N/A',
        tecniciNomi,
        statoPianificazione: p.stato_pianificazione,
        mezzoTarga,
        numeroFoglio: foglio.numero_foglio,
        clienteNome: cliente?.nome_azienda || 'N/A',
        commessaDescrizione: commessa?.descrizione || '',
      };
    });
  }, [pianificazioni, foglioMap, clienti, tecnici, commesse, mezzi, filterTecnico, filterMezzo, filterStato, filterCommessa, filterFoglio, filterDataInizio, filterDataFine, view]);

  // Commesse filtrate - solo quelle con pianificazioni
  const commesseConPianificazioni = useMemo(() => {
    const commesseIds = new Set();
    // Aggiungi commesse dai fogli
    Object.values(foglioMap).forEach((f) => {
      if (f.commessa_id) commesseIds.add(f.commessa_id);
    });
    // Aggiungi commesse dirette dalle pianificazioni
    pianificazioni.forEach((p) => {
      if (p.commessa_id) commesseIds.add(p.commessa_id);
    });
    return commesse
      .filter((c) => commesseIds.has(c.id))
      .sort((a, b) => (a.codice || '').localeCompare(b.codice || ''));
  }, [commesse, foglioMap, pianificazioni]);

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

      // Dati aggiornati
      const updatedData = {
        data_inizio_pianificata: dataInizio,
        data_fine_pianificata: dataFine,
        ora_inizio_pianificata: event.resource.tutto_il_giorno ? null : oraInizio,
        ora_fine_pianificata: event.resource.tutto_il_giorno ? null : oraFine,
      };

      // Update nel database
      const { error: updateError } = await supabase
        .from('pianificazioni')
        .update(updatedData)
        .eq('id', pianificazioneId);

      if (updateError) throw updateError;

      // Aggiorna stato locale SENZA refresh completo
      setPianificazioni((prevPianificazioni) =>
        prevPianificazioni.map((p) =>
          p.id === pianificazioneId
            ? { ...p, ...updatedData }
            : p
        )
      );
    } catch (err) {
      console.error('Errore spostamento evento:', err);
      alert(`Errore spostamento evento: ${err.message}`);
      // In caso di errore, ricarica per sicurezza
      await fetchPianificazioni();
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

      // Dati aggiornati
      const updatedData = {
        data_inizio_pianificata: dataInizio,
        data_fine_pianificata: dataFine,
        ora_inizio_pianificata: event.resource.tutto_il_giorno ? null : oraInizio,
        ora_fine_pianificata: event.resource.tutto_il_giorno ? null : oraFine,
      };

      // Update nel database
      const { error: updateError } = await supabase
        .from('pianificazioni')
        .update(updatedData)
        .eq('id', pianificazioneId);

      if (updateError) throw updateError;

      // Aggiorna stato locale SENZA refresh completo
      setPianificazioni((prevPianificazioni) =>
        prevPianificazioni.map((p) =>
          p.id === pianificazioneId
            ? { ...p, ...updatedData }
            : p
        )
      );
    } catch (err) {
      console.error('Errore ridimensionamento evento:', err);
      alert(`Errore ridimensionamento evento: ${err.message}`);
      // In caso di errore, ricarica per sicurezza
      await fetchPianificazioni();
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
        {!isReadOnly && (
          <button className="button" onClick={handleNuovaPianificazione}>
            + Nuova Pianificazione
          </button>
        )}
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
        {/* RIGA 1: Foglio (doppio), Tecnico, Mezzo (4 colonne) */}
        <div className="filter-row-quad">
          <div className="filter-group filter-group-double">
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
        </div>

        {/* RIGA 2: Stato, Commessa, Data Inizio, Data Fine (4 colonne) */}
        <div className="filter-row-quad">
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
              {commesseConPianificazioni.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.codice_commessa} - {c.descrizione}
                </option>
              ))}
            </select>
          </div>

          {/* Filtri Data - Sempre visibili, sincronizzati automaticamente con la vista */}
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

        {/* Pulsante reset */}
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

      {/* Toolbar Calendario - Navigazione e Selezione Vista */}
      <div className="calendario-custom-toolbar" style={{
        background: 'white',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '15px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '15px'
      }}>
        {/* Navigazione */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="button secondary"
            onClick={() => {
              const newDate = new Date(currentDate);
              if (view === 'month') {
                newDate.setMonth(newDate.getMonth() - 1);
              } else if (view === 'week' || view === 'agenda') {
                newDate.setDate(newDate.getDate() - 7);
              } else if (view === 'day') {
                newDate.setDate(newDate.getDate() - 1);
              }
              setCurrentDate(newDate);
            }}
          >
            ‹ Precedente
          </button>
          <button
            className="button secondary"
            onClick={() => setCurrentDate(new Date())}
          >
            Oggi
          </button>
          <button
            className="button secondary"
            onClick={() => {
              const newDate = new Date(currentDate);
              if (view === 'month') {
                newDate.setMonth(newDate.getMonth() + 1);
              } else if (view === 'week' || view === 'agenda') {
                newDate.setDate(newDate.getDate() + 7);
              } else if (view === 'day') {
                newDate.setDate(newDate.getDate() + 1);
              }
              setCurrentDate(newDate);
            }}
          >
            Successivo ›
          </button>
          <span style={{ marginLeft: '15px', fontWeight: '600', fontSize: '1.1em' }}>
            {format(currentDate, view === 'month' ? 'MMMM yyyy' : 'dd MMMM yyyy', { locale: it })}
          </span>
        </div>

        {/* Selettore Vista */}
        <div style={{ display: 'flex', gap: '5px' }}>
          <button
            className={`button ${view === 'month' ? 'primary' : 'secondary'}`}
            onClick={() => setView('month')}
          >
            Mese
          </button>
          <button
            className={`button ${view === 'week' ? 'primary' : 'secondary'}`}
            onClick={() => setView('week')}
          >
            Settimana
          </button>
          <button
            className={`button ${view === 'day' ? 'primary' : 'secondary'}`}
            onClick={() => setView('day')}
          >
            Giorno
          </button>
          <button
            className={`button ${view === 'agenda' ? 'primary' : 'secondary'}`}
            onClick={() => setView('agenda')}
          >
            Agenda
          </button>
        </div>
      </div>

      {/* Calendario o AgendaView personalizzata */}
      <div className="calendario-container">
        {view === 'agenda' ? (
          <AgendaView
            events={eventiCalendario}
            date={currentDate}
            onSelectEvent={handleSelectEvent}
            getEventColor={(event) => {
              const commessaId = event.resource?.commessa_id;
              return commessaId ? getColorForCommessa(commessaId) : '#6c757d';
            }}
          />
        ) : (
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
            toolbar={false}
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
            draggableAccessor={() => !isReadOnly}
            resizable={!isReadOnly}
            onEventDrop={!isReadOnly ? handleEventDrop : undefined}
            onEventResize={!isReadOnly ? handleEventResize : undefined}
          />
        )}
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
          onEdit={!isReadOnly ? handleEditPianificazione : undefined}
          onDelete={!isReadOnly ? handleDeletePianificazione : undefined}
          onChangeState={!isReadOnly ? handleChangeState : undefined}
          onNavigateToFoglio={handleNavigateToFoglio}
          onDuplicate={!isReadOnly ? handleDuplicatePianificazione : undefined}
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
              commesse={commesse}
              clienti={clienti}
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

GestionePianificazionePage.propTypes = {
  session: PropTypes.object.isRequired,
  clienti: PropTypes.array.isRequired,
  tecnici: PropTypes.array.isRequired,
  commesse: PropTypes.array.isRequired,
  mezzi: PropTypes.array.isRequired,
  userRole: PropTypes.string.isRequired,
};

export default GestionePianificazionePage;
