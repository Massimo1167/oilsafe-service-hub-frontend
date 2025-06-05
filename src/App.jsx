import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient'; // Assicurati che questo file esista e sia configurato

// Importa le tue pagine e componenti
// Pagine principali (da creare)
import DashboardPage from './pages/DashboardPage';
import FogliAssistenzaListPage from './pages/FogliAssistenzaListPage';
import FoglioAssistenzaFormPage from './pages/FoglioAssistenzaFormPage';
import FoglioAssistenzaDetailPage from './pages/FoglioAssistenzaDetailPage';

// Componenti anagrafici (presumendo che tu li abbia già)
import ClientiManager from './components/Anagrafiche/ClientiManager';
import TecniciManager from './components/Anagrafiche/TecniciManager';
import CommesseManager from './components/Anagrafiche/CommesseManager';
import OrdiniClienteManager from './components/Anagrafiche/OrdiniClienteManager';

import './App.css'; // Il tuo CSS globale

function App() {
  // Potresti voler gestire lo stato di autenticazione qui
  // const [session, setSession] = useState(null);
  // useEffect(() => {
  //   supabase.auth.getSession().then(({ data: { session } }) => {
  //     setSession(session);
  //   });
  //   const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
  //     setSession(session);
  //   });
  //   return () => subscription.unsubscribe();
  // }, []);

  // Per ora, semplice navigazione
  // Dati per i dropdown delle anagrafiche (caricati una volta)
  const [clienti, setClienti] = useState([]);
  const [tecnici, setTecnici] = useState([]);
  const [commesse, setCommesse] = useState([]);
  const [ordini, setOrdini] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: clientiData } = await supabase.from('clienti').select('*').order('nome_azienda');
      setClienti(clientiData || []);
      const { data: tecniciData } = await supabase.from('tecnici').select('*').order('cognome');
      setTecnici(tecniciData || []);
      const { data: commesseData } = await supabase.from('commesse').select('*').order('codice_commessa');
      setCommesse(commesseData || []);
      const { data: ordiniData } = await supabase.from('ordini_cliente').select('*').order('numero_ordine_cliente');
      setOrdini(ordiniData || []);
    };
    fetchData();
  }, []);


  return (
    <div className="app-container">
      <header>
        <h1>Oilsafe Service Hub</h1>
        <nav>
          <Link to="/">Dashboard</Link> |
          <Link to="/fogli-assistenza">Fogli Assistenza</Link> |
          <Link to="/clienti">Clienti</Link> |
          <Link to="/tecnici">Tecnici</Link> |
          <Link to="/commesse">Commesse</Link> |
          <Link to="/ordini">Ordini</Link>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/fogli-assistenza" element={<FogliAssistenzaListPage />} />
          <Route path="/fogli-assistenza/nuovo" element={
            <FoglioAssistenzaFormPage
              clienti={clienti}
              commesse={commesse}
              ordini={ordini}
            />}
          />
          <Route path="/fogli-assistenza/:foglioId" element={
            <FoglioAssistenzaDetailPage
              tecnici={tecnici} /* Passa lista tecnici per il form intervento */
            />}
          />
          {/* Rotte per modifica foglio e interventi potrebbero essere innestate o separate */}
          {/* <Route path="/fogli-assistenza/:foglioId/modifica" element={<FoglioAssistenzaFormPage modo="modifica" ... />} /> */}


          {/* Anagrafiche (esempio, adatta i tuoi componenti) */}
          <Route path="/clienti" element={<ClientiManager />} />
          <Route path="/tecnici" element={<TecniciManager />} />
          <Route path="/commesse" element={<CommesseManager clienti={clienti} />} />
          <Route path="/ordini" element={<OrdiniClienteManager clienti={clienti} commesse={commesse} />} />

        </Routes>
      </main>
      <footer>
        <p>© {new Date().getFullYear()} Oilsafe S.r.l.</p>
      </footer>
    </div>
  );
}

export default App;