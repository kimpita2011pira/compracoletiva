
-- Create category enum
CREATE TYPE public.offer_category AS ENUM (
  'ALIMENTACAO',
  'BELEZA',
  'ELETRONICOS',
  'MODA',
  'CASA',
  'SAUDE',
  'SERVICOS',
  'OUTROS'
);

-- Add category column to offers (nullable with default)
ALTER TABLE public.offers ADD COLUMN category public.offer_category DEFAULT 'OUTROS';
