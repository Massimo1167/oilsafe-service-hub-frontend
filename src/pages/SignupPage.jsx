// src/pages/SignupPage.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // Aggiunto per il profilo
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (password.length < 6) {
        setError("La password deve essere di almeno 6 caratteri.");
        setLoading(false);
        return;
    }

    try {
      // Per passare dati al trigger handle_new_user, li mettiamo in options.data
      // Il trigger userà NEW.raw_user_meta_data->>'full_name'
      // Il ruolo di default 'user' verrà impostato dal trigger se non specificato in app_metadata
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { // Questi dati finiranno in auth.users.raw_user_meta_data
            full_name: fullName 
          }
          // Se volessi impostare un ruolo diverso da 'user' durante il signup (sconsigliato per self-service)
          // dovresti farlo con `app_metadata` e il trigger dovrebbe leggerlo, es:
          // app_metadata: { role: 'custom_role_on_signup' } 
        }
      });

      if (signUpError) {
        throw signUpError;
      }
      
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        // Questo caso indica che l'utente esiste già ma forse non è confermato o è un errore
         setError("Utente già esistente o problema durante la registrazione. Se ti sei già registrato, prova a fare login o a recuperare la password.");
      } else if (data.user && !data.session) {
         // Sessione è null se la conferma email è abilitata
         setMessage('Registrazione avvenuta! Controlla la tua email per il link di conferma. Potrebbe essere nella cartella spam.');
      } else if (data.session) {
        // Se la conferma email è disabilitata (NON consigliato in produzione), l'utente è già loggato
        setMessage('Registrazione e login avvenuti con successo!');
        setTimeout(() => navigate('/'), 2000); 
      } else {
        setError("Qualcosa è andato storto durante la registrazione. Riprova.");
      }

    } catch (signUpError) {
      if (signUpError.message.includes("User already registered")) {
        setError("Questa email è già registrata. Prova a fare login o a recuperare la password.");
      } else if (signUpError.message.includes("Password should be at least 6 characters")) {
        setError("La password deve essere di almeno 6 caratteri.");
      }
      else {
        setError("Errore durante la registrazione: " + signUpError.message);
      }
      console.error("Errore di registrazione:", signUpError);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
      <h2>Registrati</h2>
      <form onSubmit={handleSignup}>
        <div>
          <label htmlFor="fullName">Nome Completo:</label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password (min. 6 caratteri):</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {message && <p style={{ color: 'green', marginTop:'10px', fontSize:'0.9em'  }}>{message}</p>}
        {error && <p style={{ color: 'red', marginTop:'10px', fontSize:'0.9em'  }}>{error}</p>}
        <button type="submit" disabled={loading} style={{marginTop:'15px', width:'100%'}}>
          {loading ? 'Registrazione in corso...' : 'Registrati'}
        </button>
      </form>
       <p style={{marginTop: '20px', textAlign: 'center'}}>
        Hai già un account? <Link to="/login">Accedi</Link>
      </p>
    </div>
  );
}
export default SignupPage;