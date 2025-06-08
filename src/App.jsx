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
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const navigate = useNavigate();

  // Stati per dati comuni (anagrafiche)
  const [clienti, setClienti] = useState([]);
  const [tecnici, setTecnici] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [ordini, setOrdini] = useState([]);

  const initialSessionCheckTriggered = useRef(false);
  const sessionRef = useRef(session); // Per accedere allo stato session più recente nelle closure

  // Aggiorna sessionRef ogni volta che lo stato session cambia
  useEffect(() => {
    sessionRef.current = session;
    console.log("APP.JSX: sessionRef aggiornato. Nuovo ruolo in ref:", sessionRef.current?.user?.role);
  }, [session]);


  useEffect(() => {
    console.log("APP.JSX: useEffect principale (sessione) - ESECUZIONE (mount o dipendenze StrictMode)");
    
    const fetchProfileAndUpdateSessionState = async (currentAuthSession, isTabFocusRelatedEvent = false) => {
      const currentReactSessionForFallback = sessionRef.current; 

      if (!currentAuthSession || !currentAuthSession.user) {
        console.log("APP.JSX: fetchP&USS - No user in auth session, setting global session to null.");
        setSession(null); 
        return; 
      }

      console.log("APP.JSX: fetchP&USS - Fetching profile for user:", currentAuthSession.user.id, "IsTabFocusEvent:", isTabFocusRelatedEvent);
      try {
        const profilePromise = supabase
          .from('profiles').select('role, full_name').eq('id', currentAuthSession.user.id).single();
        
        const timeoutDuration = isTabFocusRelatedEvent ? 5000 : 7000; 
        console.log(`APP.JSX: fetchP&USS - Usando timeout di ${timeoutDuration}ms`);

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Timeout fetch profilo (${timeoutDuration/1000} secondi)`)), timeoutDuration)
        );
        const { data: profile, error: profileError } = await Promise.race([profilePromise, timeoutPromise]);

        if (profileError) {
          console.error("APP.JSX: fetchP&USS - Error or Timeout fetch profile:", profileError.message, "for user:", currentAuthSession.user.id);
          if (currentReactSessionForFallback?.user?.id === currentAuthSession.user.id && currentReactSessionForFallback.user.role) {
            console.warn("APP.JSX: fetchP&USS - Profile fetch failed. Re-applying previous profile data (role:", currentReactSessionForFallback.user.role, ") for user:", currentAuthSession.user.id);
            setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: currentReactSessionForFallback.user.role, full_name: currentReactSessionForFallback.user.full_name } });
          } else {
            console.warn("APP.JSX: fetchP&USS - Profile fetch failed, no/mismatch previous profile or no role. Fallback to 'user' role.");
            setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: 'user', full_name: currentAuthSession.user.email } });
          }
        } else if (profile) {
          setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, ...profile } });
          console.log("APP.JSX: fetchP&USS - Profile found, session updated. Role:", profile.role);
        } else { 
          setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: 'user', full_name: currentAuthSession.user.email } });
          console.warn("APP.JSX: fetchP&USS - Profile DB record not found, defaulting role. User:", currentAuthSession.user.id);
        }
      } catch (e) { 
        console.error("APP.JSX: fetchP&USS - Exception during profile logic:", e.message);
        if (currentReactSessionForFallback?.user?.id === currentAuthSession?.user?.id && currentReactSessionForFallback.user.role) {
            setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: currentReactSessionForFallback.user.role, full_name: currentReactSessionForFallback.user.full_name } });
        } else if (currentAuthSession && currentAuthSession.user) {
            setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: 'user', full_name: currentAuthSession.user.email } });
        } else {
            setSession(null);
        }
      }
    };

    if (!initialSessionCheckTriggered.current) {
        console.log("APP.JSX: Initial session check");
        setLoadingSession(true);
        supabase.auth.getSession()
            .then(async ({ data: { session: currentSessionObject }, error: getSessionError }) => {
                console.log("APP.JSX: getSession() initial. Session:", currentSessionObject ? "Exists" : "null", "Error:", getSessionError?.message || "None");
                if (getSessionError) console.error("APP.JSX: Initial getSession error:", getSessionError.message);
                await fetchProfileAndUpdateSessionState(currentSessionObject);
            })
            .catch(err => { console.error("APP.JSX: Critical exception in getSession() promise:", err); setSession(null); })
            .finally(() => {
                setLoadingSession(false);
                console.log("APP.JSX: Initial session check COMPLETE (finally), loadingSession: false");
            });
        initialSessionCheckTriggered.current = true;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newAuthSession) => {
        const currentReactUserFromRef = sessionRef.current?.user; 
        const newAuthUserId = newAuthSession?.user?.id;
        console.log("APP.JSX: onAuthStateChange - Event:", _event, "NewAuthUID:", newAuthUserId, "CurrentReactUID (from ref):", currentReactUserFromRef?.id, "Current loadingSession:", loadingSession);
        
        // Se è un evento SIGNED_IN o TOKEN_REFRESHED per l'utente già nello stato React (tipico del ritorno a tab)
        // E non siamo in un caricamento globale forzato dall'esterno.
        if ((_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') && newAuthUserId && newAuthUserId === currentReactUserFromRef?.id && !loadingSession) {
            console.log(`APP.JSX: onAuthStateChange - Evento ${_event} per utente corrente. Attempting 'silent' profile update.`);
            await fetchProfileAndUpdateSessionState(newAuthSession, true); // Passa isTabFocusRelatedEvent = true
        } 
        // Per altri eventi che indicano un cambiamento reale dell'utente o stato iniziale
        // (es. primo SIGNED_IN, SIGNED_OUT, USER_UPDATED, INITIAL_SESSION dove l'utente cambia o non c'era)
        else if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'PASSWORD_RECOVERY'].includes(_event) || 
                 (_event === 'INITIAL_SESSION' && (!currentReactUserFromRef || currentReactUserFromRef.id !== newAuthUserId) )) 
        {
            console.log(`APP.JSX: onAuthStateChange - Significant Event (${_event}), setLoadingSession(true)`);
            setLoadingSession(true);
            try {
                await fetchProfileAndUpdateSessionState(newAuthSession);
            } catch (e) {
                console.error("APP.JSX: onAuthStateChange (significant) - Exception from fetchP&USS:", e);
            } finally {
                setLoadingSession(false);
                console.log("APP.JSX: onAuthStateChange (significant) - FINALLY, setLoadingSession(false). Event:", _event);
            }
        }
        // Gestione INITIAL_SESSION dove non c'è utente e non c'era prima (caso di avvio app senza sessione)
        else if (_event === 'INITIAL_SESSION' && !newAuthSession && !currentReactUserFromRef) {
             console.log("APP.JSX: onAuthStateChange - INITIAL_SESSION with no auth session and no current react session.");
             setSession(null);
             if (loadingSession) setLoadingSession(false); 
        } else {
             console.log("APP.JSX: onAuthStateChange - Event not causing explicit full loading state change:", _event);
             // Fallback generico per sicurezza, se gli ID sono cambiati o uno è null
             // Questo potrebbe essere ridondante con la logica sopra, ma per sicurezza
             if (currentReactUserFromRef?.id !== newAuthUserId || (!currentReactUserFromRef && newAuthUserId) || (currentReactUserFromRef && !newAuthUserId) ) {
                console.log("APP.JSX: onAuthStateChange - Fallback: User state changed, processing with loading.");
                setLoadingSession(true); 
                await fetchProfileAndUpdateSessionState(newAuthSession);
                setLoadingSession(false);
             }
        }
    });
    
    return () => { 
        console.log("APP.JSX: useEffect session UNMOUNT"); 
        if (subscription) {
            subscription.unsubscribe();
        }
    };
  }, []); // Le dipendenze [] sono corrette

  // useEffect per caricare dati comuni (anagrafiche)
  useEffect(() => {
    const fetchCommonData = async () => {
      if (session && session.user) {
        console.log("APP.JSX: useEffect fetchCommonData - Sessione presente, carico anagrafiche per:", session.user.email, "Ruolo:", session.user.role);
        try {
            const { data: clientiData, error: clientiError } = await supabase.from('clienti').select('*').order('nome_azienda');
            setClienti(clientiData || []); 
            if(clientiError) console.error("APP.JSX: Errore fetch clienti:", clientiError.message);

            const { data: tecniciData, error: tecniciError } = await supabase.from('tecnici').select('*').order('cognome');
            setTecnici(tecniciData || []);
            if(tecniciError) console.error("APP.JSX: Errore fetch tecnici:", tecniciError.message);

            const { data: commesseData, error: commesseError } = await supabase.from('commesse').select('*').order('codice_commessa');
            setCommesse(commesseData || []);
            if(commesseError) console.error("APP.JSX: Errore fetch commesse:", commesseError.message);
            
            const { data: ordiniData, error: ordiniError } = await supabase.from('ordini_cliente').select('*').order('numero_ordine_cliente');
            setOrdini(ordiniData || []);
            if(ordiniError) console.error("APP.JSX: Errore fetch ordini:", ordiniError.message);

            console.log("APP.JSX: fetchCommonData - Dati anagrafiche caricati/aggiornati.");
        } catch (e) {
            console.error("APP.JSX: Eccezione imprevista durante fetchCommonData:", e);
            setClienti([]); setTecnici([]); setCommesse([]); setOrdini([]);
        }
      } else {
        console.log("APP.JSX: useEffect fetchCommonData - Nessuna sessione utente valida, svuoto anagrafiche.");
        setClienti([]); setTecnici([]); setCommesse([]); setOrdini([]);
      }
    };
    fetchCommonData();
  }, [session]); 

  // useEffect per Page Visibility API
  useEffect(() => { 
    let visibilityTimeoutId = null;
    const handleVisibilityChange = async () => { 
      if (document.hidden) {
        console.log("PAGE VISIBILITY: Pagina NASCOSTA");
      } else {
        console.log("PAGE VISIBILITY: Pagina VISIBILE di nuovo");
        const currentReactSess = sessionRef.current; 
        console.log("PAGE VISIBILITY: Al ritorno, React loadingSession:", loadingSession, "React Session User:", currentReactSess?.user?.email, "React Ruolo:", currentReactSess?.user?.role);
        
        if (currentReactSess && currentReactSess.user) {
            console.log("PAGE VISIBILITY: Tentativo di refresh esplicito sessione Supabase (no global loading)...");
            try {
                const { data: { session: refreshedSessData }, error: refreshError } = await supabase.auth.refreshSession();
                if (refreshError) {
                    console.error("PAGE VISIBILITY: Errore refreshSession:", refreshError.message);
                } else if (refreshedSessData) {
                    console.log("PAGE VISIBILITY: Sessione Supabase rinfrescata OK. onAuthStateChange dovrebbe seguire.");
                } else { 
                     console.log("PAGE VISIBILITY: refreshSession non ha restituito sessione.");
                }
            } catch (e) {
                console.error("PAGE VISIBILITY: Eccezione durante supabase.auth.refreshSession():", e);
            }
        }

        // Workaround (ultima spiaggia) se dopo un po' siamo ancora in caricamento
        if (visibilityTimeoutId) clearTimeout(visibilityTimeoutId);
        visibilityTimeoutId = setTimeout(() => {
            // Usiamo una variabile locale per leggere lo stato di loadingSession al momento dell'esecuzione del timeout
            const currentLoadingState = loadingSession; 
            if (!document.hidden && currentLoadingState && sessionRef.current && sessionRef.current.user) {
                 console.warn("PAGE VISIBILITY: WORKAROUND POST-REFRESH TIMEOUT (2s) - Forzo loadingSession = false.");
                 setLoadingSession(false); // Usa la funzione di impostazione dello stato
            }
        }, 2000); 
      }
    };
    console.log("PAGE VISIBILITY: Aggiungo event listener");
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      console.log("PAGE VISIBILITY: Rimuovo event listener");
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (visibilityTimeoutId) clearTimeout(visibilityTimeoutId);
    };
  }, [loadingSession]); // Dipendenza da loadingSession per il workaround e per il log aggiornato

  const handleLogout = async () => { 
    console.log("APP.JSX: handleLogout INIZIO");
    setLoadingSession(true); 
    const { error } = await supabase.auth.signOut();
    if (error) { 
      console.error("APP.JSX: Errore logout:", error); 
      alert("Errore logout: " + error.message); 
      setLoadingSession(false); 
    } else { 
        console.log("APP.JSX: Logout OK.");
        setClienti([]); setTecnici([]); setCommesse([]); setOrdini([]);
        navigate('/login'); 
    }
  };

  if (loadingSession) { 
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', backgroundColor:'#f0f2f5' }}>
        <div className="spinner"></div>
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
        {session && session.user && (
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
              className="button-logout"
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
          <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!session ? <SignupPage /> : <Navigate to="/" replace />} />
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
            {(userRole === 'admin' || userRole === 'manager') && (
              <>
                <Route path="/clienti" element={<ClientiManager session={session} />} />
                <Route path="/tecnici" element={<TecniciManager session={session} />} />
                <Route path="/commesse" element={<CommesseManager session={session} clienti={clienti} />} />
                <Route path="/ordini" element={<OrdiniClienteManager session={session} clienti={clienti} commesse={commesse} />} />
              </>
            )}
          </Route>
          <Route path="*" element={<Navigate to={session ? "/" : "/login"} replace />} />
        </Routes>
      </main>
      <footer><p>© {new Date().getFullYear()} Oilsafe S.r.l.</p></footer>
    </div>
  );
}

export default App;