-- Adds the missing login columns to the workers table for Kiosk Mode PIN login
ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS login_id text UNIQUE,
ADD COLUMN IF NOT EXISTS login_password text;
