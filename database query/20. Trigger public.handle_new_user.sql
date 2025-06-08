CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Esegue con i permessi del proprietario della funzione (solitamente postgres)
SET search_path = public -- Assicura che cerchi le tabelle nello schema public
AS $$
BEGIN
  -- Inserisce un nuovo record nella tabella 'profiles' quando un nuovo utente si registra
  -- o viene creato in 'auth.users'.
  -- NEW.id, NEW.raw_user_meta_data, NEW.raw_app_meta_data sono disponibili
  -- dal record appena inserito nella tabella auth.users.
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id, -- L'ID dell'utente da auth.users
    NEW.raw_user_meta_data->>'full_name', -- Prende 'full_name' da user_metadata passato durante signUp o admin.createUser
    COALESCE(NEW.raw_app_meta_data->>'role', 'user') -- Prende 'role' da app_metadata, altrimenti default a 'user'
    -- Aggiungi qui altre colonne di 'profiles' che vuoi popolare dai metadati, es:
    -- NEW.raw_user_meta_data->>'avatar_url' per avatar_url, ecc.
  );
  RETURN NEW; -- Restituisce il record NEW per continuare l'operazione INSERT su auth.users
END;
$$;