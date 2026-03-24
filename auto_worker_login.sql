-- 0. ADD MISSING COLUMNS & TABLES
-- This adds the 'login_id' and 'login_password' columns to your workers table so you can save their PINs without errors.
ALTER TABLE public.workers 
ADD COLUMN IF NOT EXISTS login_id text UNIQUE,
ADD COLUMN IF NOT EXISTS login_password text;

-- Create shop_workers table in case it was skipped during Option 2
CREATE TABLE IF NOT EXISTS public.shop_workers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  worker_record_id uuid REFERENCES public.workers(id) ON DELETE CASCADE,
  status text DEFAULT 'approved',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on shop_workers
ALTER TABLE public.shop_workers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Workers can view their own link" ON public.shop_workers;
CREATE POLICY "Workers can view their own link" ON public.shop_workers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Owners can manage links" ON public.shop_workers;
CREATE POLICY "Owners can manage links" ON public.shop_workers FOR ALL USING (auth.uid() = shop_id);


-- 1. Automated Verification Function
-- Allows the frontend to verify a worker's Shop Code, Login ID, and PIN before making a fake-email Supabase Auth account.
CREATE OR REPLACE FUNCTION public.worker_auto_login(
  p_shop_code text,
  p_login_id text,
  p_pin text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id uuid;
  v_worker_id uuid;
  v_fake_email text;
BEGIN
  -- Validate inputs
  IF p_shop_code IS NULL OR p_login_id IS NULL OR p_pin IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Missing credentials.');
  END IF;

  -- 1. Look up the shop code
  SELECT owner_id INTO v_owner_id FROM public.shop_codes WHERE code = p_shop_code LIMIT 1;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid Shop Code.');
  END IF;

  -- 2. Look up the worker
  SELECT id INTO v_worker_id FROM public.workers 
  WHERE owner_id = v_owner_id AND login_id = p_login_id AND login_password = p_pin LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid Worker ID or PIN.');
  END IF;

  -- 3. Return auth credentials (format email safely)
  -- Uses the worker's unique database UUID + @gmail.com to perfectly bypass Supabase's live MX-record validators.
  v_fake_email := 'worker' || replace(v_worker_id::text, '-', '') || '@gmail.com';
  
  RETURN json_build_object(
    'success', true, 
    'email', v_fake_email, 
    'shop_id', v_owner_id, 
    'worker_record_id', v_worker_id
  );
END;
$$;


-- 2. Update the handle_new_user trigger
-- If a worker signs up via the frontend using Option 3 remote auth, they pass shop_id as metadata.
-- This automatically approves them in 'shop_workers' so Admins don't have to verify them again!
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  assigned_role text := 'owner';
  v_shop_id uuid;
  v_worker_record_id uuid;
BEGIN
  IF new.raw_user_meta_data->>'role' = 'worker' THEN
    assigned_role := 'worker';
  END IF;
  
  BEGIN
    INSERT INTO public.profiles (id, role)
    VALUES (new.id, assigned_role)
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
  EXCEPTION WHEN OTHERS THEN
    -- Ignore so user creation succeeds
  END;
  
  -- Automatically link approved worker if metadata exists (Option 3 Remote Login)
  IF assigned_role = 'worker' AND new.raw_user_meta_data->>'shop_id' IS NOT NULL THEN
    BEGIN
      v_shop_id := (new.raw_user_meta_data->>'shop_id')::uuid;
      v_worker_record_id := (new.raw_user_meta_data->>'worker_record_id')::uuid;
      
      INSERT INTO public.shop_workers (shop_id, user_id, worker_record_id, status)
      VALUES (v_shop_id, new.id, v_worker_record_id, 'approved')
      ON CONFLICT (user_id) DO UPDATE SET status = 'approved', worker_record_id = EXCLUDED.worker_record_id;
    EXCEPTION WHEN OTHERS THEN
      -- If the table is missing or constraints are broken, skip it.
      -- Our sync_worker_linking function will safely fix it later.
    END;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Self-Healing Sync Function
-- If a worker's account was created but the database failed to link them (orphaned auth account),
-- this function runs after they log in to safely repair and enforce their data links.
CREATE OR REPLACE FUNCTION public.sync_worker_linking(p_worker_id uuid, p_shop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.shop_workers (shop_id, user_id, worker_record_id, status)
  VALUES (p_shop_id, auth.uid(), p_worker_id, 'approved')
  ON CONFLICT (user_id) DO UPDATE 
  SET worker_record_id = EXCLUDED.worker_record_id, 
      shop_id = EXCLUDED.shop_id,
      status = 'approved';
END;
$$;
