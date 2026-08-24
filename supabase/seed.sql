INSERT INTO proteins (label, icon, category)
SELECT val.label, val.icon, val.category
FROM (
  VALUES
    ('Nauta', '🥩', 'meat'),
    ('Kana', '🍗', 'meat'),
    ('Kala', '🐟', 'fish'),
    ('Porsas', '🥓', 'meat'),
    ('Kasviproteiini & Tofu', '🌱', 'plant_based'),
    ('Kananmuna & Juusto', '🥚', 'other')
) AS val(label, icon, category)
WHERE NOT EXISTS (
  SELECT 1 FROM proteins p WHERE p.label = val.label
);

CREATE OR REPLACE FUNCTION seed_recipe(
  p_title text,
  p_protein_label text,
  p_description text,
  p_tags text[],
  p_is_meal_prep boolean,
  p_servings integer,
  p_prep_time integer,
  p_cook_time integer,
  p_instructions text[],
  p_ingredients jsonb
) RETURNS void AS $$
DECLARE
  v_protein_id uuid;
  v_recipe_id uuid;
  v_ing record;
  v_ing_id uuid;
  v_amount numeric;
BEGIN
  SELECT id INTO v_protein_id FROM proteins WHERE label ILIKE p_protein_label LIMIT 1;

  INSERT INTO recipes (
    title,
    protein_id,
    description,
    tags,
    is_meal_prep,
    servings_per_batch,
    prep_time_minutes,
    cook_time_minutes,
    instructions,
    rating
  ) VALUES (
    p_title,
    v_protein_id,
    p_description,
    p_tags,
    p_is_meal_prep,
    p_servings,
    p_prep_time,
    p_cook_time,
    p_instructions,
    5
  ) RETURNING id INTO v_recipe_id;

  FOR v_ing IN SELECT * FROM jsonb_array_elements(p_ingredients) LOOP
    v_amount := CASE 
      WHEN (v_ing.value->>'amount') IS NOT NULL AND (v_ing.value->>'amount') ~ '^[0-9]+(\.[0-9]+)?$' 
      THEN (v_ing.value->>'amount')::numeric 
      ELSE NULL 
    END;

    INSERT INTO ingredients (name, category_id, default_unit)
    VALUES (
      trim(v_ing.value->>'name'),
      v_ing.value->>'category_id',
      v_ing.value->>'unit'
    )
    ON CONFLICT (name) DO UPDATE SET
      category_id = COALESCE(EXCLUDED.category_id, ingredients.category_id),
      default_unit = COALESCE(EXCLUDED.default_unit, ingredients.default_unit)
    RETURNING id INTO v_ing_id;

    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, amount, unit, optional)
    VALUES (
      v_recipe_id,
      v_ing_id,
      v_amount,
      v_ing.value->>'unit',
      COALESCE((v_ing.value->>'optional')::boolean, false)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT seed_recipe(
  'Klassinen jauhelihakastike ja spagetti',
  'Nauta',
  'Täyteläinen ja nopea arkiklassikko tomaattipohjaisella kastikkeella.',
  ARRAY['Arkiruoka', 'Nopea', 'Klassikko', 'Lapsiperheille'],
  true,
  4,
  10,
  20,
  ARRAY[
    'Kuori ja hienonna sipuli sekä valkosipulinkynnet.',
    'Kuumenna öljy paistinpannussa ja ruskista jauheliha.',
    'Lisää sipulit jauhelihan joukkoon ja kuullota muutama minuutti.',
    'Kaada pannulle tomaattimurska, vesi ja lihaliemikuutio. Mausta suolalla, pippurilla ja oreganolla.',
    'Anna kastikkeen hautua miedolla lämmöllä noin 15 minuuttia.',
    'Keitä spagetti suolatussa vedessä pakkauksen ohjeen mukaan ja tarjoile kastikkeen kera.'
  ],
  '[
    {"name": "Naudan jauheliha", "amount": 400, "unit": "g", "category_id": "meat_fish"},
    {"name": "Spagetti", "amount": 400, "unit": "g", "category_id": "pantry"},
    {"name": "Tomaattimurska", "amount": 400, "unit": "g", "category_id": "pantry"},
    {"name": "Keltasipuli", "amount": 1, "unit": "kpl", "category_id": "produce"},
    {"name": "Valkosipulinkynsi", "amount": 2, "unit": "kpl", "category_id": "produce"},
    {"name": "Oliiviöljy", "amount": 1, "unit": "rkl", "category_id": "spices_oils"},
    {"name": "Lihaliemikuutio", "amount": 1, "unit": "kpl", "category_id": "spices_oils"},
    {"name": "Oregano", "amount": 1, "unit": "tl", "category_id": "spices_oils"},
    {"name": "Mustapippuri", "amount": 0.5, "unit": "tl", "category_id": "spices_oils"},
    {"name": "Suola", "amount": 0.5, "unit": "tl", "category_id": "spices_oils"}
  ]'::jsonb
);

SELECT seed_recipe(
  'Perinteinen jauhelihakeitto',
  'Nauta',
  'Maukas ja lämmittävä keitto runsailla juureksilla.',
  ARRAY['Keitto', 'Arkiruoka', 'Edullinen', 'MealPrep'],
  true,
  4,
  15,
  25,
  ARRAY[
    'Kuori ja kuutioi perunat, porkkanat ja sipuli.',
    'Ruskista jauheliha kattilan pohjalla tilkassa öljyä ja mausta mustapippurilla.',
    'Lisää kattilaan vesi, lihaliemikuutiot ja maustepippurit. Kuumenna kiehuvaksi.',
    'Lisää porkkanat ja sipulit, anna kiehua 5 minuuttia.',
    'Lisää perunakuutiot ja keitä vielä noin 10-15 minuuttia, kunnes perunat ovat pehmeitä.',
    'Viimeistele tuoreella hienonnetulla persiljalla.'
  ],
  '[
    {"name": "Naudan jauheliha", "amount": 400, "unit": "g", "category_id": "meat_fish"},
    {"name": "Peruna", "amount": 6, "unit": "kpl", "category_id": "produce"},
    {"name": "Porkkana", "amount": 3, "unit": "kpl", "category_id": "produce"},
    {"name": "Keltasipuli", "amount": 1, "unit": "kpl", "category_id": "produce"},
    {"name": "Lihaliemikuutio", "amount": 2, "unit": "kpl", "category_id": "spices_oils"},
    {"name": "Maustepippuri", "amount": 6, "unit": "kpl", "category_id": "spices_oils"},
    {"name": "Tuore persilja", "amount": 1, "unit": "nippu", "category_id": "produce"}
  ]'::jsonb
);

SELECT seed_recipe(
  'Kermainen curry-kanapasta',
  'Kana',
  'Täyteläinen ja nopea arkipasta murealla kanalla ja miedolla currylla.',
  ARRAY['Arkiruoka', 'Nopea', 'Pasta', 'Kermainen'],
  false,
  4,
  10,
  15,
  ARRAY[
    'Laita pastavesi kiehumaan ja keitä pasta suolatussa vedessä.',
    'Leikkaa kanan rintafileet suupaloiksi.',
    'Kuumenna öljy pannussa ja paista kanapaloja 5-7 minuuttia, kunnes ne ovat kypsiä.',
    'Lisää hienonnettu valkosipuli ja curryjauhe, kuullota hetki.',
    'Kaada joukkoon ruokakerma ja kanaliemikuutio. Anna kiehahtaa ja hautua muutama minuutti.',
    'Lisää tuore pinaatti kastikkeeseen ja sekoita valutetun pastan kanssa.'
  ],
  '[
    {"name": "Kanan rintafilee", "amount": 450, "unit": "g", "category_id": "meat_fish"},
    {"name": "Penne-pasta", "amount": 350, "unit": "g", "category_id": "pantry"},
    {"name": "Ruokakerma", "amount": 2.5, "unit": "dl", "category_id": "dairy"},
    {"name": "Valkosipulinkynsi", "amount": 2, "unit": "kpl", "category_id": "produce"},
    {"name": "Tuore pinaatti", "amount": 50, "unit": "g", "category_id": "produce"},
    {"name": "Curryjauhe", "amount": 1.5, "unit": "tl", "category_id": "spices_oils"},
    {"name": "Kanaliemikuutio", "amount": 1, "unit": "kpl", "category_id": "spices_oils"},
    {"name": "Rypsiöljy", "amount": 1, "unit": "rkl", "category_id": "spices_oils"}
  ]'::jsonb
);

SELECT seed_recipe(
  'Helppo kanaviillokki & jasmiiniriisi',
  'Kana',
  'Maukas ja pehmeä keltaisen kanaviillokin klassikko koko perheelle.',
  ARRAY['Klassikko', 'Arkiruoka', 'Mieto'],
  true,
  4,
  10,
  25,
  ARRAY[
    'Keitä jasmiiniriisi pakkauksen ohjeen mukaan.',
    'Paloittele kanat. Sulata voi kattilassa ja kuullota vehnäjauhoja ja currya hetki.',
    'Lisää kanaliemi vähitellen voimakkaasti vispaten, jotta kastikkeesta tulee tasainen.',
    'Lisää kanapalat kastikkeeseen ja anna kiehua hiljalleen noin 15 minuuttia.',
    'Lisää ruokakerma ja mausta suolalla ja pippurilla. Tarjoile riisin kera.'
  ],
  '[
    {"name": "Kanan paistileike", "amount": 500, "unit": "g", "category_id": "meat_fish"},
    {"name": "Jasmiiniriisi", "amount": 300, "unit": "g", "category_id": "pantry"},
    {"name": "Ruokakerma", "amount": 2, "unit": "dl", "category_id": "dairy"},
    {"name": "Vehnäjauho", "amount": 2, "unit": "rkl", "category_id": "pantry"},
    {"name": "Voi", "amount": 25, "unit": "g", "category_id": "dairy"},
    {"name": "Kanaliemikuutio", "amount": 1, "unit": "kpl", "category_id": "spices_oils"},
    {"name": "Curryjauhe", "amount": 1.5, "unit": "tl", "category_id": "spices_oils"}
  ]'::jsonb
);

SELECT seed_recipe(
  'Perinteinen kermainen lohikeitto',
  'Kala',
  'Klassinen suomalainen lohikeitto runsaalla tillillä ja voilla.',
  ARRAY['Klassikko', 'Keitto', 'Kala', 'Arkiruoka'],
  true,
  4,
  15,
  20,
  ARRAY[
    'Kuori ja kuutioi perunat, porkkanat ja hienonna purjo.',
    'Kiehauta vesi ja lisää kalaliemikuutio sekä maustepippurit.',
    'Lisää perunat, porkkanat ja purjo. Keitä noin 10-12 minuuttia kunnes kasvikset ovat lähes kypsiä.',
    'Paloittele lohifilee reiluiksi suupaloiksi ja poista nahka.',
    'Lisää lohipalat ja kerma keittoon. Kuumenna kiehuvaksi ja nosta pois liedeltä.',
    'Lisää voi ja reilusti hienonnettua tilliä. Anna vetäytyä kannen alla 5 minuuttia ennen tarjoilua.'
  ],
  '[
    {"name": "Kirjolohifilee", "amount": 400, "unit": "g", "category_id": "meat_fish"},
    {"name": "Peruna", "amount": 6, "unit": "kpl", "category_id": "produce"},
    {"name": "Porkkana", "amount": 2, "unit": "kpl", "category_id": "produce"},
    {"name": "Purjosipuli", "amount": 1, "unit": "kpl", "category_id": "produce"},
    {"name": "Kuohukerma", "amount": 2, "unit": "dl", "category_id": "dairy"},
    {"name": "Voi", "amount": 25, "unit": "g", "category_id": "dairy"},
    {"name": "Tuore tilli", "amount": 1, "unit": "nippu", "category_id": "produce"},
    {"name": "Kalaliemikuutio", "amount": 1, "unit": "kpl", "category_id": "spices_oils"},
    {"name": "Maustepippuri", "amount": 5, "unit": "kpl", "category_id": "spices_oils"}
  ]'::jsonb
);

SELECT seed_recipe(
  'Uunilohi ja pehmeä perunamuusi',
  'Kala',
  'Mehukas uunilohi sitruunalla ja tillillä tarjoiltuna voisen perunamuusin kanssa.',
  ARRAY['Klassikko', 'Uuniruoka', 'Kala', 'Viikonloppu'],
  false,
  4,
  15,
  25,
  ARRAY[
    'Laita uuni lämpenemään 200 asteeseen.',
    'Kuori ja keitä muusiperunat suolatussa vedessä kypsiksi.',
    'Nosta lohifilee uunivuokaan, mausta suolalla, pippurilla ja purista päälle sitruunamehua. Ripottele pinnalle tilliä.',
    'Paista lohta uunissa noin 20-25 minuuttia.',
    'Survo kypsät perunat, lisää lämmin maito, voi ja suola. Vatkaa kuohkeaksi muusiksi.',
    'Tarjoile lämpimänä raikkaan vihersalaatin kera.'
  ],
  '[
    {"name": "Kirjolohifilee", "amount": 600, "unit": "g", "category_id": "meat_fish"},
    {"name": "Peruna", "amount": 1, "unit": "kg", "category_id": "produce"},
    {"name": "Maito", "amount": 2, "unit": "dl", "category_id": "dairy"},
    {"name": "Voi", "amount": 50, "unit": "g", "category_id": "dairy"},
    {"name": "Sitruuna", "amount": 1, "unit": "kpl", "category_id": "produce"},
    {"name": "Tuore tilli", "amount": 1, "unit": "nippu", "category_id": "produce"},
    {"name": "Suola", "amount": 1, "unit": "tl", "category_id": "spices_oils"},
    {"name": "Mustapippuri", "amount": 0.5, "unit": "tl", "category_id": "spices_oils"}
  ]'::jsonb
);

SELECT seed_recipe(
  'Possunleikkeet ja paahdetut uunijuurekset',
  'Porsas',
  'Mureat porsaanleikkeet ja mehevät timjamilla maustetut uunijuurekset.',
  ARRAY['Uuniruoka', 'Liha', 'Gluteeniton'],
  false,
  4,
  15,
  30,
  ARRAY[
    'Kuumenna uuni 200 asteeseen.',
    'Pese, kuori ja lohko perunat, porkkanat ja punajuuret.',
    'Pyörittele juurekset oliiviöljyssä, suolassa ja timjamissa uunipellillä. Paahda uunissa 25-30 minuuttia.',
    'Ota porsaan ulkofileepihvit huoneenlämpöön 20 min ennen paistamista.',
    'Paista pihvejä kuumalla pannulla voissa noin 3-4 minuuttia per puoli, kunnes ne ovat kypsiä.',
    'Tarjoile mehevien uunijuuresten kera.'
  ],
  '[
    {"name": "Porsaan ulkofileepihvi", "amount": 4, "unit": "kpl", "category_id": "meat_fish"},
    {"name": "Porkkana", "amount": 4, "unit": "kpl", "category_id": "produce"},
    {"name": "Peruna", "amount": 4, "unit": "kpl", "category_id": "produce"},
    {"name": "Punajuuri", "amount": 3, "unit": "kpl", "category_id": "produce"},
    {"name": "Oliiviöljy", "amount": 2, "unit": "rkl", "category_id": "spices_oils"},
    {"name": "Voi", "amount": 20, "unit": "g", "category_id": "dairy"},
    {"name": "Timjami", "amount": 1, "unit": "tl", "category_id": "spices_oils"},
    {"name": "Suola", "amount": 1, "unit": "tl", "category_id": "spices_oils"},
    {"name": "Mustapippuri", "amount": 0.5, "unit": "tl", "category_id": "spices_oils"}
  ]'::jsonb
);

SELECT seed_recipe(
  'Tofuwokki ja riisinuudelit',
  'Kasviproteiini & Tofu',
  'Värikäs ja nopea kasvisruoka rapeaksi paistetulla tofulla ja soijakastikkeella.',
  ARRAY['Kasvisruoka', 'Vegaaninen', 'Nopea', 'Wokki'],
  false,
  4,
  15,
  15,
  ARRAY[
    'Valuta tofu ja painele kuivaksi talouspaperilla. Leikkaa kuutioiksi.',
    'Kuumenna öljy pannulla ja paista tofukuutioita rapeiksi noin 8 minuuttia.',
    'Keitä riisinuudelit pakkauksen ohjeen mukaan ja huuhtele kylmällä vedellä.',
    'Lisää pannulle wokkivihannekset, hienonnettu valkosipuli ja inkivääri. Paista muutama minuutti.',
    'Sekoita joukkoon soijakastike, seesamiöljy ja riisinuudelit. Kuumenna ja tarjoile heti.'
  ],
  '[
    {"name": "Maustamaton tofu", "amount": 300, "unit": "g", "category_id": "meat_fish"},
    {"name": "Wokkivihannekset", "amount": 400, "unit": "g", "category_id": "frozen"},
    {"name": "Riisinuudeli", "amount": 200, "unit": "g", "category_id": "pantry"},
    {"name": "Soijakastike", "amount": 3, "unit": "rkl", "category_id": "spices_oils"},
    {"name": "Seesamiöljy", "amount": 1, "unit": "rkl", "category_id": "spices_oils"},
    {"name": "Valkosipulinkynsi", "amount": 2, "unit": "kpl", "category_id": "produce"},
    {"name": "Tuore inkivääri", "amount": 1, "unit": "rkl", "category_id": "produce"},
    {"name": "Rypsiöljy", "amount": 2, "unit": "rkl", "category_id": "spices_oils"}
  ]'::jsonb
);

SELECT seed_recipe(
  'Tomaattinen soijarouhebolognese',
  'Kasviproteiini & Tofu',
  'Edullinen, runsasproteiininen ja maukas kasvisversio bolognesekastikkeesta.',
  ARRAY['Kasvisruoka', 'Vegaaninen', 'MealPrep', 'Edullinen'],
  true,
  4,
  10,
  20,
  ARRAY[
    'Hienonna sipuli ja valkosipulinkynnet.',
    'Kuumenna oliiviöljy kattilassa ja kuullota sipulit.',
    'Lisää kuiva soijarouhe, tomaattipyree ja mausteet. Paahda hetki.',
    'Kaada joukkoon tomaattimurska, vesi ja kasvisliemikuutio.',
    'Anna kastikkeen hautua miedolla lämmöllä 15 minuuttia.',
    'Keitä spagetti ohjeen mukaan ja tarjoile bolognesen kera.'
  ],
  '[
    {"name": "Tumma soijarouhe", "amount": 150, "unit": "g", "category_id": "meat_fish"},
    {"name": "Spagetti", "amount": 400, "unit": "g", "category_id": "pantry"},
    {"name": "Tomaattimurska", "amount": 400, "unit": "g", "category_id": "pantry"},
    {"name": "Tomaattipyree", "amount": 2, "unit": "rkl", "category_id": "pantry"},
    {"name": "Keltasipuli", "amount": 1, "unit": "kpl", "category_id": "produce"},
    {"name": "Valkosipulinkynsi", "amount": 2, "unit": "kpl", "category_id": "produce"},
    {"name": "Kasvisliemikuutio", "amount": 1, "unit": "kpl", "category_id": "spices_oils"},
    {"name": "Oliiviöljy", "amount": 2, "unit": "rkl", "category_id": "spices_oils"},
    {"name": "Oregano", "amount": 1, "unit": "tl", "category_id": "spices_oils"}
  ]'::jsonb
);

SELECT seed_recipe(
  'Tomaattinen tonnikalapasta',
  'Kala',
  'Erittäin nopea ja edullinen arkipasta tonnikalalla ja yrttisellä tomaattikastikkeella.',
  ARRAY['Arkiruoka', 'Nopea', 'Edullinen', 'Kala'],
  false,
  4,
  5,
  15,
  ARRAY[
    'Laita pastavesi kiehumaan ja keitä penne-pasta suolatussa vedessä.',
    'Kuori ja hienonna sipuli ja valkosipulit.',
    'Kuumenna öljy pannulla ja kuullota sipuleita muutama minuutti.',
    'Lisää tomaattimurska, oregano ja mustapippuri. Anna hautua 10 minuuttia.',
    'Valuta tonnikalat ja lisää kastikkeeseen. Kuumenna varovasti sekoittaen.',
    'Yhdistä valutettu pasta ja kastike, nauti heti.'
  ],
  '[
    {"name": "Tonnikalapala öljyssä", "amount": 2, "unit": "prk", "category_id": "meat_fish"},
    {"name": "Penne-pasta", "amount": 400, "unit": "g", "category_id": "pantry"},
    {"name": "Tomaattimurska", "amount": 400, "unit": "g", "category_id": "pantry"},
    {"name": "Keltasipuli", "amount": 1, "unit": "kpl", "category_id": "produce"},
    {"name": "Valkosipulinkynsi", "amount": 2, "unit": "kpl", "category_id": "produce"},
    {"name": "Oliiviöljy", "amount": 1, "unit": "rkl", "category_id": "spices_oils"},
    {"name": "Oregano", "amount": 1, "unit": "tl", "category_id": "spices_oils"},
    {"name": "Mustapippuri", "amount": 0.5, "unit": "tl", "category_id": "spices_oils"}
  ]'::jsonb
);

SELECT seed_recipe(
  'Pinaatti-fetapiirakka',
  'Kananmuna & Juusto',
  'Mehevä ja maukas suolainen piirakka murennetulla fetalla ja tuoreella pinaatilla.',
  ARRAY['Kasvisruoka', 'Piirakka', 'MealPrep', 'Arkiruoka'],
  true,
  6,
  15,
  35,
  ARRAY[
    'Laita uuni lämpenemään 200 asteeseen ja painele valmis piirakkapohja vuokaan.',
    'Kuullota tuoretta pinaattia ja sipulia pannulla tilkassa öljyä kunnes pinaatti painuu kasaan.',
    'Levitä pinaatti-sipuliseos ja murennettu fetajuusto piirakkapohjalle.',
    'Vispaa kulhossa kananmunat, ruokakerma ja mustapippuri sekaisin.',
    'Kaada munamaito täytteen päälle ja paista uunin alatasolla noin 30-35 minuuttia, kunnes piirakka on hyytynyt ja kullanruskea.'
  ],
  '[
    {"name": "Piirakkataikina (suolainen)", "amount": 1, "unit": "kpl", "category_id": "frozen"},
    {"name": "Tuore pinaatti", "amount": 150, "unit": "g", "category_id": "produce"},
    {"name": "Fetajuusto", "amount": 200, "unit": "g", "category_id": "dairy"},
    {"name": "Kananmuna", "amount": 3, "unit": "kpl", "category_id": "dairy"},
    {"name": "Ruokakerma", "amount": 2, "unit": "dl", "category_id": "dairy"},
    {"name": "Keltasipuli", "amount": 1, "unit": "kpl", "category_id": "produce"},
    {"name": "Mustapippuri", "amount": 0.5, "unit": "tl", "category_id": "spices_oils"}
  ]'::jsonb
);

DROP FUNCTION IF EXISTS seed_recipe(text, text, text, text[], boolean, integer, integer, integer, text[], jsonb);
