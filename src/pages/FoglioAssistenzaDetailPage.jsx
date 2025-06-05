import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import InterventoAssistenzaForm from '../components/InterventoAssistenzaForm'; // Da creare

function FoglioAssistenzaDetailPage({ tecnici }) {
  const { foglioId } = useParams();
  const [foglio, setFoglio] = useState(null);
  const [interventi, setInterventi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInterventoForm, setShowInterventoForm] = useState(false);

  const fetchFoglioData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: foglioData, error: foglioError } = await supabase
      .from('fogli_assistenza')
      .select(`
        *,
        clienti (nome_azienda),
        commesse (codice_commessa, descrizione_commessa),
        ordini_cliente (numero_ordine_cliente, descrizione_ordine)
      `)
      .eq('id', foglioId)
      .single();

    if (foglioError) {
      setError(foglioError.message);
      console.error("Errore fetch foglio:", foglioError);
      setLoading(false);
      return;
    }
    setFoglio(foglioData);

    const { data: interventiData, error: interventiError } = await supabase
      .from('interventi_assistenza')
      .select(`
        *,
        tecnici (nome, cognome)
      `)
      .eq('foglio_assistenza_id', foglioId)
      .order('data_intervento_effettivo', { ascending: true });

    if (interventiError) {
      setError(interventiError.message);
      console.error("Errore fetch interventi:", interventiError);
    } else {
      setInterventi(interventiData);
    }
    setLoading(false);
  }, [foglioId]);

  useEffect(() => {
    fetchFoglioData();
  }, [fetchFoglioData]);

  const handleInterventoAdded = () => {
    setShowInterventoForm(false);
    fetchFoglioData(); // Ricarica tutto per semplicità
  };

  const handleDeleteIntervento = async (interventoId) => {
    if (window.confirm("Sei sicuro di voler eliminare questo intervento?")) {
        const { error: deleteError } = await supabase
            .from('interventi_assistenza')
            .delete()
            .eq('id', interventoId);
        if (deleteError) {
            alert("Errore durante l'eliminazione dell'intervento: " + deleteError.message);
        } else {
            fetchFoglioData(); // Ricarica
        }
    }
  };


  if (loading) return <p>Caricamento dati foglio...</p>;
  if (error) return <p style={{ color: 'red' }}>Errore: {error}</p>;
  if (!foglio) return <p>Foglio di assistenza non trovato.</p>;

  return (
    <div>
      <Link to="/fogli-assistenza">← Torna alla lista</Link>
      <h2>Dettaglio Foglio Assistenza N. {foglio.numero_foglio || foglio.id.substring(0,8)}</h2>
      {/* <Link to={`/fogli-assistenza/${foglioId}/modifica`}>Modifica Intestazione</Link> */}

      <h3>Informazioni Generali</h3>
      <p><strong>Data Apertura:</strong> {new Date(foglio.data_apertura_foglio).toLocaleDateString()}</p>
      <p><strong>Cliente:</strong> {foglio.clienti?.nome_azienda || 'N/D'}</p>
      <p><strong>Referente Richiesta:</strong> {foglio.referente_cliente_richiesta || 'N/D'}</p>
      {foglio.commesse && <p><strong>Commessa:</strong> {foglio.commesse.codice_commessa} - {foglio.commesse.descrizione_commessa}</p>}
      {foglio.ordini_cliente && <p><strong>Ordine Cliente:</strong> {foglio.ordini_cliente.numero_ordine_cliente} - {foglio.ordini_cliente.descrizione_ordine}</p>}
      <p><strong>Motivo Intervento:</strong> {foglio.motivo_intervento_generale || 'N/D'}</p>
      <p><strong>Descrizione Lavoro Generale:</strong> {foglio.descrizione_lavoro_generale || 'N/D'}</p>
      <p><strong>Materiali Forniti:</strong> {foglio.materiali_forniti_generale || 'N/D'}</p>
      <p><strong>Osservazioni Generali:</strong> {foglio.osservazioni_generali || 'N/D'}</p>
      <p><strong>Stato Foglio:</strong> {foglio.stato_foglio}</p>

      <h4>Firme</h4>
      <div>
        <p>Firma Cliente:</p>
        {foglio.firma_cliente_url ? (
          <img src={foglio.firma_cliente_url} alt="Firma Cliente" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '150px'}}/>
        ) : <p>Non presente</p>}
      </div>
       <div>
        <p>Firma Tecnico:</p>
        {foglio.firma_tecnico_principale_url ? (
          <img src={foglio.firma_tecnico_principale_url} alt="Firma Tecnico" style={{border:'1px solid #ccc', maxWidth: '300px', maxHeight: '150px'}}/>
        ) : <p>Non presente</p>}
      </div>


      <hr />
      <h3>Interventi di Assistenza</h3>
      <button onClick={() => setShowInterventoForm(true)} disabled={showInterventoForm}>
        Aggiungi Intervento
      </button>

      {showInterventoForm && (
        <InterventoAssistenzaForm
          foglioAssistenzaId={foglioId}
          tecniciList={tecnici}
          onInterventoAdded={handleInterventoAdded}
          onCancel={() => setShowInterventoForm(false)}
        />
      )}

      {interventi.length === 0 ? (
        <p>Nessun intervento registrato per questo foglio.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tecnico</th>
              <th>Tipo</th>
              <th>Ore Lavoro</th>
              <th>Ore Viaggio</th>
              <th>Descrizione Attività</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {interventi.map(intervento => (
              <tr key={intervento.id}>
                <td>{new Date(intervento.data_intervento_effettivo).toLocaleDateString()}</td>
                <td>{intervento.tecnici?.nome} {intervento.tecnici?.cognome}</td>
                <td>{intervento.tipo_intervento || '-'}</td>
                <td>{intervento.ore_lavoro_effettive || '-'}</td>
                <td>{intervento.ore_viaggio || '-'}</td>
                <td>{intervento.descrizione_attivita_svolta_intervento || '-'}</td>
                <td className="actions">
                    {/* <button className="secondary">Modifica</button> */}
                    <button className="danger" onClick={() => handleDeleteIntervento(intervento.id)}>Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
export default FoglioAssistenzaDetailPage;