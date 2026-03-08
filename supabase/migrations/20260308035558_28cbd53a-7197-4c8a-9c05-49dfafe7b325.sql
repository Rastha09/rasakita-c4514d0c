
-- Drop existing check constraint on order_status and add new one with PENDING_PAYMENT
DO $$
BEGIN
  -- Find and drop existing check constraint for order_status
  EXECUTE (
    SELECT 'ALTER TABLE public.orders DROP CONSTRAINT ' || conname
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%order_status%'
    LIMIT 1
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No existing order_status constraint found, continuing...';
END
$$;

-- Add updated check constraint including PENDING_PAYMENT
ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check 
  CHECK (order_status IN ('NEW', 'PENDING_PAYMENT', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELED'));
