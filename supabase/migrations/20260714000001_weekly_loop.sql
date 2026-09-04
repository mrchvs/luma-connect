-- ────────────────────────────────────────────────────────────────
-- Weekly need/offer matching loop — schema, RLS, extensions.
-- Member columns reference auth.users(id) (= auth.uid(), how the whole
-- app keys members); join to profiles via profiles.user_id.
-- ────────────────────────────────────────────────────────────────

-- Cron + HTTP (Phase 6). Fixed UTC schedules; will drift ±1h across DST — acceptable.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Origin tag on the Asks feed (needs auto-posted by the loop are marked here).
alter table public.requests add column if not exists source text;

-- Opt-in state on profiles.
alter table public.profiles add column if not exists weekly_loop_opt_in boolean not null default true;
alter table public.profiles add column if not exists weekly_loop_last_prompted_at timestamptz;

-- ── weekly_cycles ────────────────────────────────────────────────
create table if not exists public.weekly_cycles (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique,                 -- Monday; guards against double-runs
  prompt_sent_at timestamptz,
  matched_at timestamptz,
  status text not null default 'open' check (status in ('open','matching','complete','skipped')),
  stats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── weekly_responses ─────────────────────────────────────────────
create table if not exists public.weekly_responses (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.weekly_cycles(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  need_text text check (need_text is null or char_length(need_text) <= 400),
  offer_text text check (offer_text is null or char_length(offer_text) <= 400),
  submitted_at timestamptz not null default now(),
  unique (cycle_id, member_id)                     -- resubmitting updates the row
);

-- ── weekly_matches ───────────────────────────────────────────────
create table if not exists public.weekly_matches (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.weekly_cycles(id) on delete cascade,
  need_member_id uuid not null references auth.users(id) on delete cascade,
  offer_member_id uuid not null references auth.users(id) on delete cascade,
  need_excerpt text,
  rationale text,
  score numeric,
  status text not null default 'sent' check (status in ('sent','connected','not_a_fit','no_response')),
  intro_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (cycle_id, need_member_id, offer_member_id)
);

create index if not exists weekly_responses_cycle_idx on public.weekly_responses(cycle_id);
create index if not exists weekly_matches_cycle_idx on public.weekly_matches(cycle_id);
create index if not exists weekly_matches_need_member_idx on public.weekly_matches(need_member_id);
create index if not exists weekly_matches_offer_member_idx on public.weekly_matches(offer_member_id);

-- ── RLS ──────────────────────────────────────────────────────────
alter table public.weekly_cycles enable row level security;
alter table public.weekly_responses enable row level security;
alter table public.weekly_matches enable row level security;

-- cycles: read-only to members; admins/owners manage; service role bypasses RLS.
create policy "weekly_cycles read"
  on public.weekly_cycles for select to authenticated using (true);
create policy "weekly_cycles admin manage"
  on public.weekly_cycles for all to authenticated
  using (has_role(auth.uid(),'admin'::app_role) or has_role(auth.uid(),'owner'::app_role))
  with check (has_role(auth.uid(),'admin'::app_role) or has_role(auth.uid(),'owner'::app_role));

-- responses: a member reads/writes only her own row, and only while the cycle is open.
create policy "weekly_responses select own or admin"
  on public.weekly_responses for select to authenticated
  using (
    member_id = auth.uid()
    or has_role(auth.uid(),'admin'::app_role) or has_role(auth.uid(),'owner'::app_role)
  );
create policy "weekly_responses insert own open"
  on public.weekly_responses for insert to authenticated
  with check (
    member_id = auth.uid()
    and exists (select 1 from public.weekly_cycles c where c.id = cycle_id and c.status = 'open')
  );
create policy "weekly_responses update own open"
  on public.weekly_responses for update to authenticated
  using (
    member_id = auth.uid()
    and exists (select 1 from public.weekly_cycles c where c.id = cycle_id and c.status = 'open')
  )
  with check (member_id = auth.uid());

-- matches: a member sees rows she's in; may update ONLY the status column, and only
-- on rows where she's the need side. Column-level grant enforces the "status only" rule.
create policy "weekly_matches select participant or admin"
  on public.weekly_matches for select to authenticated
  using (
    need_member_id = auth.uid() or offer_member_id = auth.uid()
    or has_role(auth.uid(),'admin'::app_role) or has_role(auth.uid(),'owner'::app_role)
  );
create policy "weekly_matches update status by need member"
  on public.weekly_matches for update to authenticated
  using (need_member_id = auth.uid())
  with check (need_member_id = auth.uid());

revoke update on public.weekly_matches from authenticated;
grant update (status) on public.weekly_matches to authenticated;
