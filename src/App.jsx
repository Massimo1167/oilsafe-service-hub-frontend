/**
 * Root component that defines application routes and global state.
 * Manages user session via Supabase and shares common data (clienti,
 * tecnici, commesse, ordini) with the pages. Uses React Router for
 * navigation and shows different pages based on authentication.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, Link, useNavigate, Navigate, Outlet } from 'react-router-dom';
import { supabase } from './supabaseClient';

// Importa Pagine
import DashboardPage from './pages/DashboardPage';
import InfoPage from './pages/InfoPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import FogliAssistenzaListPage from './pages/FogliAssistenzaListPage';
import FoglioAssistenzaFormPage from './pages/FoglioAssistenzaFormPage';
import FoglioAssistenzaDetailPage from './pages/FoglioAssistenzaDetailPage';
import FoglioAttivitaStandardPage from './pages/FoglioAttivitaStandardPage';
import CalendarioFogliPage from './pages/CalendarioFogliPage';
import GestionePianificazionePage from './pages/GestionePianificazionePage';
import ProgrammazioneSettimanalePage from './pages/ProgrammazioneSettimanalePage';
import StatistichePage from './pages/StatistichePage';
import ScadenzeMezziPage from './pages/ScadenzeMezziPage';
import CalendarioScadenzeMezziPage from './pages/CalendarioScadenzeMezziPage';
import ConfigurazioneAppPage from './pages/ConfigurazioneAppPage';
import AnagrafichePage from './pages/AnagrafichePage';
import PianificazioniPage from './pages/PianificazioniPage';

// Importa Componenti Manager Anagrafiche
import ClientiManager from './components/anagrafiche/ClientiManager';
import TecniciManager from './components/anagrafiche/TecniciManager';
import CommesseManager from './components/anagrafiche/CommesseManager';
import OrdiniInterniManager from './components/anagrafiche/OrdiniInterniManager';
import MansioniManager from './components/anagrafiche/MansioniManager';
import AttivitaStandardManager from './components/anagrafiche/AttivitaStandardManager';
import UnitaMisuraManager from './components/anagrafiche/UnitaMisuraManager';
import MezziTrasportoManager from './components/anagrafiche/MezziTrasportoManager';
import RepartiManager from './components/anagrafiche/RepartiManager';

// Importa Performance Monitoring
import AdminMonitoringPage from './pages/AdminMonitoringPage';
import { initPerformanceTracking, trackPageLoad, flushPerformanceLogs } from './utils/performanceTracker';

import './App.css';

// Componente per Rotte Protette
function ProtectedRoute({ session }) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <Outlet />;
}

function App() {
  const dbLabel = import.meta.env.VITE_SUPABASE_DB_LABEL;
  const headerBgColor =
    dbLabel === 'Oilsafe-Assistenza_main'
      ? '#003366'
      : dbLabel === 'Oilsafe-Assistenza_Debug'
        ? 'red'
        : undefined;

  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  // NUOVO: Stato di caricamento specifico per le anagrafiche
  const [loadingAnagrafiche, setLoadingAnagrafiche] = useState(true);

  // Stati per dati comuni (anagrafiche)
  const [clienti, setClienti] = useState([]);
  const [tecnici, setTecnici] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [ordini, setOrdini] = useState([]);
  const [mansioni, setMansioni] = useState([]);
  const [mezzi, setMezzi] = useState([]);
  const [reparti, setReparti] = useState([]);
  const [configurazioni, setConfigurazioni] = useState({
    userVedeTuttePianificazioni: true,
  });

  const initialSessionCheckTriggered = useRef(false);
  const sessionRef = useRef(session); 
  useEffect(() => {
    sessionRef.current = session;
    // console.log("APP.JSX: sessionRef aggiornato. Nuovo ruolo in ref:", sessionRef.current?.user?.role);
  }, [session?.user?.id]);

  // useEffect per la sessione
  useEffect(() => {
    // console.log("APP.JSX: useEffect principale (sessione) - ESECUZIONE");
    
    const fetchProfileAndUpdateSessionState = async (currentAuthSession, isTabFocusRelatedEvent = false) => {
        const currentReactSessionForFallback = sessionRef.current;
        if (!currentAuthSession || !currentAuthSession.user) {
            setSession(null); return;
        }
        try {
            const profilePromise = supabase
                .from('profiles')
                .select('role, full_name')
                .eq('id', currentAuthSession.user.id)
                .single();
            const timeoutDuration = isTabFocusRelatedEvent ? 5000 : 7000;
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Timeout fetch profilo (${timeoutDuration/1000} secondi)`)), timeoutDuration));
            const { data: profile, error: profileError } = await Promise.race([profilePromise, timeoutPromise]);
            if (profileError) {
                if (
                    currentReactSessionForFallback?.user?.id === currentAuthSession.user.id &&
                    currentReactSessionForFallback.user.role
                ) {
                    const newSession = {
                        ...currentAuthSession,
                        user: {
                            ...currentAuthSession.user,
                            role: (currentReactSessionForFallback.user.role || 'user').trim().toLowerCase(),
                            full_name: currentReactSessionForFallback.user.full_name,
                        },
                    };
                    setSession(newSession);
                    console.debug('APP.JSX: setSession fallback role', newSession.user.role);
                } else {
                    const newSession = {
                        ...currentAuthSession,
                        user: {
                            ...currentAuthSession.user,
                            role: 'user',
                            full_name: currentAuthSession.user.email,
                        },
                    };
                    setSession(newSession);
                    console.debug('APP.JSX: setSession default role', newSession.user.role);
                }
            } else if (profile) {
                const normalizedRole = (profile.role || 'user').trim().toLowerCase();
                const newSession = {
                    ...currentAuthSession,
                    user: {
                        ...currentAuthSession.user,
                        ...profile,
                        role: normalizedRole,
                    },
                };
                setSession(newSession);
                console.debug('APP.JSX: setSession profile role', newSession.user.role);
            } else {
                const newSession = {
                    ...currentAuthSession,
                    user: {
                        ...currentAuthSession.user,
                        role: 'user',
                        full_name: currentAuthSession.user.email,
                    },
                };
                setSession(newSession);
                console.debug('APP.JSX: setSession no profile role', newSession.user.role);
            }
        } catch (e) {
            if (
                currentReactSessionForFallback?.user?.id === currentAuthSession?.user?.id &&
                currentReactSessionForFallback.user.role
            ) {
                const newSession = {
                    ...currentAuthSession,
                    user: {
                        ...currentAuthSession.user,
                        role: (currentReactSessionForFallback.user.role || 'user').trim().toLowerCase(),
                        full_name: currentReactSessionForFallback.user.full_name,
                    },
                };
                setSession(newSession);
                console.debug('APP.JSX: setSession exception fallback role', newSession.user.role);
            } else if (currentAuthSession && currentAuthSession.user) {
                const newSession = {
                    ...currentAuthSession,
                    user: {
                        ...currentAuthSession.user,
                        role: 'user',
                        full_name: currentAuthSession.user.email,
                    },
                };
                setSession(newSession);
                console.debug('APP.JSX: setSession exception default role', newSession.user.role);
            } else {
                setSession(null);
                }
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

  // useEffect per inizializzare performance tracking
  useEffect(() => {
    if (session && session.user && session.user.role) {
      const userRole = (session.user.role || '').trim().toLowerCase();

      // Inizializza tracking
      initPerformanceTracking(session.user.id, userRole);

      // Track page load iniziale
      trackPageLoad(window.location.pathname);

      // Flush logs prima di chiudere pagina
      const handleBeforeUnload = () => {
        flushPerformanceLogs();
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [session?.user?.id, session?.user?.role]);

  // useEffect per caricare dati comuni (anagrafiche)
  useEffect(() => {
    const fetchCommonData = async () => {
      if (session && session.user) {
        setLoadingAnagrafiche(true); 
        try {
            const [clientiRes, tecniciRes, commesseRes, ordiniRes, mansioniRes, mezziRes, repartiRes] = await Promise.all([
                supabase.from('clienti').select('*').order('nome_azienda'),
                supabase.from('tecnici').select('*').order('cognome'),
                supabase.from('commesse').select('*').order('codice_commessa'),
                supabase.from('ordini_interni').select('*').order('numero_ordine_cliente'),
                supabase.from('mansioni').select('*').eq('attivo', true).order('categoria').order('livello'),
                supabase.from('mezzi_trasporto').select('*').order('targa'),
                supabase.from('reparti').select('*').eq('attivo', true).order('codice')
            ]);

            setClienti(clientiRes.data || []);
            if(clientiRes.error) console.error("APP.JSX: Errore fetch clienti:", clientiRes.error.message);

            setTecnici(tecniciRes.data || []);
            if(tecniciRes.error) console.error("APP.JSX: Errore fetch tecnici:", tecniciRes.error.message);

            setCommesse(commesseRes.data || []);
            if(commesseRes.error) console.error("APP.JSX: Errore fetch commesse:", commesseRes.error.message);

            setOrdini(ordiniRes.data || []);
            if(ordiniRes.error) console.error("APP.JSX: Errore fetch ordini:", ordiniRes.error.message);

            setMansioni(mansioniRes.data || []);
            if(mansioniRes.error) console.error("APP.JSX: Errore fetch mansioni:", mansioniRes.error.message);

            setMezzi(mezziRes.data || []);
            if(mezziRes.error) console.error("APP.JSX: Errore fetch mezzi:", mezziRes.error.message);

            setReparti(repartiRes.data || []);
            if(repartiRes.error) console.error("APP.JSX: Errore fetch reparti:", repartiRes.error.message);

            // Carica configurazioni app
            const { data: configData, error: configError } = await supabase
              .from('app_configurazioni')
              .select('chiave, valore')
              .in('chiave', ['user_visualizza_tutte_pianificazioni']);

            if (configData) {
              const configs = {};
              configData.forEach(config => {
                if (config.chiave === 'user_visualizza_tutte_pianificazioni') {
                  configs.userVedeTuttePianificazioni = config.valore?.abilitato ?? true;
                }
              });
              setConfigurazioni(configs);
            }
            if(configError) console.error("APP.JSX: Errore fetch configurazioni:", configError.message);
        } catch (e) {
            console.error("APP.JSX: Eccezione imprevista durante fetchCommonData:", e);
            setClienti([]); setTecnici([]); setCommesse([]); setOrdini([]); setMansioni([]); setMezzi([]); setReparti([]);
        } finally {
            setLoadingAnagrafiche(false);
        }
      } else {
        setClienti([]); setTecnici([]); setCommesse([]); setOrdini([]); setMezzi([]); setReparti([]);
        setLoadingAnagrafiche(false);
      }
    };
    fetchCommonData();
  }, [session?.user?.id]);

  // NUOVO: Funzione per ricaricare tutte le anagrafiche quando vengono modificate dai Manager
  const reloadAnagrafiche = useCallback(async () => {
    console.log('APP.JSX: Ricaricamento anagrafiche richiesto...');
    if (session && session.user) {
      setLoadingAnagrafiche(true);
      try {
        const [clientiRes, tecniciRes, commesseRes, ordiniRes, mansioniRes, mezziRes, repartiRes] = await Promise.all([
          supabase.from('clienti').select('*').order('nome_azienda'),
          supabase.from('tecnici').select('*').order('cognome'),
          supabase.from('commesse').select('*').order('codice_commessa'),
          supabase.from('ordini_interni').select('*').order('numero_ordine_cliente'),
          supabase.from('mansioni').select('*').eq('attivo', true).order('categoria').order('livello'),
          supabase.from('mezzi_trasporto').select('*').order('targa'),
          supabase.from('reparti').select('*').eq('attivo', true).order('codice')
        ]);

        setClienti(clientiRes.data || []);
        if(clientiRes.error) console.error("APP.JSX: Errore ricarica clienti:", clientiRes.error.message);

        setTecnici(tecniciRes.data || []);
        if(tecniciRes.error) console.error("APP.JSX: Errore ricarica tecnici:", tecniciRes.error.message);

        setCommesse(commesseRes.data || []);
        if(commesseRes.error) console.error("APP.JSX: Errore ricarica commesse:", commesseRes.error.message);

        setOrdini(ordiniRes.data || []);
        if(ordiniRes.error) console.error("APP.JSX: Errore ricarica ordini:", ordiniRes.error.message);

        setMansioni(mansioniRes.data || []);
        if(mansioniRes.error) console.error("APP.JSX: Errore ricarica mansioni:", mansioniRes.error.message);

        setMezzi(mezziRes.data || []);
        if(mezziRes.error) console.error("APP.JSX: Errore ricarica mezzi:", mezziRes.error.message);

        setReparti(repartiRes.data || []);
        if(repartiRes.error) console.error("APP.JSX: Errore ricarica reparti:", repartiRes.error.message);

        console.log('APP.JSX: Anagrafiche ricaricate con successo');
      } catch (e) {
        console.error("APP.JSX: Eccezione durante ricaricamento anagrafiche:", e);
      } finally {
        setLoadingAnagrafiche(false);
      }
    }
  }, [session?.user?.id]);

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

  const userRole = (session?.user?.role || '').trim().toLowerCase();
  const canCreateNewSheet = userRole === 'admin' || userRole === 'manager' || userRole === 'user';

  return (
    <div className="app-container">
      <header style={{ backgroundColor: headerBgColor }}>
        <h1>Oilsafe Service FLE ver.{__APP_VERSION__}</h1>
        {session && session.user && (
          <>
            <button
              className="hamburger-menu-button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="hamburger-icon">
                {mobileMenuOpen ? '✕' : '☰'}
              </span>
            </button>
            <nav className={mobileMenuOpen ? 'nav-open' : ''}>
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
              <Link to="/fogli-assistenza" onClick={() => setMobileMenuOpen(false)}>Fogli Assistenza</Link>
              <Link to="/pianificazioni-menu" onClick={() => setMobileMenuOpen(false)}>Pianificazioni</Link>
              {(userRole === 'admin' || userRole === 'manager') && (
                <>
                  <Link to="/anagrafiche" onClick={() => setMobileMenuOpen(false)}>Anagrafiche</Link>
                  <Link to="/statistiche" onClick={() => setMobileMenuOpen(false)}>Statistiche</Link>
                </>
              )}
              {userRole === 'admin' && (
                <>
                  <Link to="/configurazione" onClick={() => setMobileMenuOpen(false)}>Configurazione</Link>
                  <Link to="/admin-monitoring" onClick={() => setMobileMenuOpen(false)}>Monitoraggio</Link>
                </>
              )}
              <Link to="/info" className="nav-info-icon" title="Informazioni applicazione" onClick={() => setMobileMenuOpen(false)}>
                ℹ️
              </Link>
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="button-logout"
                title={`Logout ${(session.user.full_name || session.user.email)}`}
              >
                Logout ({ (session.user.full_name || session.user.email || 'Utente').substring(0,15) }
                { (session.user.full_name || session.user.email)?.length > 15 ? '...' : '' })
              </button>
            </nav>
          </>
        )}
      </header>
      <main>
        <Routes>
          <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!session ? <SignupPage /> : <Navigate to="/" replace />} />
          <Route element={<ProtectedRoute session={session} />}>
            <Route path="/" element={<DashboardPage session={session} userRole={userRole} />} />
            <Route path="/info" element={<InfoPage />} />
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
                <FoglioAssistenzaFormPage session={session} clienti={clienti} commesse={commesse} ordini={ordini} tecnici={tecnici} />
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
                    tecnici={tecnici}
                />
              }
            />
            <Route
              path="/fogli-assistenza/:foglioId"
              element={<FoglioAssistenzaDetailPage session={session} tecnici={tecnici} />}
            />
            <Route
              path="/fogli-assistenza/:foglioId/attivita-standard"
              element={<FoglioAttivitaStandardPage session={session} />}
            />
            <Route
              path="/fogli-assistenza/calendario"
              element={
                <CalendarioFogliPage
                  clienti={clienti}
                  tecnici={tecnici}
                  commesse={commesse}
                />
              }
            />
            <Route
              path="/pianificazioni-menu"
              element={<PianificazioniPage userRole={userRole} />}
            />
            <Route
              path="/gestione-pianificazione"
              element={
                <GestionePianificazionePage
                  session={session}
                  clienti={clienti}
                  tecnici={tecnici}
                  commesse={commesse}
                  mezzi={mezzi}
                  userRole={userRole}
                  configurazioni={configurazioni}
                />
              }
            />
            <Route
              path="/programmazione-settimanale"
              element={
                <ProgrammazioneSettimanalePage
                  user={session?.user}
                  userRole={userRole}
                  tecnici={tecnici}
                  commesse={commesse}
                  clienti={clienti}
                  reparti={reparti}
                  configurazioni={configurazioni}
                />
              }
            />
            {(userRole === 'admin' || userRole === 'manager') && (
              <>
                <Route path="/anagrafiche" element={<AnagrafichePage />} />
                <Route path="/clienti" element={<ClientiManager session={session} onDataChanged={reloadAnagrafiche} />} />
                <Route path="/tecnici" element={<TecniciManager session={session} mansioni={mansioni} reparti={reparti} onDataChanged={reloadAnagrafiche} />} />
                <Route path="/commesse" element={<CommesseManager session={session} clienti={clienti} onDataChanged={reloadAnagrafiche} />} />
                <Route path="/ordini" element={<OrdiniInterniManager session={session} clienti={clienti} commesse={commesse} onDataChanged={reloadAnagrafiche} />} />
                <Route path="/mansioni" element={<MansioniManager session={session} onDataChanged={reloadAnagrafiche} />} />
                <Route path="/reparti" element={<RepartiManager session={session} onDataChanged={reloadAnagrafiche} />} />
                <Route path="/unita-misura" element={<UnitaMisuraManager session={session} onDataChanged={reloadAnagrafiche} />} />
                <Route path="/attivita-standard" element={<AttivitaStandardManager session={session} onDataChanged={reloadAnagrafiche} />} />
                <Route path="/mezzi" element={<MezziTrasportoManager session={session} onDataChanged={reloadAnagrafiche} />} />
                <Route path="/scadenze-mezzi" element={<ScadenzeMezziPage session={session} />} />
                <Route path="/mezzi/calendario-scadenze" element={<CalendarioScadenzeMezziPage session={session} />} />
              </>
            )}
            {(userRole === 'admin' || userRole === 'manager') && (
              <Route path="/statistiche" element={<StatistichePage session={session} />} />
            )}
            {userRole === 'admin' && (
              <>
                <Route path="/configurazione" element={<ConfigurazioneAppPage session={session} />} />
                <Route path="/admin-monitoring" element={<AdminMonitoringPage session={session} />} />
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