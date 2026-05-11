-- Seed real Week 1 data from the May 2026 spreadsheet
-- Milagros and Alyssa did not participate this week

DO $$
DECLARE
  v_cycle_id UUID;
  v_siria   UUID := 'a1b2c3d4-0001-0001-0001-000000000001';
  v_gina    UUID := 'a1b2c3d4-0002-0002-0002-000000000002';
  v_marta   UUID := 'a1b2c3d4-0004-0004-0004-000000000004';
  v_janet   UUID := 'a1b2c3d4-0005-0005-0005-000000000005';
  v_daniela UUID := 'a1b2c3d4-0006-0006-0006-000000000006';
  v_susanne UUID := 'a1b2c3d4-0008-0008-0008-000000000008';
  v_active  UUID[];
BEGIN
  v_active := ARRAY[v_siria, v_gina, v_marta, v_janet, v_daniela, v_susanne];

  -- Get May 2026 cycle
  SELECT id INTO v_cycle_id FROM public.accountability_cycles WHERE month = 5 AND year = 2026;
  IF v_cycle_id IS NULL THEN
    RAISE EXCEPTION 'May 2026 accountability cycle not found';
  END IF;

  -- Clear existing data for active participants
  DELETE FROM public.accountability_weekly_reflections WHERE cycle_id = v_cycle_id AND user_id = ANY(v_active);
  DELETE FROM public.accountability_weekly_entries    WHERE cycle_id = v_cycle_id AND user_id = ANY(v_active);
  DELETE FROM public.accountability_monthly_goals     WHERE cycle_id = v_cycle_id AND user_id = ANY(v_active);

  -- ── Monthly Goals ──────────────────────────────────────────────────────────
  INSERT INTO public.accountability_monthly_goals (cycle_id, user_id, monthly_goal, success_metric) VALUES
  (v_cycle_id, v_gina,
   'Reach out to identified companies in Lisbon and conduct 3-5 exploratory calls to identify concrete entry points for collaboration.',
   '10-12 personalized outreach messages sent, 3-5 exploratory calls completed, at least 1 concrete next step (e.g. follow-up, workshop interest or proposal discussion).'),
  (v_cycle_id, v_marta,
   'Run a yoga retreat and launch two more retreats for later this year.',
   'Yoga retreat delivered (May 7-10th), a landing page for my next 2 retreats built and shared within my community (WhatsApp group, Insta and mailing list).'),
  (v_cycle_id, v_janet,
   'Validate my offering, the right size of a target business I can contribute best, and start a pilot project.',
   NULL),
  (v_cycle_id, v_daniela,
   'Launch my client acquisition strategy and get my first paying clients through consistent content and direct outreach.',
   '2 clients enrolled in a 1:1 accompaniment package and at least 8 integrative medical consultations booked.'),
  (v_cycle_id, v_susanne,
   'Optimize my website for conversion and grow my digital/social community (brand vs sales).',
   'Sell 40 blankets by the end of the month, grow Instagram to 300+ followers and get 40 event attendees for my first event in Berlin.');

  -- ── Week 1 Entries ─────────────────────────────────────────────────────────
  INSERT INTO public.accountability_weekly_entries (cycle_id, user_id, week_number, specific_goal, relevance, achievable, measurable) VALUES
  (v_cycle_id, v_siria, 1,
   'Attract 5 users to my platform so they can give me valuable feedback.',
   'It will help validate my website concept and identify gaps or issues.',
   'Issues finding the right people and getting them to participate.',
   'Measure the five sign-ups.'),
  (v_cycle_id, v_gina, 1,
   'Identify 3 contact persons from my list of potential clients, write and send 3 individualized emails to introduce myself & ask for an exploratory call.',
   'Understand demand & challenges; first contact with potential clients.',
   'Potential blocker: feeling exhausted from my other job, resistance & fear of visibility. Resources available.',
   'E-mails sent.'),
  (v_cycle_id, v_marta, 1,
   'Delivering my sold-out yoga retreat.',
   'Making current clients satisfied so they can buy other retreats/services in the future.',
   'Time limitations (other tasks on the table).',
   'Delivering the retreat, getting feedback from participants, pitching my other two retreats later this year.'),
  (v_cycle_id, v_janet, 1,
   'Research 20-30 companies I''d like to target, and connect with the first 5.',
   'Validating if it''s relevant → are there responses?',
   'Fear of rejection and emotional capacity due to a personal situation. I''ll do time blocking and move from perfect to done, starting with the easiest to get momentum.',
   'I sent the messages — first ones are OK with a simple message, then I''ll move to videos.'),
  (v_cycle_id, v_daniela, 1,
   'Create my first video, whether for a reel or story, and post it on IG.',
   'It would be the starting point for me to take the promotion of the business more seriously and have a greater reach to get clients.',
   'Overcoming my own resistance to simply doing what needs to be done. And having a device that allows me to work.',
   'Posting my first video on IG.'),
  (v_cycle_id, v_susanne, 1,
   'Update website (Home, Shop, Product) with new content and copy; get final items for Berlin event (olive oil) and send event reminder on Friday; finish cards for Second Chance Club fundraiser.',
   'Will help improve the clarity of my offering, increase visibility and improve online sales; Berlin event will help establish my brand and start building a community.',
   'I tend to overengineer and write too much copy. Need to think in icons and snackable info rather than rolling out my brand story. For the event: simplify.',
   'Home, Shop, Product pages updated by Wednesday; olive oil in my suitcase; event reminder sent.');

  -- ── Week 1 Reflections ─────────────────────────────────────────────────────
  INSERT INTO public.accountability_weekly_reflections (cycle_id, user_id, week_number, achieved, reflection, blocker, adjustments) VALUES
  (v_cycle_id, v_siria, 1, 'partial',
   'I launched the platform on LinkedIn and shared it in community chats and my Instagram account, but did not attract new users.',
   'Maybe the posts are not attractive enough.',
   'Make them more attractive and find other channels to share.'),
  (v_cycle_id, v_gina, 1, 'partial',
   'Sent one individualized email to a warm potential client, arranged two exchange calls with Portuguese trainers, and scheduled a meeting with a new Portuguese HR contact via LinkedIn.',
   'Most potential client contacts were cold leads, and I felt uncertain about how to frame the value of exploratory calls. I currently rely more on warm introductions and local network-building.',
   'Focus on expanding my Portuguese network, actively ask for introductions to potential clients, and begin testing low-pressure outreach to selected cold contacts.'),
  (v_cycle_id, v_marta, 1, 'yes',
   'I hosted my retreat with 22 participants and pitched my other 2 retreats later this year (offering a bonus if they book another retreat this year).',
   'The time frame was clearly defined so there were no delays or slowing down.',
   'Planning more time to rest.'),
  (v_cycle_id, v_daniela, 1, 'yes',
   'I uploaded a video to a story talking and sharing a personal example of my view of health.',
   'I had a personal situation that disconnected me from everything. I''m in the middle of a personal grieving process.',
   'Perhaps better organization of how and when to do it. Planning.'),
  (v_cycle_id, v_susanne, 1, 'yes',
   'I didn''t do the website myself but got someone to help me. I always want to keep control of everything but letting go helped — I managed to fine-tune everything and am super pleased with the result. We also updated the local language versions (PT, DE).',
   'I should have asked for help earlier, or put more emphasis on higher sales-yielding activities than the event. The event has taken up a lot of time and energy and I''m still worried it will go wrong — fear slows me down and turns me into a perfectionist.',
   'Ask for help sooner. Focus on what drives revenue.');

END $$;
