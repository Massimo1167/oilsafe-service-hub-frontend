import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { getColorForCommessa } from '../utils/calendarioColors';
import { formatNumeroFoglio } from '../utils/formatters';
import './ProgrammazioneSettimanalePage.css';

/**
 * Pagina Programmazione Settimanale
 * - Vista tabellare stile Excel (righe=tecnici, colonne=giorni)
 * - Click su cella vuota → crea pianificazione rapida
 * - Click su evento → mostra dettagli/modifica
 * - Navigazione settimana per settimana
 * - FUTURO: Drag & drop per spostare pianificazioni (PHASE 4)
 */
function ProgrammazioneSettimanalePage({ user, userRole, tecnici, commesse, clienti, reparti }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pianificazioni, setPianificazioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterReparto, setFilterReparto] = useState('');

  // Calcola inizio e fine settimana (Lunedì-Domenica)
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1, locale: it }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1, locale: it }), [currentDate]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  // Filtra tecnici per reparto
  const tecniciVisibili = useMemo(() => {
    if (!filterReparto) return tecnici;
    return tecnici.filter(t => t.reparto_id === filterReparto);
  }, [tecnici, filterReparto]);

  // Fetch pianificazioni per la settimana corrente
  useEffect(() => {
    const fetchPianificazioni = async () => {
      try {
        setLoading(true);
        setError(null);

        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

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
            descrizione,
            fogli_assistenza (
              id,
              numero_foglio,
              cliente_id,
              commessa_id
            )
          `)
          .lte('data_inizio_pianificata', weekEndStr)
          .gte('data_fine_pianificata', weekStartStr)
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
    };

    fetchPianificazioni();
  }, [weekStart, weekEnd]);

  // Organizza pianificazioni per tecnico e giorno
  const pianificazioniPerTecnicoGiorno = useMemo(() => {
    const organized = {};

    // Inizializza struttura per ogni tecnico
    tecniciVisibili.forEach(tecnico => {
      organized[tecnico.id] = { tecnico, giorni: {} };
      weekDays.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        organized[tecnico.id].giorni[dayKey] = [];
      });
    });

    // Distribuisci pianificazioni nei giorni appropriati
    pianificazioni.forEach(p => {
      if (!p.tecnici_assegnati || p.tecnici_assegnati.length === 0) return;

      const dataInizio = new Date(p.data_inizio_pianificata + 'T00:00:00');
      const dataFine = new Date(p.data_fine_pianificata + 'T23:59:59');

      // Trova commessa (da foglio o diretta)
      const commessaId = p.commessa_id || p.fogli_assistenza?.commessa_id;
      const commessa = commesse?.find(c => c.id === commessaId);

      // Trova cliente (da foglio o diretta)
      const clienteId = p.cliente_id || p.fogli_assistenza?.cliente_id;
      const cliente = clienti?.find(cl => cl.id === clienteId);

      // Crea oggetto evento
      const evento = {
        id: p.id,
        foglio_id: p.foglio_assistenza_id,
        numero_foglio: p.fogli_assistenza?.numero_foglio,
        commessa_id: commessaId,
        commessa_codice: commessa?.codice_commessa,
        commessa_descrizione: commessa?.descrizione,
        cliente_id: clienteId,
        cliente_nome: cliente?.ragione_sociale,
        stato: p.stato_pianificazione,
        descrizione: p.descrizione,
        data_inizio: p.data_inizio_pianificata,
        data_fine: p.data_fine_pianificata,
      };

      // Assegna evento a ogni tecnico e giorno nel periodo
      p.tecnici_assegnati.forEach(tecnicoId => {
        if (!organized[tecnicoId]) return;

        weekDays.forEach(day => {
          const dayKey = format(day, 'yyyy-MM-dd');
          // Verifica se il giorno è nel periodo della pianificazione
          if (day >= dataInizio && day <= dataFine) {
            organized[tecnicoId].giorni[dayKey].push(evento);
          }
        });
      });
    });

    return organized;
  }, [pianificazioni, tecniciVisibili, weekDays, commesse, clienti]);

  // Handlers navigazione settimana
  const handlePrevWeek = () => {
    setCurrentDate(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentDate(prev => addDays(prev, 7));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Handler click su cella (futuro: creazione rapida pianificazione)
  const handleCellClick = (tecnicoId, dayKey) => {
    // TODO PHASE 3: Aprire form creazione rapida pianificazione
    console.log('Cell clicked:', tecnicoId, dayKey);
    alert(`Funzionalità in sviluppo: Crea pianificazione per tecnico ${tecnicoId} il ${dayKey}`);
  };

  // State per drag & drop
  const [draggedEvento, setDraggedEvento] = useState(null);

  // Handler click su evento
  const handleEventClick = (evento) => {
    // TODO PHASE 3: Aprire modal dettagli/modifica
    console.log('Event clicked:', evento);
    alert(`Dettagli pianificazione: ${evento.commessa_codice || 'N/A'} - Foglio #${evento.numero_foglio || 'N/A'}`);
  };

  // Drag & Drop handlers
  const handleDragStart = (e, evento) => {
    e.stopPropagation();
    setDraggedEvento(evento);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, tecnicoId, dayKey) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedEvento) return;

    try {
      // Calcola nuove date basate sul drop
      const dataInizioOriginale = new Date(draggedEvento.data_inizio);
      const dataFineOriginale = new Date(draggedEvento.data_fine);
      const durataGiorni = Math.ceil((dataFineOriginale - dataInizioOriginale) / (1000 * 60 * 60 * 24));

      const nuovaDataInizio = new Date(dayKey);
      const nuovaDataFine = new Date(dayKey);
      nuovaDataFine.setDate(nuovaDataFine.getDate() + durataGiorni);

      // Prepara update: aggiorna tecnici_assegnati e date
      const updates = {
        tecnici_assegnati: [tecnicoId],
        data_inizio_pianificata: format(nuovaDataInizio, 'yyyy-MM-dd'),
        data_fine_pianificata: format(nuovaDataFine, 'yyyy-MM-dd'),
      };

      // Esegui update su database
      const { error: updateError } = await supabase
        .from('pianificazioni')
        .update(updates)
        .eq('id', draggedEvento.id);

      if (updateError) throw updateError;

      // Ricarica pianificazioni
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

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
          descrizione,
          fogli_assistenza (
            id,
            numero_foglio,
            cliente_id,
            commessa_id
          )
        `)
        .lte('data_inizio_pianificata', weekEndStr)
        .gte('data_fine_pianificata', weekStartStr)
        .in('stato_pianificazione', ['Pianificata', 'Confermata', 'In Corso'])
        .order('data_inizio_pianificata', { ascending: true });

      if (fetchError) throw fetchError;

      setPianificazioni(data || []);
      setDraggedEvento(null);
    } catch (err) {
      console.error('Errore nello spostamento pianificazione:', err);
      alert('Impossibile spostare la pianificazione. Riprova.');
      setDraggedEvento(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedEvento(null);
  };

  // Render evento nella cella
  const renderEvento = (evento) => {
    const backgroundColor = getColorForCommessa(evento.commessa_id);
    const numeroFoglioAbbreviato = formatNumeroFoglio(evento.numero_foglio);

    return (
      <div
        key={evento.id}
        className="programmazione-evento"
        draggable={true}
        onDragStart={(e) => handleDragStart(e, evento)}
        onDragEnd={handleDragEnd}
        style={{ backgroundColor, cursor: 'move' }}
        onClick={(e) => {
          e.stopPropagation();
          handleEventClick(evento);
        }}
        title={`${evento.commessa_codice || 'N/A'} - ${evento.cliente_nome || 'N/A'} (trascina per spostare)`}
      >
        <div className="evento-codice">{evento.commessa_codice || 'N/A'}</div>
        {evento.numero_foglio && <div className="evento-foglio">#{numeroFoglioAbbreviato}</div>}
      </div>
    );
  };

  return (
    <div className="programmazione-settimanale-page">
      <div className="programmazione-container">
        {/* Header */}
        <div className="programmazione-header">
          <h1>Programmazione Settimanale</h1>
          <p className="programmazione-subtitle">
            Pianifica gli interventi per ogni tecnico durante la settimana
          </p>
        </div>

        {/* Toolbar Navigazione */}
        <div className="programmazione-toolbar">
          <div className="programmazione-nav">
            <button className="button secondary" onClick={handlePrevWeek}>◀ Settimana Precedente</button>
            <button className="button primary" onClick={handleToday}>Oggi</button>
            <button className="button secondary" onClick={handleNextWeek}>Settimana Successiva ▶</button>
          </div>
          <div className="programmazione-label">
            <h2>
              {format(weekStart, 'dd MMM', { locale: it })} - {format(weekEnd, 'dd MMM yyyy', { locale: it })}
            </h2>
          </div>
        </div>

        {/* Filtro Reparto */}
        {reparti && reparti.length > 0 && (
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
            <label htmlFor="filterRepartoProgSettimanale" style={{ marginRight: '10px', fontWeight: 'bold' }}>
              Filtra per Reparto:
            </label>
            <select
              id="filterRepartoProgSettimanale"
              value={filterReparto}
              onChange={(e) => setFilterReparto(e.target.value)}
              style={{ padding: '8px', minWidth: '250px', fontSize: '1em' }}
            >
              <option value="">Tutti i reparti ({tecnici.length} tecnici)</option>
              {reparti.map(r => (
                <option key={r.id} value={r.id}>
                  {r.codice} - {r.descrizione}
                </option>
              ))}
            </select>
            {filterReparto && (
              <span style={{ marginLeft: '15px', color: '#666' }}>
                {tecniciVisibili.length} tecnici visualizzati
              </span>
            )}
          </div>
        )}

        {/* Loading/Error States */}
        {loading && (
          <div className="loading-message">Caricamento pianificazioni...</div>
        )}

        {error && (
          <div className="error-message">{error}</div>
        )}

        {/* Tabella Programmazione */}
        {!loading && !error && (
          <div className="programmazione-table-wrapper">
            <table className="programmazione-table">
              <thead>
                <tr>
                  <th className="tecnico-column">Tecnico</th>
                  {weekDays.map(day => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <th key={format(day, 'yyyy-MM-dd')} className={isToday ? 'today-column' : ''}>
                        <div className="day-header">
                          <div className="day-name">{format(day, 'EEEE', { locale: it })}</div>
                          <div className="day-date">{format(day, 'dd/MM')}</div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {tecniciVisibili.map(tecnico => {
                  const tecnicoData = pianificazioniPerTecnicoGiorno[tecnico.id];
                  if (!tecnicoData) return null;

                  return (
                    <tr key={tecnico.id}>
                      <td className="tecnico-cell">
                        <div className="tecnico-nome">
                          {tecnico.nome} {tecnico.cognome}
                        </div>
                      </td>
                      {weekDays.map(day => {
                        const dayKey = format(day, 'yyyy-MM-dd');
                        const eventi = tecnicoData.giorni[dayKey] || [];
                        const isToday = isSameDay(day, new Date());

                        return (
                          <td
                            key={dayKey}
                            className={`day-cell ${isToday ? 'today-cell' : ''} ${eventi.length === 0 ? 'empty-cell' : ''} ${draggedEvento ? 'drop-target' : ''}`}
                            onClick={() => eventi.length === 0 && handleCellClick(tecnico.id, dayKey)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, tecnico.id, dayKey)}
                          >
                            {eventi.length > 0 ? (
                              <div className="eventi-container">
                                {eventi.map(evento => renderEvento(evento))}
                              </div>
                            ) : (
                              <div className="empty-placeholder">+</div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {tecnici.length === 0 && (
              <div className="empty-state">
                <p>Nessun tecnico disponibile. Aggiungi tecnici dalle Anagrafiche.</p>
              </div>
            )}
          </div>
        )}

        {/* Legenda */}
        <div className="programmazione-legenda">
          <h3>Legenda</h3>
          <div className="legenda-items">
            <div className="legenda-item">
              <span className="legenda-icon empty-icon">+</span>
              <span>Click per creare pianificazione</span>
            </div>
            <div className="legenda-item">
              <span className="legenda-icon event-icon" style={{ backgroundColor: '#4CAF50' }}>COD</span>
              <span>Trascina evento per spostarlo (tecnico/data)</span>
            </div>
            <div className="legenda-item">
              <span className="legenda-icon event-icon" style={{ backgroundColor: '#2196F3' }}>COD</span>
              <span>Click su evento per dettagli/modifica</span>
            </div>
            <div className="legenda-item">
              <span className="legenda-icon today-icon"></span>
              <span>Colonna evidenziata = oggi</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProgrammazioneSettimanalePage;
