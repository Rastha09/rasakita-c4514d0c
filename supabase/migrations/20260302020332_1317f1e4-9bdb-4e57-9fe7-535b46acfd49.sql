
-- 1. Drop the product_reviews admin policy that references profiles.store_id
DROP POLICY IF EXISTS "Admins can manage store reviews" ON public.product_reviews;

-- 2. Recreate it using store_admins instead of profiles.store_id
CREATE POLICY "Admins can manage store reviews"
ON public.product_reviews
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM store_admins sa
    JOIN products prod ON prod.store_id = sa.store_id
    WHERE sa.user_id = auth.uid()
      AND prod.id = product_reviews.product_id
  )
);

-- 3. Remove the store_id column from profiles (no longer needed in single-business)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS store_id;
