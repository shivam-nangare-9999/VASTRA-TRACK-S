-- 1. Add order_number column to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_number text UNIQUE;

-- 2. Create a sequence for the numbers
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- 3. Function to generate VT-style ID (e.g., VT01, VT02)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'VT' || LPAD(nextval('order_number_seq')::text, 2, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger to run before each insert
DROP TRIGGER IF EXISTS tr_generate_order_number ON public.orders;
CREATE TRIGGER tr_generate_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION generate_order_number();

-- 5. (Optional) Populate existing orders if any exist
-- UPDATE public.orders SET order_number = 'VT' || LPAD(id::text, 2, '0') WHERE order_number IS NULL;
