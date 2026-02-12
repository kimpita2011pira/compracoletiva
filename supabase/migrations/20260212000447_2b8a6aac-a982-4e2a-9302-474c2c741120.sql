
-- Enum para roles
CREATE TYPE public.app_role AS ENUM ('CLIENTE', 'VENDEDOR', 'ADMIN');

-- Enum para status de oferta
CREATE TYPE public.offer_status AS ENUM ('ATIVA', 'VALIDADA', 'CANCELADA', 'ENCERRADA');

-- Enum para status de pedido
CREATE TYPE public.order_status AS ENUM ('RESERVADO', 'CONFIRMADO', 'CANCELADO', 'ESTORNADO');

-- Enum para tipo de transação
CREATE TYPE public.transaction_type AS ENUM ('DEPOSITO', 'RESERVA', 'DEBITO', 'ESTORNO', 'CREDITO', 'COMISSAO');

-- Enum para tipo de entrega
CREATE TYPE public.delivery_type AS ENUM ('DELIVERY', 'RETIRADA');

-- Enum para status do vendedor
CREATE TYPE public.vendor_status AS ENUM ('PENDENTE', 'APROVADO', 'REJEITADO');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Addresses
CREATE TABLE public.addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label VARCHAR(50),
  street VARCHAR(200) NOT NULL,
  number VARCHAR(20),
  complement VARCHAR(100),
  neighborhood VARCHAR(100),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Vendors
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  company_name VARCHAR(200) NOT NULL,
  cnpj VARCHAR(18),
  description TEXT,
  status vendor_status NOT NULL DEFAULT 'PENDENTE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- Offers
CREATE TABLE public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  image_url TEXT,
  original_price NUMERIC(12,2) NOT NULL,
  offer_price NUMERIC(12,2) NOT NULL,
  min_quantity INT NOT NULL DEFAULT 1,
  max_per_user INT DEFAULT 5,
  start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_date TIMESTAMPTZ NOT NULL,
  delivery_available BOOLEAN DEFAULT false,
  delivery_fee NUMERIC(10,2) DEFAULT 0,
  pickup_available BOOLEAN DEFAULT true,
  estimated_delivery_time VARCHAR(100),
  status offer_status NOT NULL DEFAULT 'ATIVA',
  sold_quantity INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Wallets
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Wallet Transactions
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.offers(id),
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  delivery_type delivery_type NOT NULL,
  address_id UUID REFERENCES public.addresses(id),
  status order_status NOT NULL DEFAULT 'RESERVADO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Platform Wallet
CREATE TABLE public.platform_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_wallet ENABLE ROW LEVEL SECURITY;

-- City Licenses
CREATE TABLE public.city_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  partner_name VARCHAR(200),
  partner_email VARCHAR(150),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(city, state)
);
ALTER TABLE public.city_licenses ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- Profiles: users can read/update their own, admins can read all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'));

-- User Roles: users can read own roles, admins can manage
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));
CREATE POLICY "System can insert roles" ON public.user_roles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Addresses: users manage own
CREATE POLICY "Users manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);

-- Vendors: owner can manage, all authenticated can view approved
CREATE POLICY "Owner manages vendor" ON public.vendors FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "View approved vendors" ON public.vendors FOR SELECT USING (status = 'APROVADO');
CREATE POLICY "Admins manage vendors" ON public.vendors FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Offers: vendors manage own, all authenticated can view active
CREATE POLICY "Vendors manage own offers" ON public.offers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = vendor_id AND v.user_id = auth.uid())
);
CREATE POLICY "View active offers" ON public.offers FOR SELECT USING (status = 'ATIVA');
CREATE POLICY "Admins manage offers" ON public.offers FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Wallets: users view own
CREATE POLICY "Users view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wallet Transactions: users view own via wallet
CREATE POLICY "Users view own transactions" ON public.wallet_transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.wallets w WHERE w.id = wallet_id AND w.user_id = auth.uid())
);

-- Orders: users manage own, vendors can view orders for their offers
CREATE POLICY "Users manage own orders" ON public.orders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Vendors view offer orders" ON public.orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.offers o
    JOIN public.vendors v ON v.id = o.vendor_id
    WHERE o.id = offer_id AND v.user_id = auth.uid()
  )
);
CREATE POLICY "Admins manage orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- Platform Wallet: admin only
CREATE POLICY "Admins view platform wallet" ON public.platform_wallet FOR SELECT USING (public.has_role(auth.uid(), 'ADMIN'));

-- City Licenses: admin only
CREATE POLICY "Admins manage city licenses" ON public.city_licenses FOR ALL USING (public.has_role(auth.uid(), 'ADMIN'));

-- ============ TRIGGERS ============

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Auto-create profile and wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  INSERT INTO public.wallets (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'CLIENTE'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Insert initial platform wallet row
INSERT INTO public.platform_wallet (balance) VALUES (0);
