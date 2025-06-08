// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useNavigate, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Importa Pagine
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import FogliAssistenzaListPage from './pages/FogliAssistenzaListPage';
import FoglioAssistenzaFormPage from './pages/FoglioAssistenzaFormPage';
import FoglioAssistenzaDetailPage from './pages/FoglioAssistenzaDetailPage';

// Importa Componenti Manager Anagrafiche
import ClientiManager from './components/Anagrafiche/ClientiManager';
import TecniciManager from './components/Anagrafiche/TecniciManager';
import CommesseManager from './components/Anagrafiche/CommesseManager';
import OrdiniClienteManager from './components/Anagrafiche/OrdiniClienteManager';

import './App.css'; // Assicurati che questo file esista e contenga gli stili necessari

// Componente per Rotte Protette
function ProtectedRoute({ session }) {
  if (!session) {
    // Se l'utente non è loggato, reindirizza alla pagina di login
    return <Navigate to="/login" replace />;
  }
  // Se l'utente è loggato, renderizza il contenuto della rotta figlia
  return <Outlet />;
}

function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true); // Inizia come true
  const navigate = useNavigate();

  // Stati per dati comuni (anagrafiche)
  const [clienti, setClienti] = useState([]);
  const [tecnici, setTecnici] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [ordini, setOrdini] = useState([]); // Anche se non usato come prop, per completezza

  // Ref per gestire l'effetto di React.StrictMode (doppio mount in sviluppo)
  const initialSessionCheckTriggered = useRef(false);

  useEffect(() => {
    console.log("APP.JSX: useEffect principale (sessione) - ESECUZIONE (mount o dipendenze StrictMode)");

    // Funzione interna per recuperare il profilo e aggiornare lo stato della sessione
    const fetchProfileAndUpdateSession = async (currentAuthSession) => {
      if (!currentAuthSession || !currentAuthSession.user) {
        console.log("APP.JSX: fetchProfileAndUpdateSession - Nessuna sessione utente valida, imposto sessione globale a null.");
        setSession(null);
        return; // Esce se non c'è utente
      }

      console.log("APP.JSX: fetchProfileAndUpdateSession - Tentativo fetch profilo per utente:", currentAuthSession.user.id);
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name') // Assicurati che 'role' esista nella tua tabella 'profiles'
          .eq('id', currentAuthSession.user.id)
          .single();

        if (profileError) {
          console.error("APP.JSX: Errore fetch profilo:", profileError.message, "- per utente:", currentAuthSession.user.id);
          // Fallback: usa l'email come nome e ruolo 'user' di default
          setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: 'user', full_name: currentAuthSession.user.email } });
        } else if (profile) {
          console.log("APP.JSX: Profilo trovato:", profile, "- per utente:", currentAuthSession.user.id);
          setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, ...profile } });
        } else {
          // Profilo non trovato ma nessun errore dalla query (es. record non esiste)
          console.warn("APP.JSX: Profilo non trovato per utente:", currentAuthSession.user.id, "- Assegno ruolo 'user' di default.");
          setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: 'user', full_name: currentAuthSession.user.email } });
        }
      } catch (e) {
        console.error("APP.JSX: Eccezione imprevista durante fetch profilo:", e);
        setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: 'user', full_name: currentAuthSession.user.email } }); // Fallback robusto
      }
    };

    // Logica per il check iniziale della sessione (gestisce StrictMode)
    if (!initialSessionCheckTriggered.current) {
      console.log("APP.JSX: Eseguo check sessione iniziale (prima volta effettiva che questo blocco viene eseguito)");
      setLoadingSession(true); // Imposta il caricamento
      supabase.auth.getSession()
        .then(async ({ data: { session: currentSessionObject }, error: getSessionError }) => {
          console.log("APP.JSX: getSession() completato. Sessione:", currentSessionObject ? currentSessionObject.user?.email : null, "Errore:", getSessionError ? getSessionError.message : "Nessuno");
          if (getSessionError) {
            console.error("APP.JSX: Errore durante supabase.auth.getSession():", getSessionError.message);
          }
          // Chiamiamo fetchProfileAndUpdateSession in ogni caso (passando null se currentSessionObject è null)
          await fetchProfileAndUpdateSession(currentSessionObject);
        })
        .catch((err) => { // Catch per errori nella promise di getSession stessa
          console.error("APP.JSX: Eccezione critica in supabase.auth.getSession() promise:", err);
          setSession(null); // Assicura che la sessione sia null in caso di errore grave
        })
        .finally(() => {
          // Questo blocco `finally` è cruciale per assicurare che loadingSession venga impostato a false
          setLoadingSession(false);
          console.log("APP.JSX: Check sessione iniziale COMPLETATO (blocco finally), loadingSession: false");
        });
      initialSessionCheckTriggered.current = true; // Marca il check iniziale come fatto
    } else {
      console.log("APP.JSX: Check sessione iniziale già eseguito (probabile re-run di StrictMode), non rieseguo getSession(). Stato loadingSession:", loadingSession);
      // Se siamo qui a causa di un re-run di StrictMode e loadingSession è ancora true senza un motivo apparente,
      // potrebbe essere necessario un intervento, ma onAuthStateChange dovrebbe idealmente gestire gli stati successivi.
    }

    // Sottoscrizione ai cambiamenti dello stato di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newAuthSession) => {
      console.log("APP.JSX: onAuthStateChange triggerato. Evento:", _event, "Nuova sessione Auth:", newAuthSession ? newAuthSession.user?.email : null);
      
      // Imposta loading a true quando inizia la gestione di un cambio di stato significativo
      // Non farlo per ogni evento (es. TOKEN_REFRESHED potrebbe non necessitare di un overlay di caricamento)
      // ma per SIGNED_IN, SIGNED_OUT, USER_UPDATED è importante.
      if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT' || _event === 'USER_UPDATED' || _event === 'INITIAL_SESSION' || _event === 'PASSWORD_RECOVERY') {
          console.log("APP.JSX: onAuthStateChange - Evento che richiede aggiornamento UI, setLoadingSession(true)");
          setLoadingSession(true); 
      }
      
      try {
        await fetchProfileAndUpdateSession(newAuthSession);
      } catch (e) {
        console.error("APP.JSX: onAuthStateChange - Eccezione chiamando fetchProfileAndUpdateSession:", e);
        // Se c'è un errore qui, e newAuthSession era null, la sessione è già stata impostata a null.
        // Se newAuthSession era valida ma il fetch del profilo è fallito, fetchProfileAndUpdateSession dovrebbe aver gestito un fallback.
      } finally {
        // Assicura che loadingSession sia sempre impostato a false dopo aver tentato di processare il cambio di stato,
        // specialmente per gli eventi che hanno impostato loadingSession a true.
        if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT' || _event === 'USER_UPDATED' || _event === 'INITIAL_SESSION' || _event === 'PASSWORD_RECOVERY') {
            setLoadingSession(false);
            console.log("APP.JSX: onAuthStateChange - FINALLY block, loadingSession: false. Evento:", _event);
        } else if (_event === 'TOKEN_REFRESHED'){
            // Per TOKEN_REFRESHED, loadingSession potrebbe non essere stato impostato a true.
            // Se fetchProfileAndUpdateSession è stato chiamato e ha completato, e se loadingSession era true,
            // dovremmo metterlo a false. È più sicuro metterlo a false se non si è sicuri.
            // Se non abbiamo messo setLoadingSession(true) per TOKEN_REFRESHED, non serve qui.
            // Per ora, se è stato impostato a true, lo mettiamo a false.
            // if(loadingSession) setLoadingSession(false); // Commentato per ora, la logica sopra dovrebbe bastare
            console.log("APP.JSX: onAuthStateChange - TOKEN_REFRESHED gestito. Stato loadingSession:", loadingSession);
        }
      }
    });
    
    // Funzione di pulizia per la sottoscrizione
    return () => {
      console.log("APP.JSX: useEffect principale (sessione) UNMOUNT - Pulizia sottoscrizione onAuthStateChange");
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []); // Array di dipendenze vuoto: eseguito solo al mount e unmount di App

  // useEffect per caricare dati comuni (anagrafiche) quando la sessione cambia
  useEffect(() => {
    const fetchCommonData = async () => {
      // Esegui solo se c'è una sessione valida con un utente
      if (session && session.user) {
        console.log("APP.JSX: useEffect fetchCommonData - Sessione presente, carico dati anagrafiche per utente:", session.user.email);
        // Potresti voler impostare uno stato di caricamento specifico per questi dati se sono molti
        // setLoadingCommonData(true); 
        try {
            const [clientiRes, tecniciRes, commesseRes, ordiniRes] = await Promise.all([
                supabase.from('clienti').select('*').order('nome_azienda'),
                supabase.from('tecnici').select('*').order('cognome'),
                supabase.from('commesse').select('*').order('codice_commessa'),
                supabase.from('ordini_cliente').select('*').order('numero_ordine_cliente')
            ]);
            
            setClienti(clientiRes.data || []);
            if(clientiRes.error) console.error("APP.JSX: Errore fetch clienti:", clientiRes.error.message);
            
            setTecnici(tecniciRes.data || []);
            if(tecniciRes.error) console.error("APP.JSX: Errore fetch tecnici:", tecniciRes.error.message);

            setCommesse(commesseRes.data || []);
            if(commesseRes.error) console.error("APP.JSX: Errore fetch commesse:", commesseRes.error.message);
            
            setOrdini(ordiniRes.data || []);
            if(ordiniRes.error) console.error("APP.JSX: Errore fetch ordini:", ordiniRes.error.message);
        } catch (e) {
            console.error("APP.JSX: Eccezione durante fetchCommonData:", e);
        } finally {
            // setLoadingCommonData(false);
        }
      } else {
        console.log("APP.JSX: useEffect fetchCommonData - Nessuna sessione utente valida, svuoto anagrafiche.");
        setClienti([]);
        setTecnici([]);
        setCommesse([]);
        setOrdini([]);
      }
    };

    fetchCommonData();
  }, [session]); // Riesegui quando la `session` (l'oggetto intero) cambia

  // useEffect per la Page Visibility API
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("PAGE VISIBILITY: Pagina NASCOSTA");
      } else {
        console.log("PAGE VISIBILITY: Pagina VISIBILE di nuovo");
        console.log("PAGE VISIBILITY: Al ritorno, stato loadingSession:", loadingSession, "Sessione:", session ? session.user?.email : null);
        // Se la pagina torna visibile e siamo bloccati su "Caricamento..." (loadingSession è true)
        // E non c'è una sessione utente valida, potrebbe essere un segno che il processo di recupero sessione
        // si è interrotto. Questo è un workaround e andrebbe investigata la causa radice.
        if (!document.hidden && loadingSession && (!session || !session.user)) {
             console.warn("PAGE VISIBILITY: La pagina è visibile, 'loadingSession' è true, ma non c'è sessione utente valida. Potrebbe essere bloccato.");
             // In questo caso specifico, potremmo tentare di forzare un re-check, ma è rischioso creare loop.
             // Per ora, ci affidiamo ai log per capire perché loadingSession non torna a false.
        }
      }
    };
    console.log("PAGE VISIBILITY: Aggiungo event listener per visibilitychange");
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      console.log("PAGE VISIBILITY: Rimuovo event listener per visibilitychange");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadingSession, session]); // Aggiunte dipendenze per avere i valori aggiornati nel log

  const handleLogout = async () => {
    console.log("APP.JSX: handleLogout INIZIO");
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("APP.JSX: Errore durante il logout:", error);
      alert("Errore durante il logout: " + error.message);
    } else {
      console.log("APP.JSX: Logout effettuato con successo. Navigo a /login.");
      // setSession(null) viene gestito da onAuthStateChange
      // Svuota i dati specifici dell'utente
      setClienti([]); 
      setTecnici([]); 
      setCommesse([]); 
      setOrdini([]);
      navigate('/login'); 
    }
  };

  // Schermata di caricamento principale
  if (loadingSession) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', backgroundColor:'#f0f2f5' }}>
        <div className="spinner"></div> {/* Definisci .spinner in App.css */}
        <p style={{fontSize: '1.2em', marginTop:'20px', color:'#333'}}>Caricamento applicazione...</p>
      </div>
    );
  }

  const userRole = session?.user?.role;
  const canCreateNewSheet = userRole === 'admin' || userRole === 'user';

  return (
    <div className="app-container">
      <header>
        <h1>Oilsafe Service Hub</h1>
        {session && session.user && ( // Mostra nav solo se c'è una sessione utente valida
          <nav>
            <Link to="/">Dashboard</Link>
            <Link to="/fogli-assistenza">Fogli Assistenza</Link>
            {(userRole === 'admin' || userRole === 'manager') && (
              <>
                <Link to="/clienti">Clienti</Link>
                <Link to="/tecnici">Tecnici</Link>
                <Link to="/commesse">Commesse</Link>
                <Link to="/ordini">Ordini</Link>
              </>
            )}
            <button 
              onClick={handleLogout} 
              className="button-logout" // Usa la classe per lo stile
              title={`Logout ${(session.user.full_name || session.user.email)}`}
            >
              Logout ({ (session.user.full_name || session.user.email || 'Utente').substring(0,15) }
              { (session.user.full_name || session.user.email)?.length > 15 ? '...' : '' })
            </button>
          </nav>
        )}
      </header>
      <main>
        <Routes>
          {/* Se l'utente è loggato e prova ad andare a /login o /signup, reindirizza alla dashboard */}
          <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!session ? <SignupPage /> : <Navigate to="/" replace />} />

          {/* Rotte Protette */}
          <Route element={<ProtectedRoute session={session} />}>
            <Route path="/" element={<DashboardPage session={session} />} />
            <Route path="/fogli-assistenza" element={<FogliAssistenzaListPage session={session} />} />
            <Route 
              path="/fogli-assistenza/nuovo" 
              element={
                canCreateNewSheet ? 
                <FoglioAssistenzaFormPage session={session} clienti={clienti} commesse={commesse} ordini={ordini} />
                : <Navigate to="/" replace state={{ error: "Accesso negato alla creazione foglio" }} />
              }
            />
            <Route 
              path="/fogli-assistenza/:foglioIdParam/modifica"
              element={
                // I permessi specifici per la modifica di *questo* foglio sono gestiti internamente
                // dalla pagina FoglioAssistenzaFormPage e dalle RLS. Qui verifichiamo solo il login.
                <FoglioAssistenzaFormPage 
                    session={session} 
                    clienti={clienti} 
                    commesse={commesse} 
                    ordini={ordini} 
                />
              }
            />
            <Route 
              path="/fogli-assistenza/:foglioId" 
              element={<FoglioAssistenzaDetailPage session={session} tecnici={tecnici} />} 
            />
            
            {/* Rotte Anagrafiche protette e visibili solo a admin/manager */}
            {(userRole === 'admin' || userRole === 'manager') && (
              <>
                <Route path="/clienti" element={<ClientiManager session={session} />} />
                <Route path="/tecnici" element={<TecniciManager session={session} />} />
                <Route path="/commesse" element={<CommesseManager session={session} clienti={clienti} />} />
                <Route path="/ordini" element={<OrdiniClienteManager session={session} clienti={clienti} commesse={commesse} />} />
              </>
            )}
            {/* Se un utente non admin/manager prova ad accedere a una rotta anagrafica,
                non la troverà qui e verrà reindirizzato dal path="*" o vedrà una pagina vuota
                se il ProtectedRoute non fa nulla. È meglio gestire esplicitamente l'accesso negato
                o fare in modo che le rotte non siano proprio definite per loro.
                I link nel menu di navigazione sono già condizionati.
            */}
          </Route>

          {/* Fallback: se nessuna rotta corrisponde, reindirizza. */}
          <Route path="*" element={<Navigate to={session ? "/" : "/login"} replace />} />
        </Routes>
      </main>
      <footer><p>© {new Date().getFullYear()} Oilsafe S.r.l.</p></footer>
    </div>
  );
}

export default App;