CREATE TABLE IF NOT EXISTS households (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text DEFAULT 'Oma talous' NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  last_active_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS household_shopping_items (
  id text PRIMARY KEY,
  household_id uuid REFERENCES households(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  amount numeric,
  unit text,
  category text DEFAULT 'other' NOT NULL,
  checked boolean DEFAULT false NOT NULL,
  is_custom boolean DEFAULT false NOT NULL,
  recipe_title text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS household_plans (
  household_id uuid REFERENCES households(id) ON DELETE CASCADE PRIMARY KEY,
  recipes jsonb DEFAULT '[]'::jsonb NOT NULL,
  protein_ids text[] DEFAULT '{}' NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_households_code ON households (code);
CREATE INDEX IF NOT EXISTS idx_household_shopping_items_household_id ON household_shopping_items (household_id);

ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for households"
  ON households FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access for households"
  ON households FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access for households"
  ON households FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access for household_shopping_items"
  ON household_shopping_items FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access for household_shopping_items"
  ON household_shopping_items FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access for household_shopping_items"
  ON household_shopping_items FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access for household_shopping_items"
  ON household_shopping_items FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "Allow public read access for household_plans"
  ON household_plans FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access for household_plans"
  ON household_plans FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access for household_plans"
  ON household_plans FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'household_shopping_items'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE household_shopping_items;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'household_plans'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE household_plans;
  END IF;
END $$;
