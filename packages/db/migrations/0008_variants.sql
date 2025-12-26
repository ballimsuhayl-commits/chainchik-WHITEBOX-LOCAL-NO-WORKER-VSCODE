ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS variant_key text;

CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_sku text NOT NULL REFERENCES products(sku) ON DELETE CASCADE,
  variant_key text NOT NULL,
  variant_name text NOT NULL,
  price_cents integer NOT NULL,
  stock_qty integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_sku, variant_key)
);
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_sku);
