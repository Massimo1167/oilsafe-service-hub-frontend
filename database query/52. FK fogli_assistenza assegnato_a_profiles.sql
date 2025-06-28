-- Links assegnato_a_user_id to profiles.id instead of auth.users
ALTER TABLE public.fogli_assistenza
  DROP CONSTRAINT IF EXISTS fogli_assistenza_assegnato_a_user_id_fkey;

ALTER TABLE public.fogli_assistenza
  ADD CONSTRAINT fogli_assistenza_assegnato_a_user_id_fkey
  FOREIGN KEY (assegnato_a_user_id)
  REFERENCES public.profiles(id);
