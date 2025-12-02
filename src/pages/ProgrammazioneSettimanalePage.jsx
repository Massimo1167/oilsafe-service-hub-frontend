import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import { getColorForCommessa } from '../utils/calendarioColors';
import { formatNumeroFoglio } from '../utils/formatters';
import { generatePianificazionePDF } from '../utils/pdfGeneratorPianificazione';
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
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [pianificazioni, setPianificazioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterReparti, setFilterReparti] = useState([]); // Array di ID reparti selezionati
  const [filterTipoRisorsa, setFilterTipoRisorsa] = useState('tutte'); // 'tutte' | 'con_pianificazioni'
  const [pdfOrientamento, setPdfOrientamento] = useState('landscape'); // 'landscape' | 'portrait'

  // State per preview PDF
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Calcola inizio e fine settimana (Lunedì-Domenica)
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1, locale: it }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1, locale: it }), [currentDate]);
  const weekDays = useMemo(() => eachDayOfInterval({ start: weekStart, end: weekEnd }), [weekStart, weekEnd]);

  // Filtra tecnici per: abilitazione pianificazione + reparti + tipo risorsa
  const tecniciVisibili = useMemo(() => {
    // 1. Filtra solo tecnici abilitati alla pianificazione
    let filtered = tecnici.filter(t => t.abilitato_pianificazione !== false);

    // 2. Filtra per reparti (logica OR: mostra se appartiene ad ALMENO UNO dei reparti selezionati)
    if (filterReparti.length > 0) {
      filtered = filtered.filter(t => filterReparti.includes(t.reparto_id));
    }

    return filtered;
  }, [tecnici, filterReparti]);

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

  // Filtra tecnici finali in base al tipo risorsa (dopo aver organizzato le pianificazioni)
  const tecniciFinali = useMemo(() => {
    if (filterTipoRisorsa === 'con_pianificazioni') {
      // Mostra solo tecnici che hanno almeno una pianificazione nella settimana corrente
      return tecniciVisibili.filter(tecnico => {
        const tecnicoData = pianificazioniPerTecnicoGiorno[tecnico.id];
        if (!tecnicoData) return false;

        // Verifica se ha almeno un evento in almeno un giorno
        return weekDays.some(day => {
          const dayKey = format(day, 'yyyy-MM-dd');
          return tecnicoData.giorni[dayKey]?.length > 0;
        });
      });
    }
    return tecniciVisibili; // 'tutte' - mostra tutti i tecnici abilitati
  }, [tecniciVisibili, filterTipoRisorsa, pianificazioniPerTecnicoGiorno, weekDays]);

  // Handler per toggle checkbox reparti
  const handleToggleReparto = (repartoId) => {
    setFilterReparti(prev => {
      if (prev.includes(repartoId)) {
        // Rimuovi se già presente
        return prev.filter(id => id !== repartoId);
      } else {
        // Aggiungi se non presente
        return [...prev, repartoId];
      }
    });
  };

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

  // Handler click su cella: reindirizza a calendario con dati precompilati
  const handleCellClick = (tecnicoId, dayKey) => {
    // Reindirizza a calendario pianificazioni con parametri precompilati
    const params = new URLSearchParams({
      tecnico: tecnicoId,
      data: dayKey
    });
    navigate(`/calendario-pianificazioni?${params.toString()}`);
  };

  // Handler preview PDF
  const handlePreviewPDF = () => {
    setPreviewLoading(true);

    try {
      const result = generatePianificazionePDF({
        weekStart,
        weekEnd,
        weekDays,
        tecniciFinali,
        pianificazioniPerTecnicoGiorno,
        orientamento: pdfOrientamento,
        preview: true  // Modalità preview
      });

      if (result.success) {
        setPreviewPdfUrl(result.dataUrl);
        setShowPreview(true);
      } else {
        alert(`Errore nell'anteprima del PDF: ${result.error}`);
      }
    } catch (error) {
      console.error('Errore preview PDF:', error);
      alert('Impossibile generare l\'anteprima PDF');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handler stampa PDF
  const handlePrintPDF = () => {
    const result = generatePianificazionePDF({
      weekStart,
      weekEnd,
      weekDays,
      tecniciFinali,
      pianificazioniPerTecnicoGiorno,
      orientamento: pdfOrientamento
    });

    if (!result.success) {
      alert(`Errore nella generazione del PDF: ${result.error}`);
    }
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '0.85em', fontWeight: 'bold' }}>Orientamento PDF:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="pdfOrientamento"
                    value="landscape"
                    checked={pdfOrientamento === 'landscape'}
                    onChange={(e) => setPdfOrientamento(e.target.value)}
                  />
                  <span style={{ fontSize: '0.9em' }}>Orizzontale</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="pdfOrientamento"
                    value="portrait"
                    checked={pdfOrientamento === 'portrait'}
                    onChange={(e) => setPdfOrientamento(e.target.value)}
                  />
                  <span style={{ fontSize: '0.9em' }}>Verticale</span>
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="button secondary"
                onClick={handlePreviewPDF}
                disabled={previewLoading || tecniciFinali.length === 0}
                style={{ height: 'fit-content' }}
              >
                {previewLoading ? 'Caricamento...' : '👁️ Anteprima PDF'}
              </button>
              <button
                className="button"
                onClick={handlePrintPDF}
                disabled={tecniciFinali.length === 0}
                style={{ height: 'fit-content' }}
              >
                🖨️ Stampa PDF
              </button>
            </div>
          </div>
        </div>

        {/* Filtri: Tipo Risorsa e Reparti */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '5px' }}>
          {/* Filtro Tipo Risorsa */}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="filterTipoRisorsa" style={{ marginRight: '10px', fontWeight: 'bold' }}>
              Mostra Risorse:
            </label>
            <select
              id="filterTipoRisorsa"
              value={filterTipoRisorsa}
              onChange={(e) => setFilterTipoRisorsa(e.target.value)}
              style={{ padding: '8px', minWidth: '300px', fontSize: '1em' }}
            >
              <option value="tutte">Tutte le risorse abilitate alla pianificazione</option>
              <option value="con_pianificazioni">Solo risorse con pianificazioni nella settimana corrente</option>
            </select>
          </div>

          {/* Filtro Reparti (Checkboxes multiple) */}
          {reparti && reparti.length > 0 && (
            <div>
              <label style={{ fontWeight: 'bold', marginBottom: '8px', display: 'block' }}>
                Filtra per Reparti: {filterReparti.length > 0 && `(${filterReparti.length} selezionati)`}
              </label>
              <div className="reparti-checkbox-group">
                {reparti.map(r => (
                  <label key={r.id} className="reparto-checkbox-item">
                    <input
                      type="checkbox"
                      checked={filterReparti.includes(r.id)}
                      onChange={() => handleToggleReparto(r.id)}
                    />
                    <span>{r.codice}</span>
                  </label>
                ))}
              </div>
              <small style={{ display: 'block', marginTop: '8px', color: '#666' }}>
                {filterReparti.length === 0
                  ? `Nessun filtro reparto attivo - Mostrati ${tecniciFinali.length} tecnici`
                  : `Tecnici di ${filterReparti.length} reparto/i - Mostrati ${tecniciFinali.length} tecnici`
                }
              </small>
            </div>
          )}
        </div>

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
                {tecniciFinali.map(tecnico => {
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

        {/* Modal Preview PDF */}
        {showPreview && previewPdfUrl && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 9999,
              padding: '20px'
            }}
          >
            {/* Header Modal con pulsanti */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '15px',
                color: 'white'
              }}
            >
              <h2 style={{ margin: 0, fontSize: '1.5rem' }}>
                Anteprima Programmazione Settimanale
              </h2>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="button"
                  onClick={() => {
                    const iframe = document.querySelector('#preview-iframe');
                    if (iframe) {
                      iframe.contentWindow.print();
                    }
                  }}
                  style={{ backgroundColor: '#007bff' }}
                >
                  🖨️ Stampa
                </button>
                <button
                  className="button secondary"
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewPdfUrl(null);
                  }}
                  style={{ backgroundColor: '#6c757d' }}
                >
                  ✕ Chiudi
                </button>
              </div>
            </div>

            {/* Iframe PDF */}
            <iframe
              id="preview-iframe"
              src={previewPdfUrl}
              title="Anteprima PDF Programmazione"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: 'white'
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ProgrammazioneSettimanalePage;
