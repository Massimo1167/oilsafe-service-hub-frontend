// src/pages/FogliAssistenzaListPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { generateFoglioAssistenzaPDF } from '../utils/pdfGenerator'; // Importa la funzione

function FogliAssistenzaListPage({ session }) {
    const [fogli, setFogli] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedFogli, setSelectedFogli] = useState(new Set()); // Per la selezione multipla
    const [stampaLoading, setStampaLoading] = useState(false);

    const userRole = session?.user?.role;
    const currentUserId = session?.user?.id;

    useEffect(() => {
        async function fetchFogli() {
            setLoading(true);
            setError(null);
            let query = supabase
                .from('fogli_assistenza')
                .select(`
                    id,
                    numero_foglio,
                    data_apertura_foglio,
                    stato_foglio,
                    creato_da_user_id, 
                    clienti (nome_azienda)
                `)
                .order('data_apertura_foglio', { ascending: false });

            // Filtra per utente se il ruolo è 'user'
            if (userRole === 'user') {
                query = query.eq('creato_da_user_id', currentUserId);
            }

            const { data, error: fetchError } = await query;

            if (fetchError) {
                console.error('Errore fetch fogli:', fetchError);
                setError(fetchError.message);
            } else {
                setFogli(data || []);
            }
            setLoading(false);
        }

        if (session) { // Esegui fetch solo se c'è una sessione
            fetchFogli();
        } else {
            setFogli([]); // Svuota i dati se non c'è sessione
            setLoading(false);
        }
    }, [session, userRole, currentUserId]);

    const handleSelectFoglio = (foglioId) => {
        setSelectedFogli(prevSelected => {
            const newSelected = new Set(prevSelected);
            if (newSelected.has(foglioId)) {
                newSelected.delete(foglioId);
            } else {
                newSelected.add(foglioId);
            }
            return newSelected;
        });
    };

    const handleSelectAllFogli = (e) => {
        if (e.target.checked) {
            const allIds = new Set(fogli.map(f => f.id));
            setSelectedFogli(allIds);
        } else {
            setSelectedFogli(new Set());
        }
    };

    const handlePrintSelected = async () => {
        if (selectedFogli.size === 0) {
            alert("Seleziona almeno un foglio di assistenza da stampare.");
            return;
        }
        setStampaLoading(true);
        setError(null);

        for (const foglioId of selectedFogli) {
            try {
                // 1. Recupera i dati completi del foglio (intestazione)
                const { data: foglioData, error: foglioError } = await supabase
                    .from('fogli_assistenza')
                    .select(`*, clienti (*), commesse (*), ordini_cliente (*)`) // Seleziona relazioni complete
                    .eq('id', foglioId)
                    .single();

                if (foglioError || !foglioData) {
                    throw new Error(foglioError?.message || `Foglio con ID ${foglioId} non trovato.`);
                }
                
                // 2. Recupera gli interventi associati
                const { data: interventiData, error: interventiError } = await supabase
                    .from('interventi_assistenza')
                    .select(`*, tecnici (*)`)
                    .eq('foglio_assistenza_id', foglioId)
                    .order('data_intervento_effettivo');

                if (interventiError) {
                    // Potresti decidere di stampare comunque il foglio senza interventi o mostrare un errore
                    console.warn(`Errore nel recuperare gli interventi per il foglio ${foglioId}: ${interventiError.message}`);
                }

                // 3. Genera il PDF
                // Il prompt di salvataggio del browser apparirà per ogni PDF
                await generateFoglioAssistenzaPDF(foglioData, interventiData || []);

            } catch (err) {
                console.error(`Errore durante la generazione del PDF per il foglio ${foglioId}:`, err);
                setError(`Errore per foglio ${foglioId.substring(0,8)}: ${err.message}`);
                alert(`Impossibile generare il PDF per il foglio ${foglioId.substring(0,8)}... Dettagli in console.`);
                // Interrompi il loop se c'è un errore o continua con gli altri?
                // break; 
            }
        }
        setStampaLoading(false);
        setSelectedFogli(new Set()); // Deseleziona dopo la stampa
    };


    if (loading) return <p>Caricamento fogli di assistenza...</p>;
    if (!session) return <p>Effettua il login per visualizzare i fogli di assistenza.</p>;


    return (
        <div>
          <h2>Elenco Fogli di Assistenza</h2>
          {error && <p style={{ color: 'red', fontWeight:'bold' }}>ERRORE: {error}</p>}

          {(userRole === 'admin' || userRole === 'user') && ( // Solo admin e user possono creare
            <Link to="/fogli-assistenza/nuovo" className="button" style={{marginBottom:'1rem', display:'inline-block'}}>
                Nuovo Foglio Assistenza
            </Link>
          )}
          
          {fogli.length > 0 && (userRole === 'admin' || userRole === 'manager' || userRole === 'head' || (userRole === 'user' && fogli.some(f => f.creato_da_user_id === currentUserId))) && (
            // Mostra pulsante stampa solo se ci sono fogli e l'utente ha il permesso di vederne almeno uno
            <button 
                onClick={handlePrintSelected} 
                disabled={selectedFogli.size === 0 || stampaLoading}
                style={{marginBottom:'1rem', marginLeft:'10px'}}
                className="button primary"
            >
                {stampaLoading ? `Stampa in corso... (${selectedFogli.size} sel.)` : `Stampa Selezionati (${selectedFogli.size})`}
            </button>
          )}

          {fogli.length === 0 && !loading ? (
            <p>Nessun foglio di assistenza trovato.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>
                    <input 
                        type="checkbox" 
                        onChange={handleSelectAllFogli}
                        checked={fogli.length > 0 && selectedFogli.size === fogli.length}
                        disabled={fogli.length === 0}
                        title="Seleziona tutti / Deseleziona tutti"
                    />
                  </th>
                  <th>Numero Foglio</th>
                  <th>Data Apertura</th>
                  <th>Cliente</th>
                  <th>Stato</th>
                  {userRole !== 'user' && <th>Creato Da (ID)</th>}
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {fogli.map((foglio) => (
                  <tr key={foglio.id} className={selectedFogli.has(foglio.id) ? 'selected-row' : ''}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedFogli.has(foglio.id)}
                        onChange={() => handleSelectFoglio(foglio.id)}
                      />
                    </td>
                    <td>{foglio.numero_foglio || `ID: ${foglio.id.substring(0,8)}`}</td>
                    <td>{new Date(foglio.data_apertura_foglio).toLocaleDateString()}</td>
                    <td>{foglio.clienti?.nome_azienda || 'N/D'}</td>
                    <td>{foglio.stato_foglio}</td>
                    {userRole !== 'user' && <td><small>{foglio.creato_da_user_id?.substring(0,8) || '-'}</small></td>}
                    <td className="actions">
                      <Link to={`/fogli-assistenza/${foglio.id}`} className="button small">Visualizza/Gestisci</Link>
                      {/* Il pulsante di modifica diretta dell'intestazione è sulla pagina di dettaglio */}
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

// Aggiungi questo stile a App.css o index.css per evidenziare le righe selezionate
/*
.selected-row {
  background-color: #e6f7ff !important; // Blu chiaro per la selezione
}
.button.small {
    padding: 0.3rem 0.6rem;
    font-size: 0.85em;
}
*/