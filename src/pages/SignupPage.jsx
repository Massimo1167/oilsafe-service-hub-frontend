/**
 * Registration page to create a new user via Supabase auth.
 * After a successful signup a confirmation email is sent and the
 * user can proceed to login. Used mainly by administrators.
 */
import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // Assicurati che il percorso sia corretto
import { useNavigate, Link } from 'react-router-dom';

function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // Per il nome completo da salvare nel profilo
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(''); // Per messaggi di successo
  const [error, setError] = useState('');     // Per messaggi di errore

  const isGmail = email.toLowerCase().endsWith('@gmail.com');
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const trimmedEmail = email.trim();
    const trimmedFullName = fullName.trim();

    // Log per debug
    console.log("Tentativo di registrazione con email:", `"${trimmedEmail}"`, "(Lunghezza:", trimmedEmail.length, ")");
    console.log("Nome completo fornito:", `"${trimmedFullName}"`);

    if (!trimmedEmail || !password || !trimmedFullName) {
        setError("Tutti i campi (Nome Completo, Email, Password) sono obbligatori.");
        setLoading(false);
        return;
    }

    if (password.length < 6) {
        setError("La password deve essere di almeno 6 caratteri.");
        setLoading(false);
        return;
    }

    if (!trimmedEmail.toLowerCase().endsWith('@gmail.com')) {
        setError("L'autoregistrazione è disponibile solo per indirizzi Gmail. Per ottenere le credenziali contatta ufficio.ced@oilsafe.it.");
        setLoading(false);
        return;
    }

    try {
      // Passa fullName in options.data per essere usato dal trigger handle_new_user
      // per popolare la tabella 'profiles'.
      // Il ruolo di default 'user' sarà impostato dal trigger se non specificato in app_metadata.
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password,
        options: {
          data: { // Questi dati finiranno in auth.users.raw_user_meta_data
            full_name: trimmedFullName 
          }
          // Non inviare 'role' da qui per la registrazione self-service
          // per evitare che gli utenti si auto-assegnino ruoli privilegiati.
        }
      });

      if (signUpError) {
        throw signUpError; // Lancia l'errore per essere catturato dal blocco catch
      }
      
      // Controlla la risposta 'data'
      if (data.user && data.user.identities && data.user.identities.length === 0) {
        // Questo caso può indicare che l'utente esiste già ma non è confermato,
        // o un altro problema con la creazione dell'identità.
        // Supabase di solito restituisce un errore più specifico per "User already registered".
        setError("Utente già esistente o si è verificato un problema. Se ti sei già registrato, prova il login o il recupero password.");
      } else if (data.user && !data.session) {
         // Sessione è null se la conferma email è abilitata nel backend Supabase.
         setMessage('Registrazione avvenuta con successo! Controlla la tua email per il link di conferma. Potrebbe essere finita nella cartella spam o posta indesiderata.');
         // Non reindirizzare subito, l'utente deve prima confermare l'email.
         // Svuota i campi del form dopo il successo.
         setEmail('');
         setPassword('');
         setFullName('');
      } else if (data.session) {
        // Se la conferma email è DISABILITATA (sconsigliato in produzione), l'utente è già loggato.
        setMessage('Registrazione e login avvenuti con successo!');
        setTimeout(() => navigate('/'), 2000); // Reindirizza alla dashboard dopo un breve messaggio.
      } else {
        // Caso imprevisto se 'data.user' è presente ma non ci sono errori né sessione (e la conferma non è il motivo)
        setError("Registrazione parzialmente completata, ma si è verificato un problema imprevisto. Riprova o contatta l'assistenza.");
      }

    } catch (signUpError) {
      console.error("Errore esplicito durante supabase.auth.signUp:", signUpError);
      if (signUpError.message.includes("User already registered")) {
        setError("Questa email è già registrata. Prova a fare login o a recuperare la password.");
      } else if (signUpError.message.includes("Password should be at least 6 characters")) {
        setError("La password deve essere di almeno 6 caratteri.");
      } else if (signUpError.message.toLowerCase().includes("invalid email") || signUpError.message.toLowerCase().includes("validation failed")) {
        setError("L'indirizzo email fornito non è valido. Controlla il formato.");
      }
      else {
        setError("Errore durante la registrazione: " + signUpError.message);
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
      <h2>Registrati a Oilsafe Service Hub</h2>
      <form onSubmit={handleSignup}>
        <div>
          <label htmlFor="fullName">Nome Completo:</label>
          <input
            type="text"
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoComplete="name"
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
            autoComplete="email"
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
            autoComplete="new-password"
          />
        </div>
        {message && <p style={{ color: 'green', marginTop:'10px', fontSize:'0.9em', textAlign: 'center' }}>{message}</p>}
        {error && <p style={{ color: 'red', marginTop:'10px', fontSize:'0.9em', textAlign: 'center' }}>{error}</p>}
        {!isGmail && email && (
          <p style={{ color: 'red', marginTop:'10px', fontSize:'0.9em', textAlign:'center' }}>
            L'autoregistrazione è disponibile solo per indirizzi Gmail. Per ottenere le credenziali contatta ufficio.ced@oilsafe.it.
          </p>
        )}
        <button type="submit" disabled={loading || !isGmail} style={{marginTop:'15px', width:'100%'}}>
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