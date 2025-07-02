-- Adds column to record the user assigned to a service sheet
ALTER TABLE public.fogli_assistenza
  ADD COLUMN assegnato_a_user_id UUID REFERENCES auth.users(id);

-- Optional: populate old rows with the creator as assignee
UPDATE public.fogli_assistenza
  SET assegnato_a_user_id = creato_da_user_id
  WHERE assegnato_a_user_id IS NULL;
