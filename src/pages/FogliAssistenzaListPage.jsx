import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

function FogliAssistenzaListPage() {
  const [fogli, setFogli] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFogli() {
      setLoading(true);
      const { data, error } = await supabase
        .from('fogli_assistenza')
        .select(`
          id,
          numero_foglio,
          data_apertura_foglio,
          stato_foglio,
          clienti (nome_azienda)
        `)
        .order('data_apertura_foglio', { ascending: false });

      if (error) {
        console.error('Errore fetch fogli:', error);
      } else {
        setFogli(data);
      }
      setLoading(false);
    }
    fetchFogli();
  }, []);

  if (loading) return <p>Caricamento fogli di assistenza...</p>;

  return (
    <div>
      <h2>Elenco Fogli di Assistenza</h2>
      <Link to="/fogli-assistenza/nuovo">
        <button>Nuovo Foglio Assistenza</button>
      </Link>
      {fogli.length === 0 ? (
        <p>Nessun foglio di assistenza trovato.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Numero Foglio</th>
              <th>Data Apertura</th>
              <th>Cliente</th>
              <th>Stato</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {fogli.map((foglio) => (
              <tr key={foglio.id}>
                <td>{foglio.numero_foglio || 'N/D'}</td>
                <td>{new Date(foglio.data_apertura_foglio).toLocaleDateString()}</td>
                <td>{foglio.clienti?.nome_azienda || 'N/D'}</td>
                <td>{foglio.stato_foglio}</td>
                <td className="actions">
                  <Link to={`/fogli-assistenza/${foglio.id}`}>Visualizza/Gestisci</Link>
                  {/* <Link to={`/fogli-assistenza/${foglio.id}/modifica`}>Modifica</Link> */}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
export default FogliAssistenzaListPage;