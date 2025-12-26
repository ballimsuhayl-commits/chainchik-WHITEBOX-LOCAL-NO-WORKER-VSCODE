CREATE TABLE IF NOT EXISTS product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_sku text NOT NULL REFERENCES products(sku) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_images_sku ON product_images(product_sku, sort_order);

CREATE TABLE IF NOT EXISTS order_checklists (
  order_id uuid PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  payment_verified boolean NOT NULL DEFAULT false,
  stock_picked boolean NOT NULL DEFAULT false,
  address_verified boolean NOT NULL DEFAULT false,
  packed boolean NOT NULL DEFAULT false,
  approved_ready_to_ship boolean NOT NULL DEFAULT false,
  approved_by_admin uuid NULL REFERENCES admin_users(id),
  approved_at timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS low_stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL REFERENCES products(sku) ON DELETE CASCADE,
  last_alert_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sku)
);
