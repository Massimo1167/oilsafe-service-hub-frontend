/**
 * Login form that authenticates the user with Supabase.
 * On successful sign in the global session (managed in App.jsx)
 * redirects the user to the dashboard.
 */
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (signInError) {
        throw signInError;
      }

      // onAuthStateChange in App.jsx gestirà l'aggiornamento della sessione globale
      // e il reindirizzamento delle rotte protette.
      // Qui possiamo reindirizzare esplicitamente alla dashboard se il login ha successo.
      if (data.session) {
        navigate('/'); 
      } else {
         setError("Login fallito. Controlla le tue credenziali.");
      }

    } catch (signInError) {
      if (signInError.message.includes("Invalid login credentials")) {
        setError("Credenziali di accesso non valide. Riprova.");
      } else if (signInError.message.includes("Email not confirmed")) {
        setError("La tua email non è stata ancora confermata. Controlla la tua casella di posta.");
      }
      else {
        setError("Errore durante il login: " + signInError.message);
      }
      console.error("Errore di login:", signInError);
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div>
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        {error && <p style={{ color: 'red', marginTop:'10px', fontSize:'0.9em' }}>{error}</p>}
        <button type="submit" disabled={loading} style={{marginTop:'15px', width:'100%'}}>
          {loading ? 'Accesso in corso...' : 'Login'}
        </button>
      </form>
      <p style={{marginTop: '20px', textAlign: 'center'}}>
        Non hai un account? <Link to="/signup">Registrati</Link>
      </p>
      {/* Aggiungi link per "Password dimenticata?" se implementi quella funzionalità */}
    </div>
  );
}
export default LoginPage;