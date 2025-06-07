// src/pages/FoglioAssistenzaDetailPage.jsx
// ... (import esistenti)
import { generateFoglioAssistenzaPDF } from '../utils/pdfGenerator'; // Importa la funzione

function FoglioAssistenzaDetailPage({ session, tecnici }) {
    // ... (stati e funzioni esistenti come prima) ...
    const { foglioId } = useParams();
    const [foglio, setFoglio] = useState(null);
    const [interventi, setInterventi] = useState([]);
    const [stampaSingolaLoading, setStampaSingolaLoading] = useState(false);
    // ... altri stati ...
    const userRole = session?.user?.role;
    const currentUserId = session?.user?.id;
    // ... (canViewThisFoglio, canEditThisFoglioOverall, canDeleteThisFoglio come prima) ...


    const handlePrintSingleFoglio = async () => {
        if (!foglio) {
            alert("Dati del foglio non ancora caricati.");
            return;
        }
        // Verifica se l'utente può vedere questo foglio (anche se già controllato per la visualizzazione della pagina)
        const canActuallyPrint = 
            userRole === 'admin' || 
            userRole === 'manager' || 
            userRole === 'head' || 
            (userRole === 'user' && foglio.creato_da_user_id === currentUserId);

        if (!canActuallyPrint) {
            alert("Non hai i permessi per stampare questo foglio.");
            return;
        }

        setStampaSingolaLoading(true);
        setError(null); // Resetta errori precedenti
        try {
            // I dati `foglio` e `interventi` dovrebbero essere già caricati nello stato del componente
            // Se non lo sono, dovresti fare un fetch qui come in handlePrintSelected
            // Per ora, assumiamo che siano disponibili se la pagina è visualizzata
            if (!foglio.clienti || !foglio.commesse || !foglio.ordini_cliente) {
                 // Potrebbe essere necessario rifare il fetch con tutti i join se foglio non è completo
                console.warn("Dati relazionati del foglio (cliente, commessa, ordine) potrebbero mancare, ricarico...");
                const { data: fullFoglioData, error: fullFoglioError } = await supabase
                    .from('fogli_assistenza')
                    .select(`*, clienti (*), commesse (*), ordini_cliente (*)`)
                    .eq('id', foglioId)
                    .single();
                if (fullFoglioError || !fullFoglioData) throw new Error(fullFoglioError?.message || "Impossibile ricaricare dati foglio per stampa.");
                
                await generateFoglioAssistenzaPDF(fullFoglioData, interventi);
            } else {
                await generateFoglioAssistenzaPDF(foglio, interventi);
            }

        } catch (err) {
            console.error(`Errore durante la generazione del PDF per il foglio singolo ${foglioId}:`, err);
            setError(`Errore PDF: ${err.message}`);
            alert(`Impossibile generare il PDF. Dettagli in console.`);
        }
        setStampaSingolaLoading(false);
    };


    // ... (resto del componente come prima, inclusa la logica di fetchFoglioData) ...
    if (loadingPage) return <p>Caricamento dati foglio di assistenza...</p>;
    // ... (gestione errori e sessione come prima) ...
    if (!foglio && !loadingPage) return <p>Foglio di assistenza non trovato o accesso negato dalle policy RLS.</p>;
    if (!canViewThisFoglio && foglio) return <p>Non hai i permessi per visualizzare questo foglio.</p>


    return (
        <div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'1rem', flexWrap:'wrap', gap:'10px'}}>
                <Link to="/fogli-assistenza" className="button secondary">← Lista Fogli</Link>
                <div>
                    {canViewThisFoglio && ( // Chiunque può vedere, può stampare (le RLS gestiranno il fetch)
                         <button 
                            onClick={handlePrintSingleFoglio} 
                            className="button primary" 
                            disabled={stampaSingolaLoading || !foglio}
                            style={{marginRight:'10px'}}
                        >
                            {stampaSingolaLoading ? 'Stampa...' : 'Stampa Foglio'}
                        </button>
                    )}
                    {canEditThisFoglioOverall && (
                        <Link to={`/fogli-assistenza/${foglioId}/modifica`} className="button secondary" style={{marginRight:'10px'}}>
                            Modifica Intestazione
                        </Link>
                    )}
                    {canDeleteThisFoglio && (
                        <button onClick={handleDeleteFoglio} className="button danger" disabled={actionLoading}>
                            {actionLoading ? 'Eliminazione...' : 'Elimina Foglio'}
                        </button>
                    )}
                </div>
            </div>
            {/* ... (resto del JSX come prima) ... */}
        </div>
    );
}
export default FoglioAssistenzaDetailPage;