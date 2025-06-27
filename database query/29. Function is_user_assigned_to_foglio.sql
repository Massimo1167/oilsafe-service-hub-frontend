CREATE OR REPLACE FUNCTION public.is_user_assigned_to_foglio(foglio_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.interventi_assistenza ia
    JOIN public.tecnici t ON t.id = ia.tecnico_id
    JOIN auth.users u ON u.id = auth.uid()
    WHERE ia.foglio_assistenza_id = foglio_id
      AND LOWER(t.email) = LOWER(u.email)
  ) INTO result;
  RETURN result;
END;
$$;
