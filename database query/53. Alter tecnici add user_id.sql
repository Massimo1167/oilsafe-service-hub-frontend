-- Adds a user_id column to link technicians with user profiles
ALTER TABLE public.tecnici
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id);
