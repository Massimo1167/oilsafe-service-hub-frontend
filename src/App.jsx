/**
 * Root component that defines application routes and global state.
 * Manages user session via Supabase and shares common data (clienti,
 * tecnici, commesse, ordini) with the pages. Uses React Router for
 * navigation and shows different pages based on authentication.
 */
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
import ClientiManager from './components/anagrafiche/ClientiManager';
import TecniciManager from './components/anagrafiche/TecniciManager';
import CommesseManager from './components/anagrafiche/CommesseManager';
import OrdiniClienteManager from './components/anagrafiche/OrdiniClienteManager';

import './App.css';

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

  // NUOVO: Stato di caricamento specifico per le anagrafiche
  const [loadingAnagrafiche, setLoadingAnagrafiche] = useState(true);

  // Stati per dati comuni (anagrafiche)
  const [clienti, setClienti] = useState([]);
  const [tecnici, setTecnici] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [ordini, setOrdini] = useState([]);

  const initialSessionCheckTriggered = useRef(false);
  const sessionRef = useRef(session); 
  useEffect(() => {
    sessionRef.current = session;
    // console.log("APP.JSX: sessionRef aggiornato. Nuovo ruolo in ref:", sessionRef.current?.user?.role);
  }, [session]);

  // useEffect per la sessione
  useEffect(() => {
    // console.log("APP.JSX: useEffect principale (sessione) - ESECUZIONE");
    
    const fetchProfileAndUpdateSessionState = async (currentAuthSession, isTabFocusRelatedEvent = false) => {
        const currentReactSessionForFallback = sessionRef.current;
        if (!currentAuthSession || !currentAuthSession.user) {
            setSession(null); return;
        }
        try {
            const profilePromise = supabase.from('profiles').select('role, full_name').eq('id', currentAuthSession.user.id).single();
            const timeoutDuration = isTabFocusRelatedEvent ? 5000 : 7000;
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout fetch profilo (${timeoutDuration/1000} secondi)`)), timeoutDuration));
            const { data: profile, error: profileError } = await Promise.race([profilePromise, timeoutPromise]);
            if (profileError) {
                if (currentReactSessionForFallback?.user?.id === currentAuthSession.user.id && currentReactSessionForFallback.user.role) {
                    setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: currentReactSessionForFallback.user.role, full_name: currentReactSessionForFallback.user.full_name } });
                } else {
                    setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: 'user', full_name: currentAuthSession.user.email } });
                }
            } else if (profile) {
                setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, ...profile } });
            } else { 
                setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: 'user', full_name: currentAuthSession.user.email } });
            }
        } catch (e) {
            if (currentReactSessionForFallback?.user?.id === currentAuthSession?.user?.id && currentReactSessionForFallback.user.role) {
                setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: currentReactSessionForFallback.user.role, full_name: currentReactSessionForFallback.user.full_name } });
            } else if (currentAuthSession && currentAuthSession.user) {
                setSession({ ...currentAuthSession, user: { ...currentAuthSession.user, role: 'user', full_name: currentAuthSession.user.email } });
            } else { setSession(null); }
        }
    };

    if (!initialSessionCheckTriggered.current) {
        setLoadingSession(true);
        supabase.auth.getSession()
            .then(async ({ data: { session: cs } }) => { await fetchProfileAndUpdateSessionState(cs); })
            .catch(err => { console.error("APP.JSX: Critical exception in getSession() promise:", err); setSession(null); })
            .finally(() => { setLoadingSession(false); });
        initialSessionCheckTriggered.current = true;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newAuthSession) => {
        const currentReactUserFromRef = sessionRef.current?.user; 
        const newAuthUserId = newAuthSession?.user?.id;
        const userActuallyChanged = currentReactUserFromRef?.id !== newAuthUserId;

        if ((_event === 'SIGNED_IN' || _event === 'TOKEN_REFRESHED') && !userActuallyChanged) {
            await fetchProfileAndUpdateSessionState(newAuthSession, true);
        } else if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'PASSWORD_RECOVERY', 'INITIAL_SESSION'].includes(_event) && userActuallyChanged) {
            setLoadingSession(true);
            try { await fetchProfileAndUpdateSessionState(newAuthSession); } 
            catch (e) { console.error(`APP.JSX: onAuthStateChange (${_event}) - Exception:`, e); } 
            finally { setLoadingSession(false); }
        }
    });
    
    return () => { if (subscription) subscription.unsubscribe(); };
  }, []);

  // useEffect per caricare dati comuni (anagrafiche)
  useEffect(() => {
    const fetchCommonData = async () => {
      if (session && session.user) {
        setLoadingAnagrafiche(true); 
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
            console.error("APP.JSX: Eccezione imprevista durante fetchCommonData:", e);
            setClienti([]); setTecnici([]); setCommesse([]); setOrdini([]);
        } finally {
            setLoadingAnagrafiche(false);
        }
      } else {
        setClienti([]); setTecnici([]); setCommesse([]); setOrdini([]);
        setLoadingAnagrafiche(false);
      }
    };
    fetchCommonData();
  }, [session]); 

  // useEffect per Page Visibility API
  useEffect(() => { 
    let visibilityTimeoutId = null;
    const handleVisibilityChange = async () => { 
      if (!document.hidden) {
        const currentReactSess = sessionRef.current; 
        if (currentReactSess && currentReactSess.user) {
            try { await supabase.auth.refreshSession(); } 
            catch (e) { console.error("PAGE VISIBILITY: Eccezione refreshSession():", e); }
        }
        if (visibilityTimeoutId) clearTimeout(visibilityTimeoutId);
        visibilityTimeoutId = setTimeout(() => {
            if (!document.hidden && loadingSession && sessionRef.current && sessionRef.current.user) {
                 setLoadingSession(false);
            }
        }, 2000); 
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (visibilityTimeoutId) clearTimeout(visibilityTimeoutId);
    };
  }, [loadingSession]); 

  const handleLogout = async () => { 
    setLoadingSession(true); 
    const { error } = await supabase.auth.signOut();
    if (error) { 
      alert("Errore logout: " + error.message); 
      setLoadingSession(false); 
    } else { 
        setClienti([]); setTecnici([]); setCommesse([]); setOrdini([]);
        navigate('/login'); 
    }
  };

  if (loadingSession) { 
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', backgroundColor:'#f0f2f5' }}>
        <div className="spinner"></div>
        <p style={{fontSize: '1.2em', marginTop:'20px', color:'#333'}}>Caricamento sessione...</p>
      </div>
    );
  }

  const userRole = session?.user?.role;
  const canCreateNewSheet = userRole === 'admin' || userRole === 'user';

  return ( 
    <div className="app-container">
      <header>
        <h1>Oilsafe Service Hub v{__APP_VERSION__}</h1>
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
            <Route 
              path="/fogli-assistenza" 
              element={
                <FogliAssistenzaListPage 
                  session={session} 
                  loadingAnagrafiche={loadingAnagrafiche}
                  clienti={clienti} 
                  tecnici={tecnici} 
                  commesse={commesse} 
                  ordini={ordini}
                />
              } 
            />
            <Route 
              path="/fogli-assistenza/nuovo" 
              element={
                canCreateNewSheet ? 
                <FoglioAssistenzaFormPage session={session} clienti={clienti} commesse={commesse} ordini={ordini} />
                : <Navigate to="/" replace />
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