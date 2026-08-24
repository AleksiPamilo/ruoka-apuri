CREATE TABLE IF NOT EXISTS protein_categories (
  id text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL
);

ALTER TABLE protein_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for protein_categories" 
  ON protein_categories FOR SELECT 
  TO anon 
  USING (true);

INSERT INTO protein_categories (id, label, sort_order)
VALUES
  ('meat', 'Liha', 1),
  ('fish', 'Kala', 2),
  ('plant_based', 'Kasvipohjainen', 3),
  ('other', 'Muu', 4)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  sort_order = EXCLUDED.sort_order;

INSERT INTO proteins (label, icon, category)
SELECT val.label, val.icon, val.category
FROM (
  VALUES
    ('Nauta', '🥩', 'meat'),
    ('Kana', '🍗', 'meat'),
    ('Kala', '🐟', 'fish'),
    ('Possu', '🥓', 'meat'),
    ('Kasviproteiini & Tofu', '🌱', 'plant_based'),
    ('Kananmuna & Juusto', '🥚', 'other')
) AS val(label, icon, category)
WHERE NOT EXISTS (
  SELECT 1 FROM proteins p WHERE p.label = val.label
);

CREATE TABLE IF NOT EXISTS shopping_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  category_id text REFERENCES shopping_categories(id) ON DELETE SET NULL,
  default_unit text
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id uuid REFERENCES ingredients(id) ON DELETE RESTRICT,
  amount numeric,
  unit text,
  optional boolean DEFAULT false
);

ALTER TABLE shopping_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access for shopping_categories" 
  ON shopping_categories FOR SELECT 
  TO anon 
  USING (true);

CREATE POLICY "Allow public read access for ingredients" 
  ON ingredients FOR SELECT 
  TO anon 
  USING (true);

CREATE POLICY "Allow public read access for recipe_ingredients" 
  ON recipe_ingredients FOR SELECT 
  TO anon 
  USING (true);

INSERT INTO shopping_categories (id, name, icon, color, sort_order)
VALUES
  ('produce', 'Hevi & Kasvikset', 'leaf-outline', '#34C759', 1),
  ('meat_fish', 'Liha, Kala & Kasviprot.', 'restaurant-outline', '#FF3B30', 2),
  ('dairy', 'Maitotuotteet & Juustot', 'water-outline', '#007AFF', 3),
  ('bakery', 'Leipomo', 'nutrition-outline', '#A2845E', 4),
  ('pantry', 'Kuiva-aineet & Säilykkeet', 'cube-outline', '#FF9500', 5),
  ('spices_oils', 'Mausteet & Öljyt', 'flask-outline', '#AF52DE', 6),
  ('frozen', 'Pakasteet', 'snow-outline', '#5856D6', 7),
  ('household', 'Koti & Talous', 'home-outline', '#5AC8FA', 8),
  ('other', 'Muut tuotteet', 'basket-outline', '#8E8E93', 9)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

DO $$
DECLARE
  r RECORD;
  ing RECORD;
  ing_name text;
  ing_amount numeric;
  ing_unit text;
  ing_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'recipes' AND column_name = 'ingredients'
  ) THEN
    FOR r IN SELECT id, ingredients FROM recipes WHERE ingredients IS NOT NULL AND jsonb_typeof(ingredients) = 'array' AND jsonb_array_length(ingredients) > 0 LOOP
      FOR ing IN SELECT * FROM jsonb_array_elements(r.ingredients) LOOP
        IF jsonb_typeof(ing.value) = 'object' THEN
          ing_name := trim(ing.value->>'name');
          ing_amount := CASE 
            WHEN ing.value->>'amount' IS NOT NULL AND (ing.value->>'amount') ~ '^[0-9]+(\.[0-9]+)?$' 
            THEN (ing.value->>'amount')::numeric 
            ELSE NULL 
          END;
          ing_unit := trim(ing.value->>'unit');
        ELSE
          ing_name := trim(ing.value#>>'{}');
          ing_amount := NULL;
          ing_unit := NULL;
        END IF;

        IF ing_name IS NOT NULL AND ing_name <> '' THEN
          INSERT INTO ingredients (name, default_unit)
          VALUES (ing_name, ing_unit)
          ON CONFLICT (name) DO UPDATE SET
            default_unit = COALESCE(ingredients.default_unit, EXCLUDED.default_unit)
          RETURNING id INTO ing_id;

          INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit)
          VALUES (r.id, ing_id, ing_amount, ing_unit);
        END IF;
      END LOOP;
    END LOOP;
  END IF;
END $$;
