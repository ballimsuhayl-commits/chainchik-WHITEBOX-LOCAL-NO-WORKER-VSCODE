CREATE INDEX IF NOT EXISTS idx_dead_letter_type_next ON dead_letter_jobs(type, next_run_at);
