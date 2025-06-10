CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE -- Indica che la funzione non modifica il database e restituisce sempre lo stesso risultato per gli stessi argomenti (in questo caso, per lo stesso utente)
SECURITY DEFINER -- Esegue con i permessi del creatore della funzione (necessario per accedere a public.profiles)
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;