CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku text NOT NULL,
  delta integer NOT NULL,
  reason text NOT NULL,
  actor text NOT NULL DEFAULT 'system',
  order_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_sku ON stock_movements(sku);

CREATE TABLE IF NOT EXISTS dead_letter_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  type text NOT NULL,
  payload jsonb,
  error text,
  attempts integer NOT NULL DEFAULT 1,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dead_letter_next ON dead_letter_jobs(next_run_at);

CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'owner',
  api_key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
