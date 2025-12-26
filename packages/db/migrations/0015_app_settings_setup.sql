CREATE TABLE IF NOT EXISTS app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  business_name text NOT NULL DEFAULT 'Your Business',
  brand_signoff text NOT NULL DEFAULT '— Team',
  whatsapp_number text NOT NULL DEFAULT '',
  low_stock_threshold int NOT NULL DEFAULT 3,
  payment_mode text NOT NULL DEFAULT 'POP', -- POP | PAYFAST | BOTH
  courier_mode text NOT NULL DEFAULT 'MANUAL', -- MANUAL | COURIER_GUY
  setup_complete boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
