-- Emoji reactions on weekly entries (cohort pulse cards)
CREATE TABLE IF NOT EXISTS accountability_entry_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES accountability_weekly_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entry_id, user_id, emoji)
);

ALTER TABLE accountability_entry_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reactions_select" ON accountability_entry_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "reactions_insert" ON accountability_entry_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON accountability_entry_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);
