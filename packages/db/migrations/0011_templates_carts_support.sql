CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  body text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  items jsonb NOT NULL,
  total_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'ZAR',
  status text NOT NULL DEFAULT 'OPEN',
  last_reminded_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_status_time ON cart_sessions(status, updated_at);

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone text NOT NULL,
  channel text NOT NULL DEFAULT 'whatsapp',
  order_id uuid NULL REFERENCES orders(id) ON DELETE SET NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'OPEN',
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status_time ON support_tickets(status, updated_at);

CREATE TABLE IF NOT EXISTS system_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'info',
  source text NOT NULL,
  event_key text NOT NULL,
  message text NOT NULL,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_system_events_time ON system_events(created_at DESC);


-- Default templates (edit in Admin -> Templates)
INSERT INTO message_templates (key,name,channel,body,active) VALUES
('order_received','Order received','whatsapp','✨ Thanks! We’ve received your order {{order_id}}. Please send your proof of payment (POP) when ready, and we’ll confirm ASAP. {{signoff}}',true),
('payment_confirmed','Payment confirmed','whatsapp','✅ Payment confirmed for order {{order_id}}. We’re packing your items now! {{signoff}}',true),
('ready_to_ship','Ready to ship','whatsapp','📦 Your order {{order_id}} is packed and ready to ship. We’ll send tracking as soon as it’s booked. {{signoff}}',true),
('tracking_sent','Tracking sent','whatsapp','🚚 Your order {{order_id}} is on the way! Tracking: {{tracking_id}}. {{signoff}}',true),
('abandoned_cart','Abandoned cart reminder','whatsapp','Hey! Just checking in 😊 Do you still want me to hold your cart? Reply “YES” and I’ll help you finish your order. {{signoff}}',true),
('sold_out','Sold out','whatsapp','Ahh—this one just sold out 😭 Want me to suggest the closest alternative? {{signoff}}',true)
ON CONFLICT (key) DO UPDATE SET name=EXCLUDED.name, channel=EXCLUDED.channel, body=EXCLUDED.body, active=EXCLUDED.active, updated_at=now();
