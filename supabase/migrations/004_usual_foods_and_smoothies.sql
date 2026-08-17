-- "Quick-tick" usual foods: a food can optionally be marked as a default
-- item for a meal slot with a remembered quantity, so logging it is a
-- single tap (pre-filled, editable) instead of the full search flow.
-- Mirrors how `supplements` already works, just pointed at food_logs.

ALTER TABLE foods ADD COLUMN usual_meal_slot TEXT;
ALTER TABLE foods ADD COLUMN usual_grams DECIMAL;

-- Two smoothie recipes (workout/football-day batch vs smaller rest-day
-- batch — different ingredient ratios, not just a smaller pour of the
-- same batch). Glutamine intentionally excluded: it's already tracked as
-- a 0-macro item via Supplements' finish/continue status, not diet macros.
INSERT INTO foods
  (name, protein_per_100g, carbs_per_100g, fat_per_100g, kcal_per_100g, serving_size_g, serving_name, is_preloaded, usual_meal_slot, usual_grams)
VALUES
  ('Smoothie — workout/football day (whey, oats, banana, blueberries, milk)', 8.1, 10.0, 0.9, 79, 600, '600ml morning portion (of 1190ml batch)', true, 'Breakfast', 600),
  ('Smoothie — rest day (whey, oats, banana, blueberries, milk)', 7.8, 11.9, 1.2, 89, 675, 'full 675ml batch', true, 'Breakfast', 675);
