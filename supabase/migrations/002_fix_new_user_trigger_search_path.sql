-- Fixes "Database error saving new user" on sign-up.
--
-- handle_new_user() and seed_user_defaults() are SECURITY DEFINER functions
-- invoked by a trigger on auth.users, fired from Supabase's Auth service.
-- That connection's search_path does not include `public`, so the
-- unqualified references to `supplements` / `reminders` inside
-- seed_user_defaults() failed to resolve, aborting the whole signup
-- transaction. Pin search_path explicitly and schema-qualify every
-- reference so this doesn't depend on the caller's session state.

CREATE OR REPLACE FUNCTION public.seed_user_defaults(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.supplements (user_id, name, dose, status, display_order) VALUES
    (target_user_id, 'Electrolyte capsule', '1 capsule on waking', 'continue', 1),
    (target_user_id, 'SELF Micro Whey', '3 scoops (split 600ml/400ml)', 'continue', 2),
    (target_user_id, 'Omega-3 Möller', '2 caps with smoothie', 'continue', 3),
    (target_user_id, 'Creatine monohydrate', '5g pre-gym or after lunch', 'continue', 4),
    (target_user_id, 'Glutamine', '5g post-workout', 'finish', 5),
    (target_user_id, 'Magnesium bisglycinate', '1 tsp before bed', 'finish', 6),
    (target_user_id, 'Glycine powder', '2g morning + 2g bed', 'finish', 7),
    (target_user_id, 'HBCD cluster dextrin', '20g in training water', 'finish', 8);

  INSERT INTO public.reminders (user_id, label, time_of_day, only_on, message) VALUES
    (target_user_id, 'Wake up — electrolyte + water', '06:00', NULL, 'Electrolyte capsule + water'),
    (target_user_id, 'Morning smoothie + omega-3', '07:00', NULL, 'Time for your morning smoothie and omega-3'),
    (target_user_id, 'Pre-gym creatine', '09:00', 'gym', 'Take your pre-gym creatine'),
    (target_user_id, 'Post-gym shake', '11:30', 'gym', 'Post-gym shake time'),
    (target_user_id, 'Lunch — boil eggs if needed', '13:00', NULL, 'Lunch time — boil eggs if needed'),
    (target_user_id, 'Pre-football banana', '17:00', 'football', 'Eat a banana before football'),
    (target_user_id, 'Evening protein scoop', '16:30', NULL, 'Evening protein scoop'),
    (target_user_id, 'Post-football shake', '22:00', 'football', 'Post-football shake time'),
    (target_user_id, 'Bed reminder', '23:30', NULL, 'Time to wind down for bed');
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  PERFORM public.seed_user_defaults(NEW.id);
  RETURN NEW;
END;
$$;
