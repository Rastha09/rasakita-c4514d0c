-- Add stock_counted column to orders table for idempotent stock deduction
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS stock_counted boolean NOT NULL DEFAULT false;

-- Create function to handle stock deduction when order is COMPLETED + PAID
CREATE OR REPLACE FUNCTION public.handle_order_stock_deduct()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  item jsonb;
  v_product_id uuid;
  v_qty integer;
BEGIN
  -- Only process if order is COMPLETED + PAID and stock not yet deducted
  IF NEW.order_status = 'COMPLETED' 
     AND NEW.payment_status = 'PAID' 
     AND NEW.stock_counted = false THEN
    
    -- Loop through each item in the order
    FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
    LOOP
      v_product_id := (item->>'product_id')::uuid;
      v_qty := COALESCE((item->>'qty')::integer, 1);
      
      -- Deduct stock for this product (never go below 0)
      UPDATE public.products
      SET stock = GREATEST(COALESCE(stock, 0) - v_qty, 0)
      WHERE id = v_product_id;
    END LOOP;
    
    -- Mark order as stock_counted to prevent double deduction
    NEW.stock_counted := true;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for stock deduction
DROP TRIGGER IF EXISTS trigger_order_stock_deduct ON public.orders;
CREATE TRIGGER trigger_order_stock_deduct
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_order_stock_deduct();

-- Backfill: Deduct stock for all existing COMPLETED+PAID orders that haven't been counted yet
DO $$
DECLARE
  r RECORD;
  item jsonb;
  v_product_id uuid;
  v_qty integer;
BEGIN
  -- Loop through all COMPLETED+PAID orders that haven't had stock deducted
  FOR r IN 
    SELECT id, items 
    FROM public.orders 
    WHERE order_status = 'COMPLETED' 
      AND payment_status = 'PAID' 
      AND stock_counted = false
  LOOP
    -- Loop through items in the order
    FOR item IN SELECT * FROM jsonb_array_elements(r.items)
    LOOP
      v_product_id := (item->>'product_id')::uuid;
      v_qty := COALESCE((item->>'qty')::integer, 1);
      
      -- Deduct stock (never go below 0)
      UPDATE public.products
      SET stock = GREATEST(COALESCE(stock, 0) - v_qty, 0)
      WHERE id = v_product_id;
    END LOOP;
    
    -- Mark order as stock_counted
    UPDATE public.orders SET stock_counted = true WHERE id = r.id;
  END LOOP;
END;
$$;