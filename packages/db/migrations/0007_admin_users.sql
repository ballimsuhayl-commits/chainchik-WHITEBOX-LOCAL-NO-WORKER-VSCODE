CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'ops', -- owner | ops | inventory
  api_key_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
