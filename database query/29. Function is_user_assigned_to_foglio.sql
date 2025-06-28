CREATE OR REPLACE FUNCTION public.is_user_assigned_to_foglio(foglio_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Recupera l'email dall'header JWT senza consultare la tabella auth.users
  -- per evitare errori di permesso quando la funzione è invocata in contesti
  -- con privilegi limitati.
SELECT
  EXISTS (
    SELECT 1
    FROM public.fogli_assistenza fa
    WHERE fa.id = foglio_id
      AND fa.assegnato_a_user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1
    FROM public.interventi_assistenza ia
    JOIN public.tecnici t ON t.id = ia.tecnico_id
    WHERE ia.foglio_assistenza_id = foglio_id
      AND LOWER(t.email) = LOWER(current_setting('request.jwt.claims', true)::json->>'email')
  ) INTO result;
  RETURN result;
END;
$$;
