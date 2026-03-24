-- Safe version of the new user trigger that never crashes Supabase Auth.
-- It ignores constraint errors and delegates linking to the self-healing function.

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
  
  -- Automatically link approved worker if metadata exists
  IF assigned_role = 'worker' AND new.raw_user_meta_data->>'shop_id' IS NOT NULL THEN
    BEGIN
      v_shop_id := (new.raw_user_meta_data->>'shop_id')::uuid;
      v_worker_record_id := (new.raw_user_meta_data->>'worker_record_id')::uuid;
      
      INSERT INTO public.shop_workers (shop_id, user_id, worker_record_id, status)
      VALUES (v_shop_id, new.id, v_worker_record_id, 'approved')
      ON CONFLICT (user_id) DO UPDATE SET status = 'approved', worker_record_id = EXCLUDED.worker_record_id;
    EXCEPTION WHEN OTHERS THEN
      -- If the table is missing or constraints are broken, just skip it here.
      -- Our sync_worker_linking function will safely fix it a millisecond later!
    END;
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
