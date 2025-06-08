CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, -- Chiave esterna a auth.users
  updated_at TIMESTAMPTZ,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  website TEXT,
  role TEXT DEFAULT 'user' NOT NULL -- Aggiungi la colonna per il ruolo
  -- Aggiungi altri campi del profilo se necessario
);

-- Policy per la tabella profiles (esempio base)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile."
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile."
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Funzione trigger per creare un profilo automaticamente quando un nuovo utente si registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Importante per i permessi
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role) -- Aggiungi 'role' qui
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name', -- Esempio se passi full_name durante signup
    NEW.raw_user_meta_data->>'avatar_url', -- Esempio
    COALESCE(NEW.raw_app_meta_data->>'role', 'user') -- Prende il ruolo dai metadati o default a 'user'
  );
  RETURN NEW;
END;
$$;

-- Trigger che chiama la funzione dopo l'inserimento di un nuovo utente
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();