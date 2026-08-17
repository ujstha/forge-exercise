-- "Usual meal slot" was wrongly modeled as columns on `foods` — a shared
-- table where most rows (preloaded chicken, eggs, etc.) are locked from
-- editing by design. That made favoriting a personal preference
-- impossible for exactly the foods most likely to be favorited. Move it
-- to a per-user table instead: favoriting a food never requires owning
-- or editing that food's row.

CREATE TABLE food_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  food_id UUID REFERENCES foods(id) ON DELETE CASCADE NOT NULL,
  meal_slot TEXT NOT NULL,
  usual_grams DECIMAL NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, food_id, meal_slot)
);

ALTER TABLE food_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "food_favorites_all_own" ON food_favorites
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Backfill the two smoothie favorites (set on `foods` in migration 004)
-- for every existing profile, then drop the old columns.
INSERT INTO food_favorites (user_id, food_id, meal_slot, usual_grams)
SELECT p.id, f.id, f.usual_meal_slot, f.usual_grams
FROM profiles p
CROSS JOIN foods f
WHERE f.usual_meal_slot IS NOT NULL
ON CONFLICT (user_id, food_id, meal_slot) DO NOTHING;

ALTER TABLE foods DROP COLUMN usual_meal_slot;
ALTER TABLE foods DROP COLUMN usual_grams;
