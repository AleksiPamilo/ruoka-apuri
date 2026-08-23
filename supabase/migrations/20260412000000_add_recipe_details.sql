ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS ingredients jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS instructions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS prep_time_minutes integer DEFAULT 15,
  ADD COLUMN IF NOT EXISTS cook_time_minutes integer DEFAULT 25;
