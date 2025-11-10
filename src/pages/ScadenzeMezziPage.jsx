import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import './ScadenzeMezziPage.css';

function ScadenzeMezziPage({ session }) {
  const navigate = useNavigate();
  const [mezzi, setMezzi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [soglie, setSoglie] = useState({
    revisione_giorni: 45,
    assicurazione_giorni: 30,
    bollo_giorni: 30,
    manutenzione_giorni: 15,
  });

  const userRole = (session?.user?.role || '').trim().toLowerCase();
  const canAccess = userRole === 'admin' || userRole === 'manager';

  useEffect(() => {
    if (!canAccess) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Carica soglie
        const { data: configData } = await supabase
          .from('app_configurazioni')
          .select('valore')
          .eq('chiave', 'soglie_alert_mezzi')
          .single();

        if (configData?.valore) {
          setSoglie(configData.valore);
        }

        // Carica mezzi attivi
        const { data: mezziData, error: mezziError } = await supabase
          .from('mezzi_trasporto')
          .select('*')
          .eq('attivo', true)
          .order('targa');

        if (mezziError) throw mezziError;
        setMezzi(mezziData || []);
      } catch (err) {
        console.error('Errore caricamento dati:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [canAccess]);

  // Calcola tutte le scadenze con status
  const scadenzeConStatus = useMemo(() => {
    const oggi = new Date();
    const risultati = [];

    mezzi.forEach(mezzo => {
      [
        { tipo: 'Revisione', campo: 'scadenza_revisione', soglia: soglie.revisione_giorni },
        { tipo: 'Assicurazione', campo: 'scadenza_assicurazione', soglia: soglie.assicurazione_giorni },
        { tipo: 'Bollo', campo: 'scadenza_bollo', soglia: soglie.bollo_giorni },
        { tipo: 'Manutenzione', campo: 'scadenza_manutenzione', soglia: soglie.manutenzione_giorni },
      ].forEach(({ tipo, campo, soglia }) => {
        const dataScadenza = mezzo[campo];
        if (!dataScadenza) return;

        const dataObj = new Date(dataScadenza);
        const giorni = Math.ceil((dataObj - oggi) / (1000 * 60 * 60 * 24));

        let status = 'ok';
        if (giorni < 0) status = 'scaduto';
        else if (giorni <= soglia) status = 'warning';

        if (status !== 'ok') {
          risultati.push({
            mezzo_id: mezzo.id,
            targa: mezzo.targa,
            tipo_mezzo: mezzo.tipo_mezzo,
            tipo_scadenza: tipo,
            data: dataScadenza,
            dataObj,
            giorni,
            status,
            soglia,
          });
        }
      });
    });

    return risultati.sort((a, b) => a.giorni - b.giorni);
  }, [mezzi, soglie]);

  const scadute = scadenzeConStatus.filter(s => s.status === 'scaduto');
  const inScadenza = scadenzeConStatus.filter(s => s.status === 'warning');

  if (!canAccess) {
    return (
      <div className="scadenze-page">
        <h1>Scadenze Mezzi</h1>
        <p>Non hai i permessi per visualizzare questa pagina.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="scadenze-page">
        <h1>Scadenze Mezzi</h1>
        <p>Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="scadenze-page">
      <h1>Dashboard Scadenze Mezzi</h1>

      {error && <div className="error-message">{error}</div>}

      {/* Riepilogo */}
      <div className="scadenze-summary">
        <div className="summary-card scaduto">
          <div className="summary-number">{scadute.length}</div>
          <div className="summary-label">Scadenze Superate</div>
        </div>
        <div className="summary-card warning">
          <div className="summary-number">{inScadenza.length}</div>
          <div className="summary-label">In Scadenza</div>
        </div>
        <div className="summary-card ok">
          <div className="summary-number">{mezzi.length}</div>
          <div className="summary-label">Mezzi Totali</div>
        </div>
      </div>

      {/* Bottoni azione */}
      <div className="scadenze-actions">
        <button onClick={() => navigate('/mezzi')} className="button secondary">
          Torna a Gestione Mezzi
        </button>
        <button onClick={() => navigate('/mezzi/calendario-scadenze')} className="button primary">
          Visualizza Calendario
        </button>
      </div>

      {/* Lista scadenze critiche */}
      {scadenzeConStatus.length === 0 ? (
        <div className="no-alerts">
          Nessuna scadenza critica. Tutti i mezzi sono in regola!
        </div>
      ) : (
        <div className="scadenze-list">
          <h2>Scadenze Critiche</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Targa</th>
                <th>Tipo Mezzo</th>
                <th>Tipo Scadenza</th>
                <th>Data Scadenza</th>
                <th>Giorni</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {scadenzeConStatus.map((s, idx) => (
                <tr key={idx} className={`scadenza-row ${s.status}`}>
                  <td><strong>{s.targa}</strong></td>
                  <td>{s.tipo_mezzo}</td>
                  <td>{s.tipo_scadenza}</td>
                  <td>{new Date(s.dataObj).toLocaleDateString('it-IT')}</td>
                  <td>
                    {s.giorni < 0 ?
                      <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                        Scaduto da {Math.abs(s.giorni)} giorni
                      </span> :
                      <span style={{ color: '#ffc107', fontWeight: 'bold' }}>
                        Tra {s.giorni} giorni
                      </span>
                    }
                  </td>
                  <td>
                    <span className={`status-badge status-${s.status}`}>
                      {s.status === 'scaduto' ? 'SCADUTO' : 'IN SCADENZA'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ScadenzeMezziPage;
