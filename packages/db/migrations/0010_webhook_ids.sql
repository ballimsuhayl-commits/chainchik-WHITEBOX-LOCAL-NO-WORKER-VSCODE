ALTER TABLE conversation_messages
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS channel_message_id text;

CREATE INDEX IF NOT EXISTS idx_conv_msg_external ON conversation_messages(external_id);
CREATE INDEX IF NOT EXISTS idx_conv_msg_channel_id ON conversation_messages(channel_message_id);
