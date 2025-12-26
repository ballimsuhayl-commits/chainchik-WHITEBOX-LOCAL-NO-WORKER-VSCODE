ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_address_json jsonb,
  ADD COLUMN IF NOT EXISTS delivery_contact_json jsonb,
  ADD COLUMN IF NOT EXISTS delivery_entered_text text;

CREATE INDEX IF NOT EXISTS idx_orders_delivery ON orders((delivery_address_json->>'city'));
