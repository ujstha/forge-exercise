-- Closes a privilege hole: programmes / programme_sessions / session_exercises
-- had no ownership column and were governed by "USING (auth.role() =
-- 'authenticated')" — any signed-in user could INSERT/UPDATE/DELETE any
-- programme, including other users' and the preloaded ones. Harmless with a
-- single user; unsafe the moment a second account exists. Mirrors the
-- ownership model `foods` already uses: user_id IS NULL = shared/preloaded
-- (read-only from the app), user_id = auth.uid() = private and editable.

ALTER TABLE programmes ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
CREATE INDEX idx_programmes_user_id ON programmes(user_id);

DROP POLICY "programmes_select" ON programmes;
DROP POLICY "programmes_write" ON programmes;

CREATE POLICY "programmes_select" ON programmes
  FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);
CREATE POLICY "programmes_insert_own" ON programmes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "programmes_update_own" ON programmes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "programmes_delete_own" ON programmes
  FOR DELETE USING (auth.uid() = user_id);

-- programme_sessions / session_exercises have no user_id of their own —
-- ownership follows the parent programme.

DROP POLICY "programme_sessions_select" ON programme_sessions;
DROP POLICY "programme_sessions_write" ON programme_sessions;

CREATE POLICY "programme_sessions_select" ON programme_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM programmes p
      WHERE p.id = programme_sessions.programme_id
        AND (p.user_id IS NULL OR p.user_id = auth.uid())
    )
  );
CREATE POLICY "programme_sessions_write" ON programme_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM programmes p
      WHERE p.id = programme_sessions.programme_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM programmes p
      WHERE p.id = programme_sessions.programme_id AND p.user_id = auth.uid()
    )
  );

DROP POLICY "session_exercises_select" ON session_exercises;
DROP POLICY "session_exercises_write" ON session_exercises;

CREATE POLICY "session_exercises_select" ON session_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM programme_sessions ps
      JOIN programmes p ON p.id = ps.programme_id
      WHERE ps.id = session_exercises.session_id
        AND (p.user_id IS NULL OR p.user_id = auth.uid())
    )
  );
CREATE POLICY "session_exercises_write" ON session_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM programme_sessions ps
      JOIN programmes p ON p.id = ps.programme_id
      WHERE ps.id = session_exercises.session_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM programme_sessions ps
      JOIN programmes p ON p.id = ps.programme_id
      WHERE ps.id = session_exercises.session_id AND p.user_id = auth.uid()
    )
  );
