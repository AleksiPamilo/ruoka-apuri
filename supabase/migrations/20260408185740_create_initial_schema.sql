CREATE TABLE IF NOT EXISTS proteins (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  label text NOT NULL,
  icon text,
  category text NOT NULL CHECK (category IN ('meat', 'fish', 'plant_based', 'other'))
);

CREATE TABLE IF NOT EXISTS recipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  title text NOT NULL,
  protein_id uuid REFERENCES proteins(id) ON DELETE SET NULL,
  tags text[] DEFAULT '{}' NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  is_meal_prep boolean DEFAULT false NOT NULL,
  last_suggested timestamp with time zone
);

ALTER TABLE proteins ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for proteins" 
  ON proteins FOR SELECT 
  TO anon 
  USING (true);

CREATE POLICY "Allow public read access for recipes" 
  ON recipes FOR SELECT 
  TO anon 
  USING (true);