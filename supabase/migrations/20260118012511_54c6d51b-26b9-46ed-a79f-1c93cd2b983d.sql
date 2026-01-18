-- Create product_reviews table
CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id, order_id)
);

-- Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Customers can insert reviews for their own completed orders
CREATE POLICY "Customers can insert own reviews"
ON public.product_reviews
FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = product_reviews.order_id
    AND orders.customer_id = auth.uid()
    AND orders.order_status = 'COMPLETED'
  )
);

-- Customers can view their own reviews
CREATE POLICY "Customers can view own reviews"
ON public.product_reviews
FOR SELECT
USING (user_id = auth.uid());

-- Anyone can view all reviews (for product pages)
CREATE POLICY "Anyone can view reviews"
ON public.product_reviews
FOR SELECT
USING (true);

-- Admins can manage reviews for their store products
CREATE POLICY "Admins can manage store reviews"
ON public.product_reviews
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.products prod ON prod.store_id = p.store_id
    WHERE p.id = auth.uid()
    AND p.role = 'ADMIN'
    AND prod.id = product_reviews.product_id
  )
);

-- Super admins can manage all reviews
CREATE POLICY "Super admins can manage all reviews"
ON public.product_reviews
FOR ALL
USING (has_role(auth.uid(), 'SUPER_ADMIN'));

-- Function to recalculate product rating after review
CREATE OR REPLACE FUNCTION public.recalculate_product_rating(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_avg numeric(2,1);
BEGIN
  SELECT COUNT(*), COALESCE(ROUND(AVG(rating)::numeric, 1), 4.7)
  INTO v_count, v_avg
  FROM public.product_reviews
  WHERE product_id = p_product_id;

  UPDATE public.products
  SET rating_count = v_count,
      rating_avg = v_avg
  WHERE id = p_product_id;
END;
$$;