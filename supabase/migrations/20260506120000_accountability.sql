-- Accountability group feature: monthly cycles with weekly commitments and reflections

CREATE TABLE IF NOT EXISTS accountability_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS accountability_monthly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES accountability_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  monthly_goal TEXT NOT NULL,
  success_metric TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, user_id)
);

CREATE TABLE IF NOT EXISTS accountability_weekly_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES accountability_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 4),
  specific_goal TEXT,
  relevance TEXT,
  achievable TEXT,
  measurable TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, user_id, week_number)
);

CREATE TABLE IF NOT EXISTS accountability_weekly_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_id UUID NOT NULL REFERENCES accountability_cycles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  week_number INTEGER NOT NULL CHECK (week_number BETWEEN 1 AND 4),
  achieved TEXT CHECK (achieved IN ('yes', 'partial', 'no')),
  reflection TEXT,
  blocker TEXT,
  adjustments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cycle_id, user_id, week_number)
);

-- RLS
ALTER TABLE accountability_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_weekly_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_weekly_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cycles_select" ON accountability_cycles FOR SELECT TO authenticated USING (true);
CREATE POLICY "cycles_insert" ON accountability_cycles FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "monthly_goals_select" ON accountability_monthly_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "monthly_goals_insert" ON accountability_monthly_goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "monthly_goals_update" ON accountability_monthly_goals FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "weekly_entries_select" ON accountability_weekly_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "weekly_entries_insert" ON accountability_weekly_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weekly_entries_update" ON accountability_weekly_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "weekly_reflections_select" ON accountability_weekly_reflections FOR SELECT TO authenticated USING (true);
CREATE POLICY "weekly_reflections_insert" ON accountability_weekly_reflections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "weekly_reflections_update" ON accountability_weekly_reflections FOR UPDATE TO authenticated USING (auth.uid() = user_id);
