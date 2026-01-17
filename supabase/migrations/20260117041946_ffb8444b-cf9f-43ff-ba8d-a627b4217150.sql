-- Create function to increment sold_count
CREATE OR REPLACE FUNCTION public.increment_sold_count(p_product_id uuid, p_qty integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET sold_count = sold_count + p_qty
  WHERE id = p_product_id;
END;
$$;