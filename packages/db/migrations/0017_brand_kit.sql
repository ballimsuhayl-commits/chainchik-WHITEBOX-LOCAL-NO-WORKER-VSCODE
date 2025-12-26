ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS brand_logo_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS brand_primary_color text NOT NULL DEFAULT '#111111',
  ADD COLUMN IF NOT EXISTS brand_accent_color text NOT NULL DEFAULT '#ffffff';
