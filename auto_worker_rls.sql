-- 0. Helper Functions for Fast RLS
CREATE OR REPLACE FUNCTION public.get_worker_shop_id() RETURNS uuid AS $$
  SELECT shop_id FROM public.shop_workers WHERE user_id = auth.uid() AND status = 'approved' LIMIT 1;
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION public.get_worker_record_id() RETURNS uuid AS $$
  SELECT worker_record_id FROM public.shop_workers WHERE user_id = auth.uid() AND status = 'approved' LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 1. ORDERS
DROP POLICY IF EXISTS "Workers can view assigned orders" ON public.orders;
CREATE POLICY "Workers can view assigned orders" ON public.orders FOR SELECT 
USING (worker_id = public.get_worker_record_id());

DROP POLICY IF EXISTS "Workers can update assigned orders" ON public.orders;
CREATE POLICY "Workers can update assigned orders" ON public.orders FOR UPDATE 
USING (worker_id = public.get_worker_record_id());

-- 2. CUSTOMERS
DROP POLICY IF EXISTS "Workers can view shop customers" ON public.customers;
CREATE POLICY "Workers can view shop customers" ON public.customers FOR SELECT 
USING (owner_id = public.get_worker_shop_id());

-- 3. WORKERS
DROP POLICY IF EXISTS "Workers can view shop workers" ON public.workers;
CREATE POLICY "Workers can view shop workers" ON public.workers FOR SELECT 
USING (owner_id = public.get_worker_shop_id());

-- 4. MEASUREMENTS
DROP POLICY IF EXISTS "Workers can view shop measurements" ON public.measurements;
CREATE POLICY "Workers can view shop measurements" ON public.measurements FOR SELECT 
USING (owner_id = public.get_worker_shop_id());

-- 5. PROFILES
DROP POLICY IF EXISTS "Workers can view shop profiles" ON public.profiles;
CREATE POLICY "Workers can view shop profiles" ON public.profiles FOR SELECT 
USING (id = public.get_worker_shop_id() OR id = auth.uid());
