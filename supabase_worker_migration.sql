-- 1. Create a table for Shop Codes (used to invite workers)
CREATE TABLE IF NOT EXISTS public.shop_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.shop_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their shop code"
  ON public.shop_codes FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY "Anyone can read shop codes for registration"
  ON public.shop_codes FOR SELECT
  USING (true);


-- 2. Create the shop_workers table (links a Worker Auth User to a Shop and a Worker Record)
CREATE TABLE IF NOT EXISTS public.shop_workers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id uuid REFERENCES auth.users NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  worker_record_id uuid REFERENCES public.workers NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.shop_workers ENABLE ROW LEVEL SECURITY;

-- Owners can see workers applying to their shop
CREATE POLICY "Owners can view shop workers"
  ON public.shop_workers FOR SELECT
  USING (auth.uid() = shop_id);

-- Owners can approve/reject/assign workers
CREATE POLICY "Owners can update shop workers"
  ON public.shop_workers FOR UPDATE
  USING (auth.uid() = shop_id);

-- Workers can view their own link status
CREATE POLICY "Workers can view their own link"
  ON public.shop_workers FOR SELECT
  USING (auth.uid() = user_id);

-- Workers can insert their own application
CREATE POLICY "Workers can apply to a shop"
  ON public.shop_workers FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 3. Update the handle_new_user trigger to support "worker" role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  assigned_role text := 'owner';
BEGIN
  IF new.raw_user_meta_data->>'role' = 'worker' THEN
    assigned_role := 'worker';
  END IF;
  
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, assigned_role)
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. MASSIVE RLS UPDATES FOR MULTI-TENANCY
-- (This allows workers to read orders assigned to them, and customers related to those orders)

-- ORDERS TABLE
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  USING (
    auth.uid() = owner_id 
    OR 
    worker_id IN (
      SELECT worker_record_id FROM public.shop_workers 
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can update their own orders" ON public.orders;
CREATE POLICY "Users can update their own orders"
  ON public.orders FOR UPDATE
  USING (
    auth.uid() = owner_id 
    OR 
    worker_id IN (
      SELECT worker_record_id FROM public.shop_workers 
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

-- CUSTOMERS TABLE
-- (Workers need to see customer details for their assigned orders)
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
CREATE POLICY "Users can view their own customers"
  ON public.customers FOR SELECT
  USING (
    auth.uid() = owner_id 
    OR 
    id IN (
      SELECT customer_id FROM public.orders 
      WHERE worker_id IN (
        SELECT worker_record_id FROM public.shop_workers 
        WHERE user_id = auth.uid() AND status = 'approved'
      )
    )
  );

-- INVENTORY TABLE (Workers might need to consume inventory if allowed, or we restrict to owner. Let's let approved workers view it).
DROP POLICY IF EXISTS "Users can view their own inventory" ON public.inventory;
CREATE POLICY "Users can view their own inventory"
  ON public.inventory FOR SELECT
  USING (
    auth.uid() = owner_id
    OR
    owner_id IN (
      SELECT shop_id FROM public.shop_workers
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

DROP POLICY IF EXISTS "Users can update their own inventory" ON public.inventory;
CREATE POLICY "Users can update their own inventory"
  ON public.inventory FOR UPDATE
  USING (
    auth.uid() = owner_id
    OR
    owner_id IN (
      SELECT shop_id FROM public.shop_workers
      WHERE user_id = auth.uid() AND status = 'approved'
    )
  );
