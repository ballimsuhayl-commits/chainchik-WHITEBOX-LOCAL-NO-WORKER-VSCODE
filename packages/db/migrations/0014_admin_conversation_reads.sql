CREATE TABLE IF NOT EXISTS admin_conversation_reads (
  admin_user_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (admin_user_id, conversation_id)
);
CREATE INDEX IF NOT EXISTS idx_admin_reads_conv ON admin_conversation_reads(conversation_id, last_read_at);
