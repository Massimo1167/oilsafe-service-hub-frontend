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

// Componente per Rotte Protette
function ProtectedRoute({ session }) {
  if (!session) {
    // Se l'utente non è loggato, reindirizza alla pagina di login
    // `replace` evita che la rotta protetta finisca nella cronologia di navigazione
    return <Navigate to="/login" replace />;
  }
  // Se l'utente è loggato, renderizza il contenuto della rotta figlia (usando Outlet)
  return <Outlet />;
}

function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const navigate = useNavigate();

  // Dati per i dropdown delle anagrafiche (caricati una volta dopo il login)
  const [clienti, setClienti] = useState([]);
  const [tecnici, setTecnici] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [ordini, setOrdini] = useState([]); // Non usato come prop nei manager, ma potresti volerlo

  useEffect(() => {
    setLoadingSession(true);
    const fetchCurrentSessionAndProfile = async () => {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Errore nel recuperare la sessione:", sessionError);
        setSession(null);
        setLoadingSession(false);
        return;
      }
      
      if (currentSession) {
        // Se c'è una sessione, recupera il profilo (e quindi il ruolo) dell'utente
        const { data: profile, error: profileError } = await supabase
          .from('profiles') // Assicurati che questa tabella esista e abbia la colonna 'role'
          .select('role, full_name') // Aggiungi altri campi del profilo se necessario
          .eq('id', currentSession.user.id)
          .single();

        if (profileError) {
          console.error("Errore fetch profilo:", profileError.message, "per utente:", currentSession.user.id);
          // Fallback: assegna un ruolo 'user' e usa l'email come nome
          // Questo potrebbe accadere se il trigger per creare il profilo non è scattato o è fallito
          setSession({ ...currentSession, user: { ...currentSession.user, role: 'user', full_name: currentSession.user.email } });
        } else if (profile) {
          // Aggiungi il ruolo e altri dati del profilo all'oggetto sessione
          setSession({ ...currentSession, user: { ...currentSession.user, ...profile } });
        } else {
            console.warn("Profilo non trovato per l'utente:", currentSession.user.id, "Assegno ruolo 'user' di default.");
            setSession({ ...currentSession, user: { ...currentSession.user, role: 'user', full_name: currentSession.user.email } });
        }
      } else {
        setSession(null);
      }
      setLoadingSession(false);
    };

    fetchCurrentSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      // Quando lo stato dell'autenticazione cambia (login/logout), aggiorna la sessione e il profilo
      setLoadingSession(true); // Indica che stiamo ricaricando i dati della sessione/profilo
      if (newSession) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', newSession.user.id)
          .single();

        if (profileError) {
          console.error("Errore fetch profilo (onAuthStateChange):", profileError.message);
          setSession({ ...newSession, user: { ...newSession.user, role: 'user', full_name: newSession.user.email } });
        } else if (profile) {
          setSession({ ...newSession, user: { ...newSession.user, ...profile } });
        } else {
            console.warn("Profilo non trovato (onAuthStateChange) per utente:", newSession.user.id);
            setSession({ ...newSession, user: { ...newSession.user, role: 'user', full_name: newSession.user.email } });
        }
      } else {
        setSession(null);
      }
      setLoadingSession(false);
    });

    // Pulisci la sottoscrizione quando il componente App viene smontato
    return () => {
      subscription.unsubscribe();
    };
  }, []); // Esegui solo al mount del componente App

  // Carica i dati comuni (clienti, tecnici, ecc.) SOLO SE l'utente è loggato
  useEffect(() => {
    const fetchCommonData = async () => {
      if (session) { // Solo se c'è una sessione attiva
        // Mostra un indicatore di caricamento per questi dati se necessario
        const [clientiRes, tecniciRes, commesseRes, ordiniRes] = await Promise.all([
            supabase.from('clienti').select('*').order('nome_azienda'),
            supabase.from('tecnici').select('*').order('cognome'),
            supabase.from('commesse').select('*').order('codice_commessa'),
            supabase.from('ordini_cliente').select('*').order('numero_ordine_cliente')
        ]);
        
        setClienti(clientiRes.data || []);
        if(clientiRes.error) console.error("Errore fetch clienti:", clientiRes.error.message);
        
        setTecnici(tecniciRes.data || []);
        if(tecniciRes.error) console.error("Errore fetch tecnici:", tecniciRes.error.message);

        setCommesse(commesseRes.data || []);
        if(commesseRes.error) console.error("Errore fetch commesse:", commesseRes.error.message);
        
        setOrdini(ordiniRes.data || []); // Anche se non lo passiamo come prop, è bene averlo se serve
        if(ordiniRes.error) console.error("Errore fetch ordini:", ordiniRes.error.message);

      } else {
        // Se l'utente fa logout, svuota le anagrafiche per evitare di mostrare dati vecchi
        setClienti([]);
        setTecnici([]);
        setCommesse([]);
        setOrdini([]);
      }
    };

    fetchCommonData();
  }, [session]); // Riesegui quando la sessione cambia (login/logout)


  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Errore durante il logout:", error);
      alert("Errore durante il logout: " + error.message);
    } else {
      // onAuthStateChange gestirà l'aggiornamento di `session` a null
      navigate('/login'); // Reindirizza alla pagina di login dopo il logout
    }
  };

  if (loadingSession) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Caricamento applicazione...</p> {/* Sostituisci con uno spinner/logo */}
      </div>
    );
  }

  const userRole = session?.user?.role;

  return (
    <div className="app-container">
      <header>
        <h1>Oilsafe Service Hub</h1>
        {session && ( // Mostra la navigazione solo se l'utente è loggato (tranne il link di login)
          <nav>
            <Link to="/">Dashboard</Link>
            <Link to="/fogli-assistenza">Fogli Assistenza</Link>
            
            {/* Link alle anagrafiche visibili solo per admin e manager */}
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
              style={{ marginLeft: 'auto', background:'transparent', border:'1px solid white', color:'white', cursor:'pointer', padding: '0.3rem 0.6rem', borderRadius:'4px' }}
              title={`Logout ${session.user.full_name || session.user.email}`}
            >
              Logout
            </button>
          </nav>
        )}
      </header>
      <main>
        <Routes>
          <Route path="/login" element={!session ? <LoginPage /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!session ? <SignupPage /> : <Navigate to="/" replace />} />

          {/* Rotte Protette */}
          <Route element={<ProtectedRoute session={session} />}>
            <Route path="/" element={<DashboardPage session={session} />} />
            <Route path="/fogli-assistenza" element={<FogliAssistenzaListPage session={session} />} />
            <Route 
              path="/fogli-assistenza/nuovo" 
              element={
                (userRole === 'admin' || userRole === 'user') ? // Solo admin e user possono creare fogli
                <FoglioAssistenzaFormPage
                  session={session}
                  clienti={clienti}
                  commesse={commesse}
                  ordini={ordini}
                  // utentiPerAssegnazione={utenti} // Potresti passare una lista di utenti se admin può assegnare
                />
                : <Navigate to="/" replace /> // O una pagina "Accesso Negato"
              }
            />
            <Route 
              path="/fogli-assistenza/:foglioId" 
              element={
                <FoglioAssistenzaDetailPage
                  session={session}
                  tecnici={tecnici} 
                />} 
            />
            {/* Aggiungi qui altre rotte protette */}

            {/* Rotte Anagrafiche (protette e con controllo di ruolo aggiuntivo se necessario) */}
            {(userRole === 'admin' || userRole === 'manager') && (
              <>
                <Route path="/clienti" element={<ClientiManager session={session} />} />
                <Route path="/tecnici" element={<TecniciManager session={session} />} />
                <Route path="/commesse" element={<CommesseManager session={session} clienti={clienti} />} />
                <Route path="/ordini" element={<OrdiniClienteManager session={session} clienti={clienti} commesse={commesse} />} />
              </>
            )}
          </Route>

          {/* Fallback: se nessuna rotta corrisponde e l'utente è loggato, va alla dashboard. Altrimenti al login. */}
          <Route path="*" element={<Navigate to={session ? "/" : "/login"} replace />} />
        </Routes>
      </main>
      <footer>
        <p>© {new Date().getFullYear()} Oilsafe S.r.l.</p>
      </footer>
    </div>
  );
}

export default App;