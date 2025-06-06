// src/App.jsx
import React, { useState, useEffect } from 'react';
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

  const [clienti, setClienti] = useState([]);
  const [tecnici, setTecnici] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [ordini, setOrdini] = useState([]);

  useEffect(() => {
    setLoadingSession(true);
    const fetchCurrentSessionAndProfile = async () => {
      // ... (Logica fetch sessione e profilo come prima) ...
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) { console.error("Errore sessione:", sessionError); setSession(null); setLoadingSession(false); return; }
      if (currentSession) {
        const { data: profile, error: profileError } = await supabase.from('profiles').select('role, full_name').eq('id', currentSession.user.id).single();
        if (profileError) { console.error("Errore profilo:", profileError.message); setSession({ ...currentSession, user: { ...currentSession.user, role: 'user', full_name: currentSession.user.email } });
        } else if (profile) { setSession({ ...currentSession, user: { ...currentSession.user, ...profile } });
        } else { console.warn("Profilo non trovato:", currentSession.user.id); setSession({ ...currentSession, user: { ...currentSession.user, role: 'user', full_name: currentSession.user.email } });}
      } else { setSession(null); }
      setLoadingSession(false);
    };
    fetchCurrentSessionAndProfile();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setLoadingSession(true);
      if (newSession) {
        const { data: profile, error: profileError } = await supabase.from('profiles').select('role, full_name').eq('id', newSession.user.id).single();
        if (profileError) { console.error("Errore profilo (authChange):", profileError.message); setSession({ ...newSession, user: { ...newSession.user, role: 'user', full_name: newSession.user.email } });
        } else if (profile) { setSession({ ...newSession, user: { ...newSession.user, ...profile } });
        } else { console.warn("Profilo non trovato (authChange):", newSession.user.id); setSession({ ...newSession, user: { ...newSession.user, role: 'user', full_name: newSession.user.email } });}
      } else { setSession(null); }
      setLoadingSession(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchCommonData = async () => {
      if (session) {
        const [clientiRes, tecniciRes, commesseRes, ordiniRes] = await Promise.all([
            supabase.from('clienti').select('*').order('nome_azienda'),
            supabase.from('tecnici').select('*').order('cognome'),
            supabase.from('commesse').select('*').order('codice_commessa'),
            supabase.from('ordini_cliente').select('*').order('numero_ordine_cliente')
        ]);
        setClienti(clientiRes.data || []); if(clientiRes.error) console.error("Err clienti:", clientiRes.error.message);
        setTecnici(tecniciRes.data || []); if(tecniciRes.error) console.error("Err tecnici:", tecniciRes.error.message);
        setCommesse(commesseRes.data || []); if(commesseRes.error) console.error("Err commesse:", commesseRes.error.message);
        setOrdini(ordiniRes.data || []); if(ordiniRes.error) console.error("Err ordini:", ordiniRes.error.message);
      } else {
        setClienti([]); setTecnici([]); setCommesse([]); setOrdini([]);
      }
    };
    fetchCommonData();
  }, [session]);

  const handleLogout = async () => { /* ... (come prima) ... */ 
    const { error } = await supabase.auth.signOut();
    if (error) { console.error("Logout err:", error); alert("Logout err: " + error.message); }
    else { navigate('/login'); }
  };

  if (loadingSession) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}><p>Caricamento...</p></div>;

  const userRole = session?.user?.role;

  // Permessi per creare un nuovo foglio
  const canCreateNewSheet = userRole === 'admin' || userRole === 'user';

  return (
    <div className="app-container">
      <header>
        <h1>Oilsafe Service Hub</h1>
        {session && (
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
            <button onClick={handleLogout} style={{ marginLeft: 'auto', background:'transparent', border:'1px solid white', color:'white', cursor:'pointer', padding: '0.3rem 0.6rem', borderRadius:'4px' }} title={`Logout ${session.user.full_name || session.user.email}`}>
              Logout
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
                : <Navigate to="/" replace state={{ error: "Accesso negato" }} />
              }
            />
            <Route 
              path="/fogli-assistenza/:foglioIdParam/modifica" // Rotta per la MODIFICA
              element={
                // I permessi di modifica sono gestiti all'interno di FoglioAssistenzaFormPage e FoglioAssistenzaDetailPage
                // basati sul ruolo e sulla proprietà del foglio. Qui ci assicuriamo solo che sia loggato.
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
              element={
                <FoglioAssistenzaDetailPage session={session} tecnici={tecnici} />} 
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