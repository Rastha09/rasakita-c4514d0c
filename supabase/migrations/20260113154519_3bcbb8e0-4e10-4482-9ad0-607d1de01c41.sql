-- Create role enum
CREATE TYPE public.app_role AS ENUM ('SUPER_ADMIN', 'ADMIN', 'CUSTOMER');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'CUSTOMER',
  store_id UUID,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Security definer function for role checking (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = user_id
$$;

-- Helper function to check role
CREATE OR REPLACE FUNCTION public.has_role(user_id UUID, check_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = check_role
  )
$$;

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (NEW.id, 'CUSTOMER', NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Stores table
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  logo_path TEXT,
  banner_path TEXT,
  theme_color TEXT DEFAULT '#FF6B35',
  address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Public can view active stores
CREATE POLICY "Anyone can view active stores"
  ON public.stores FOR SELECT
  USING (is_active = true);

-- Admins can manage their store
CREATE POLICY "Admins can update own store"
  ON public.stores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.store_id = stores.id
      AND profiles.role = 'ADMIN'
    )
  );

-- Super admins can do everything
CREATE POLICY "Super admins can manage all stores"
  ON public.stores FOR ALL
  USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Add foreign key to profiles after stores exists
ALTER TABLE public.profiles
  ADD CONSTRAINT fk_profiles_store
  FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;

-- Store settings table
CREATE TABLE public.store_settings (
  store_id UUID PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  payment_cod_enabled BOOLEAN NOT NULL DEFAULT true,
  payment_qris_enabled BOOLEAN NOT NULL DEFAULT false,
  shipping_courier_enabled BOOLEAN NOT NULL DEFAULT true,
  shipping_pickup_enabled BOOLEAN NOT NULL DEFAULT true,
  shipping_fee_type TEXT NOT NULL DEFAULT 'FLAT' CHECK (shipping_fee_type IN ('FLAT', 'ZONE')),
  shipping_fee_flat INTEGER NOT NULL DEFAULT 10000,
  shipping_zones JSONB DEFAULT '[]',
  pickup_address TEXT,
  open_hours JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Public can view store settings
CREATE POLICY "Anyone can view store settings"
  ON public.store_settings FOR SELECT
  USING (true);

-- Admins can update their store settings
CREATE POLICY "Admins can update own store settings"
  ON public.store_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.store_id = store_settings.store_id
      AND profiles.role = 'ADMIN'
    )
  );

-- Super admins can manage all settings
CREATE POLICY "Super admins can manage all settings"
  ON public.store_settings FOR ALL
  USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories"
  ON public.categories FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage own categories"
  ON public.categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.store_id = categories.store_id
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Super admins can manage all categories"
  ON public.categories FOR ALL
  USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  images JSONB DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, slug)
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON public.products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage own products"
  ON public.products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.store_id = products.store_id
      AND profiles.role = 'ADMIN'
    )
  );

CREATE POLICY "Super admins can manage all products"
  ON public.products FOR ALL
  USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_code TEXT NOT NULL UNIQUE,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal INTEGER NOT NULL DEFAULT 0,
  shipping_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL DEFAULT 0,
  shipping_method TEXT NOT NULL DEFAULT 'COURIER' CHECK (shipping_method IN ('COURIER', 'PICKUP')),
  payment_method TEXT NOT NULL DEFAULT 'COD' CHECK (payment_method IN ('COD', 'QRIS')),
  payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID', 'EXPIRED', 'FAILED', 'REFUNDED')),
  order_status TEXT NOT NULL DEFAULT 'NEW' CHECK (order_status IN ('NEW', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP', 'COMPLETED', 'CANCELED')),
  customer_address JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Customers can view own orders
CREATE POLICY "Customers can view own orders"
  ON public.orders FOR SELECT
  USING (customer_id = auth.uid());

-- Customers can create orders
CREATE POLICY "Customers can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (customer_id = auth.uid());

-- Admins can view/manage orders for their store
CREATE POLICY "Admins can manage store orders"
  ON public.orders FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.store_id = orders.store_id
      AND profiles.role = 'ADMIN'
    )
  );

-- Super admins can manage all orders
CREATE POLICY "Super admins can manage all orders"
  ON public.orders FOR ALL
  USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'DUITKU',
  reference TEXT,
  invoice_id TEXT,
  qris_url TEXT,
  qr_string TEXT,
  amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'EXPIRED', 'FAILED')),
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Customers can view own payments (through orders)
CREATE POLICY "Customers can view own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = payments.order_id
      AND orders.customer_id = auth.uid()
    )
  );

-- Admins can manage payments for their store
CREATE POLICY "Admins can manage store payments"
  ON public.payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.store_id = payments.store_id
      AND profiles.role = 'ADMIN'
    )
  );

-- Super admins can manage all payments
CREATE POLICY "Super admins can manage all payments"
  ON public.payments FOR ALL
  USING (public.has_role(auth.uid(), 'SUPER_ADMIN'));

-- Function to generate order code
CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := 'ORD' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN new_code;
END;
$$;