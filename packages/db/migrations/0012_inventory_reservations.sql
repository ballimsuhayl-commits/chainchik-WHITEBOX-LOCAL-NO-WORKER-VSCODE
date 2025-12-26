CREATE TABLE IF NOT EXISTS inventory_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  sku text NOT NULL,
  variant_key text NULL,
  qty integer NOT NULL,
  status text NOT NULL DEFAULT 'HELD', -- HELD | USED | EXPIRED
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inv_res_status_exp ON inventory_reservations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_inv_res_phone ON inventory_reservations(customer_phone);
