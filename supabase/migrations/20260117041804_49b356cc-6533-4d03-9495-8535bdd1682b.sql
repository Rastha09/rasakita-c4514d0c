-- Add columns to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sold_count integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_avg numeric(2,1) NOT NULL DEFAULT 4.7,
ADD COLUMN IF NOT EXISTS rating_count integer NOT NULL DEFAULT 0;

-- Add sold_counted column to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS sold_counted boolean NOT NULL DEFAULT false;

-- Update some products with demo rating_count for visual appeal
UPDATE public.products
SET rating_count = floor(random() * 150 + 50)::integer
WHERE rating_count = 0;