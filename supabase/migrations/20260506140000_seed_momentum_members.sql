-- Seed Momentum group members from the May 2026 spreadsheet
-- These are placeholder accounts; members should reset their password via "Forgot password"

DO $$
DECLARE
  siria_id    UUID := gen_random_uuid();
  gina_id     UUID := gen_random_uuid();
  alyssa_id   UUID := gen_random_uuid();
  marta_id    UUID := gen_random_uuid();
  janet_id    UUID := gen_random_uuid();
  daniela_id  UUID := gen_random_uuid();
  milagros_id UUID := gen_random_uuid();
  susanne_id  UUID := gen_random_uuid();
  cycle_id    UUID;
BEGIN

  -- ─── 1. Create auth users ──────────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, aud, role,
    email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  ) VALUES
    (siria_id,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'siria@momentum.placeholder',    '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (gina_id,     '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'gina@momentum.placeholder',     '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (alyssa_id,   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alyssa@momentum.placeholder',   '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (marta_id,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'marta@momentum.placeholder',    '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (janet_id,    '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'janet@momentum.placeholder',    '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (daniela_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'daniela@momentum.placeholder',  '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (milagros_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'milagros@momentum.placeholder', '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
    (susanne_id,  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'susanne@momentum.placeholder',  '', now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());
  -- Note: handle_new_user trigger auto-creates profiles + user_roles for each

  -- ─── 2. Update profiles with real data ────────────────────────────────────
  UPDATE public.profiles SET
    full_name = 'Siria', short_bio = 'Building a platform and looking for early user feedback.',
    status = 'approved', completed = true
  WHERE user_id = siria_id;

  UPDATE public.profiles SET
    full_name = 'Gina', short_bio = 'Exploring collaboration opportunities with companies in Lisbon.',
    status = 'approved', completed = true
  WHERE user_id = gina_id;

  UPDATE public.profiles SET
    full_name = 'Alyssa', short_bio = 'Launching a food brand — from recipes to a full product ordering system.',
    status = 'approved', completed = true
  WHERE user_id = alyssa_id;

  UPDATE public.profiles SET
    full_name = 'Marta', short_bio = 'Yoga retreat organizer building a sustainable retreat business.',
    status = 'approved', completed = true
  WHERE user_id = marta_id;

  UPDATE public.profiles SET
    full_name = 'Janet', short_bio = 'Consultant validating a new offering and identifying the right target clients.',
    status = 'approved', completed = true
  WHERE user_id = janet_id;

  UPDATE public.profiles SET
    full_name = 'Daniela', short_bio = 'Health coach building a client acquisition strategy through content and outreach.',
    status = 'approved', completed = true
  WHERE user_id = daniela_id;

  UPDATE public.profiles SET
    full_name = 'Milagros', short_bio = 'Optimizing her Instagram-to-website funnel and growing online sales.',
    status = 'approved', completed = true
  WHERE user_id = milagros_id;

  UPDATE public.profiles SET
    full_name = 'Susanne', short_bio = 'Growing a blanket brand with a focus on community events and digital sales.',
    status = 'approved', completed = true
  WHERE user_id = susanne_id;

  -- ─── 3. Create May 2026 accountability cycle ──────────────────────────────
  INSERT INTO public.accountability_cycles (id, name, month, year, created_by)
  VALUES (gen_random_uuid(), 'May 2026', 5, 2026, siria_id)
  ON CONFLICT (month, year) DO NOTHING;

  SELECT id INTO cycle_id FROM public.accountability_cycles WHERE month = 5 AND year = 2026;

  -- ─── 4. Monthly goals ─────────────────────────────────────────────────────
  INSERT INTO public.accountability_monthly_goals (cycle_id, user_id, monthly_goal, success_metric) VALUES
    (cycle_id, gina_id,
      'Reach out to identified companies in Lisbon and conduct 3-5 exploratory calls to identify concrete entry points for collaboration.',
      '10-12 personalized outreach messages sent, 3-5 exploratory calls completed, at least 1 concrete next step (e.g. follow-up, workshop interest or proposal discussion).'),
    (cycle_id, alyssa_id,
      'Successful brand launch and first event (May 10). Go from instagram & landing page to full product ordering system.',
      'Recipes tested and approved (by us and partner nutritionists). Products and packages defined. First round of orders completed.'),
    (cycle_id, marta_id,
      'Run a yoga retreat and launch two more retreats for later this year.',
      'Yoga retreat delivered (May 7-10th), a landing page for my next 2 retreats built and shared within my community (WhatsApp group, Insta and mailing list).'),
    (cycle_id, janet_id,
      'Validate my offering, the right size of a target business I can contribute best, and start a pilot project.',
      NULL),
    (cycle_id, daniela_id,
      'Launch my client acquisition strategy and get my first paying clients through consistent content and direct outreach.',
      '2 clients enrolled in a 1:1 accompaniment package and at least 8 integrative medical consultations booked.'),
    (cycle_id, susanne_id,
      'Optimize my website for conversion and grow my digital/social community (brand vs sales).',
      'Sell 40 blankets by the end of the month, grow Instagram to 300+ followers and get 40 event attendees for my first event in Berlin.')
  ON CONFLICT (cycle_id, user_id) DO NOTHING;

  -- ─── 5. Week 1 entries ────────────────────────────────────────────────────
  INSERT INTO public.accountability_weekly_entries (cycle_id, user_id, week_number, specific_goal, relevance, achievable, measurable) VALUES
    (cycle_id, siria_id, 1,
      'Attract 5 users to my platform so they can give me valuable feedback.',
      'It will help validate my website concept and identify gaps or issues.',
      'Issues finding the right people and getting them to participate.',
      'Measure the 5 signups.'),
    (cycle_id, gina_id, 1,
      'Identify 3 contact persons from my list of potential clients, write and send 3 individualized emails to introduce myself and ask for an exploratory call.',
      'Understand demand & challenges, first contact with potential clients.',
      'Potential blocker: feeling exhausted from my other job, resistance and fear of visibility. Resources available.',
      'Emails sent.'),
    (cycle_id, alyssa_id, 1,
      'Push towards launch event and properly evaluate what is possible on the long list (testing/finalizing recipes, creating product offers on website, cooking, website design and integration).',
      'Super relevant event for the business — for building community but also actual leads.',
      'The biggest thing holding me back is my own perfectionism. Choosing progress and consistency over perfection.',
      'Not feeling disappointed or completely drained following the event.'),
    (cycle_id, marta_id, 1,
      'Delivering my sold out yoga retreat.',
      'It will help me validate my website concept and uncover gaps or areas for improvement.',
      'Time limitations (other tasks on the table).',
      'Delivering the retreat, getting feedback from participants, pitching my other two retreats.'),
    (cycle_id, janet_id, 1,
      'Research 20-30 companies I''d like to target, and connect with the first 5.',
      'Validating if it''s relevant — are there responses?',
      'Fear of rejection and emotional capacity due to a personal situation. I''ll do time blocking and just send the messages — move from perfect to done.',
      'I sent the messages — first ones are OK with a simple message, then I''ll move to videos.'),
    (cycle_id, daniela_id, 1,
      'Create my first video, whether for a reel or story, and post it on IG.',
      'It would be the starting point for me to take the promotion of the business more seriously and reach more potential clients.',
      'Overcoming my own resistance to simply doing what needs to be done. Now having a device that allows me to work.',
      'Posting my first video on IG.'),
    (cycle_id, milagros_id, 1,
      'Optimize my funnel and bring people from Instagram to my website.',
      'Bring traffic to the website, and sales.',
      'The biggest thing holding me back is my own perfectionism. Choosing progress and consistency over perfection.',
      'Welcome series are running, and the KPIs (Growth, Engagement, Sales) show results.'),
    (cycle_id, susanne_id, 1,
      'Update website (Home, Shop, Product) with new content and copy; get final programming items for Berlin event (olive oil) and send event reminder on Friday; finish cards for Second Chance Club fundraiser.',
      'Will help improve the clarity of my offering, increase visibility and improve online sales; Berlin event will help establish my brand in the right circles and starts building a community.',
      'I tend to overengineer and write too much copy. Think more icons and snackable info. For the event I need to simplify the set design.',
      'Page updated by Wednesday for Home, Shop, Product. Olive oil in my suitcase. Event reminder sent.')
  ON CONFLICT (cycle_id, user_id, week_number) DO NOTHING;

END $$;
