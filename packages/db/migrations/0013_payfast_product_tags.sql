ALTER TABLE products ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

-- Track payment provider refs
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider text NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_ref text NULL;
CREATE INDEX IF NOT EXISTS idx_orders_payment_ref ON orders(payment_provider, payment_ref);
