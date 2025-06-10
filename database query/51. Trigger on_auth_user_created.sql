-- Prima, se il trigger esiste già da tentativi precedenti, potresti volerlo eliminare:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Crea il trigger che chiama la funzione 'handle_new_user'
-- DOPO ogni inserimento di una nuova riga nella tabella 'auth.users'.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users -- Il trigger si attiva sulla tabella auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();