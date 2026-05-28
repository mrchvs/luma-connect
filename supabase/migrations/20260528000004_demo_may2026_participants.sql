-- ============================================================
-- DEMO DATA — 8 Female Solopreneur Participants, May 2026
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor)
-- To remove all demo data later:
--   DELETE FROM auth.users WHERE email LIKE '%.demo@lumacircle.co';
-- ============================================================

DO $$
DECLARE
  u1  UUID := 'dddddddd-demo-0001-0000-000000000001';
  u2  UUID := 'dddddddd-demo-0002-0000-000000000002';
  u3  UUID := 'dddddddd-demo-0003-0000-000000000003';
  u4  UUID := 'dddddddd-demo-0004-0000-000000000004';
  u5  UUID := 'dddddddd-demo-0005-0000-000000000005';
  u6  UUID := 'dddddddd-demo-0006-0000-000000000006';
  u7  UUID := 'dddddddd-demo-0007-0000-000000000007';
  u8  UUID := 'dddddddd-demo-0008-0000-000000000008';
  may_cycle UUID;
BEGIN

  -- ── 1. Auth users ─────────────────────────────────────────
  -- These users cannot actually log in; they exist purely for demo display.
  INSERT INTO auth.users (
    id, instance_id, aud, role, email,
    encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data,
    is_super_admin, created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES
    (u1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'sofia.chen.demo@lumacircle.co', crypt('DemoOnly!2026', gen_salt('bf')),
     NOW(),'{"provider":"email","providers":["email"]}','{"full_name":"Sofia Chen"}',
     false, NOW(), NOW(),'','','',''),
    (u2,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'maya.johnson.demo@lumacircle.co', crypt('DemoOnly!2026', gen_salt('bf')),
     NOW(),'{"provider":"email","providers":["email"]}','{"full_name":"Maya Johnson"}',
     false, NOW(), NOW(),'','','',''),
    (u3,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'priya.patel.demo@lumacircle.co', crypt('DemoOnly!2026', gen_salt('bf')),
     NOW(),'{"provider":"email","providers":["email"]}','{"full_name":"Priya Patel"}',
     false, NOW(), NOW(),'','','',''),
    (u4,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'isabel.moreau.demo@lumacircle.co', crypt('DemoOnly!2026', gen_salt('bf')),
     NOW(),'{"provider":"email","providers":["email"]}','{"full_name":"Isabel Moreau"}',
     false, NOW(), NOW(),'','','',''),
    (u5,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'aisha.williams.demo@lumacircle.co', crypt('DemoOnly!2026', gen_salt('bf')),
     NOW(),'{"provider":"email","providers":["email"]}','{"full_name":"Aisha Williams"}',
     false, NOW(), NOW(),'','','',''),
    (u6,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'emma.rodriguez.demo@lumacircle.co', crypt('DemoOnly!2026', gen_salt('bf')),
     NOW(),'{"provider":"email","providers":["email"]}','{"full_name":"Emma Rodriguez"}',
     false, NOW(), NOW(),'','','',''),
    (u7,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'layla.hassan.demo@lumacircle.co', crypt('DemoOnly!2026', gen_salt('bf')),
     NOW(),'{"provider":"email","providers":["email"]}','{"full_name":"Layla Hassan"}',
     false, NOW(), NOW(),'','','',''),
    (u8,'00000000-0000-0000-0000-000000000000','authenticated','authenticated',
     'zoe.andersen.demo@lumacircle.co', crypt('DemoOnly!2026', gen_salt('bf')),
     NOW(),'{"provider":"email","providers":["email"]}','{"full_name":"Zoe Andersen"}',
     false, NOW(), NOW(),'','','','')
  ON CONFLICT (id) DO NOTHING;

  -- ── 2. Profiles ───────────────────────────────────────────
  INSERT INTO profiles (
    user_id, full_name, city, country,
    short_bio, company_name, job_title,
    status, completed, credibility_confirmed,
    languages, proof_links
  ) VALUES
    (u1,'Sofia Chen','New York','United States',
     'Brand strategist helping wellness founders build magnetic personal brands that attract high-ticket clients.',
     'Chen Brand Studio','Personal Brand Strategist',
     'approved',true,true,ARRAY['English','Mandarin'],ARRAY[]::text[]),
    (u2,'Maya Johnson','Austin','United States',
     'Handmade jewelry designer running a full-time Etsy shop. Nature-inspired pieces made with intention.',
     'Moonvine Jewelry','Jewelry Designer & Maker',
     'approved',true,true,ARRAY['English'],ARRAY[]::text[]),
    (u3,'Priya Patel','London','United Kingdom',
     'Freelance UX designer specialising in fintech and health-tech. 6 years crafting intuitive digital products.',
     'Patel UX','Freelance UX Designer',
     'approved',true,true,ARRAY['English','Hindi'],ARRAY[]::text[]),
    (u4,'Isabel Moreau','Paris','France',
     'Life coach for female entrepreneurs navigating the messy middle of growing a business without losing themselves.',
     'Moreau Coaching','Business & Life Coach',
     'approved',true,true,ARRAY['French','English'],ARRAY[]::text[]),
    (u5,'Aisha Williams','Atlanta','United States',
     'Founder of a boutique VA agency helping coaches and consultants reclaim 20+ hours a week.',
     'Elevated Assistance','VA Agency Founder',
     'approved',true,true,ARRAY['English'],ARRAY[]::text[]),
    (u6,'Emma Rodriguez','Miami','United States',
     'Social media consultant turning scattered content ideas into consistent, converting strategies.',
     'Rodriguez Social','Social Media Consultant',
     'approved',true,true,ARRAY['English','Spanish'],ARRAY[]::text[]),
    (u7,'Layla Hassan','Dubai','United Arab Emirates',
     'Digital educator teaching solopreneurs how to grow on Instagram without burning out.',
     'LaylaLearns','Course Creator & Educator',
     'approved',true,true,ARRAY['Arabic','English'],ARRAY[]::text[]),
    (u8,'Zoe Andersen','Stockholm','Sweden',
     'SaaS copywriter obsessed with turning complex features into compelling stories that convert.',
     'Andersen Copy','SaaS Copywriter',
     'approved',true,true,ARRAY['Swedish','English'],ARRAY[]::text[])
  ON CONFLICT (user_id) DO NOTHING;

  -- ── 3. May 2026 cycle ─────────────────────────────────────
  SELECT id INTO may_cycle
  FROM accountability_cycles
  WHERE month = 5 AND year = 2026
  LIMIT 1;

  IF may_cycle IS NULL THEN
    INSERT INTO accountability_cycles (name, month, year, created_by)
    VALUES ('May 2026', 5, 2026,
      (SELECT id FROM auth.users WHERE email = 'hello@lumacircle.co' LIMIT 1))
    RETURNING id INTO may_cycle;
  END IF;

  -- ── 4. Cycle memberships ──────────────────────────────────
  INSERT INTO accountability_cycle_members (cycle_id, user_id, email, status)
  VALUES
    (may_cycle,u1,'sofia.chen.demo@lumacircle.co','joined'),
    (may_cycle,u2,'maya.johnson.demo@lumacircle.co','joined'),
    (may_cycle,u3,'priya.patel.demo@lumacircle.co','joined'),
    (may_cycle,u4,'isabel.moreau.demo@lumacircle.co','joined'),
    (may_cycle,u5,'aisha.williams.demo@lumacircle.co','joined'),
    (may_cycle,u6,'emma.rodriguez.demo@lumacircle.co','joined'),
    (may_cycle,u7,'layla.hassan.demo@lumacircle.co','joined'),
    (may_cycle,u8,'zoe.andersen.demo@lumacircle.co','joined')
  ON CONFLICT DO NOTHING;

  -- ── 5. Monthly goals ──────────────────────────────────────
  INSERT INTO accountability_monthly_goals (cycle_id, user_id, monthly_goal, success_metric)
  VALUES
    (may_cycle,u1,
     'Land 3 new brand strategy clients through LinkedIn outreach and referrals',
     'Signed contracts with 3 new clients by May 31'),
    (may_cycle,u2,
     'Launch spring collection and generate $3,000 in Etsy sales this month',
     '12 new listings live + $3K shown on Etsy stats dashboard'),
    (may_cycle,u3,
     'Deliver the FinFlow UX project and close the next contract before month end',
     'Client sign-off received + new contract signed'),
    (may_cycle,u4,
     'Launch my first group coaching cohort with at least 6 paying participants',
     '6 participants enrolled and first live session delivered'),
    (may_cycle,u5,
     'Raise my VA rates from $35 to $55/hr and retain all current clients',
     'New rate accepted by all existing clients with zero churn'),
    (may_cycle,u6,
     'Package my services into monthly retainers and sign 2 anchor clients',
     '2 signed retainer contracts at $1,500/month minimum'),
    (may_cycle,u7,
     'Complete and launch my Instagram for Business mini-course',
     'Course live with 30+ students enrolled and first revenue banked'),
    (may_cycle,u8,
     'Write 3 portfolio case studies and raise my project minimum by 25%',
     '3 published case studies + new rate applied to 2 incoming projects')
  ON CONFLICT DO NOTHING;

  -- ── 6. Weekly commitments ─────────────────────────────────
  INSERT INTO accountability_weekly_entries
    (cycle_id, user_id, week_number, specific_goal, relevance, measurable, achievable)
  VALUES
    -- Sofia Chen — brand strategist
    (may_cycle,u1,1,'Revamp LinkedIn profile and publish 3 thought-leadership posts',
     'LinkedIn is my #1 lead source — visibility directly brings in clients',
     '3 posts published + profile headline and banner updated',
     'I have 2 hours each morning blocked for content this week'),
    (may_cycle,u1,2,'Send 20 personalised outreach messages to warm LinkedIn leads',
     'Consistent outreach is the only way to fill my pipeline',
     '20 messages sent and tracked in my Notion CRM',
     'Message templates are ready, just need to personalise each one'),
    (may_cycle,u1,3,'Run 2 free brand audit calls and convert at least one to a paid project',
     'Discovery calls are my highest-converting closing tool',
     '2 calls completed + 1 proposal sent within 24 hours',
     'Slots already open in Calendly, 3 warm prospects confirmed'),
    (may_cycle,u1,4,'Onboard new clients and deliver their 30-day brand roadmaps',
     'A smooth onboarding experience turns clients into referral sources',
     'Welcome docs sent + first strategy call completed for each client',
     'Onboarding templates already tested with previous clients'),

    -- Maya Johnson — jewellery designer
    (may_cycle,u2,1,'Photograph and list 12 new spring collection pieces on Etsy',
     'New inventory is the engine of my shop — more listings means more visibility',
     '12 listings live with SEO-optimised titles and descriptions',
     'Photoshoot booked for Monday morning, props all prepared'),
    (may_cycle,u2,2,'Run a 48-hour flash sale and promote via Instagram stories and email',
     'Flash sales have historically tripled my daily revenue',
     'Minimum $500 in flash-sale revenue tracked in Etsy dashboard',
     'Email sequence drafted, discount codes ready to activate'),
    (may_cycle,u2,3,'Apply to 3 local markets and craft fairs for the summer season',
     'In-person events drive brand awareness and often lead to wholesale enquiries',
     '3 completed applications submitted before Sunday midnight',
     'Event shortlist already researched, forms are straightforward'),
    (may_cycle,u2,4,'Create a "stack and style" bundle offer and list it as a featured product',
     'Bundles increase average order value by around 40%',
     'Bundle listing live + at least 5 sales by end of week',
     'Materials for 10 bundles already boxed and ready'),

    -- Priya Patel — UX designer
    (may_cycle,u3,1,'Present the FinFlow wireframes and get stakeholder sign-off',
     'Client approval on wireframes triggers the next milestone payment',
     'Presentation delivered + written approval received via email',
     'Wireframes are 90% done — just need a final polish session'),
    (may_cycle,u3,2,'Incorporate feedback and hand off high-fidelity mockups in Figma',
     'High-fi delivery is the final contractual deliverable for this phase',
     'All 24 screens designed, annotated, and handed off in Figma',
     'Feedback was minor — mostly colour tweaks I can action in a morning'),
    (may_cycle,u3,3,'Run usability testing with 5 participants and present a findings report',
     'Testing before dev handoff prevents expensive rework downstream',
     '5 sessions recorded + summary report shared with client',
     'Panel of testers already recruited via UserTesting'),
    (may_cycle,u3,4,'Close the project formally and send the client a testimonial request',
     'Case study material and testimonials are my strongest sales assets',
     'Project signed off in writing + testimonial received or follow-up sent',
     'Relationship is warm — client has already praised the work verbally'),

    -- Isabel Moreau — life coach
    (may_cycle,u4,1,'Build a group coaching landing page and host a waitlist IG Live session',
     'I need visible momentum before I can open enrollment',
     'Landing page live + 50 or more IG Live viewers + 10 waitlist sign-ups',
     'Squarespace draft is half-built, IG Live slot confirmed'),
    (may_cycle,u4,2,'Run 5 discovery calls and tighten the group coaching curriculum',
     'Calls help me understand what participants actually need so I can sell it',
     '5 calls completed + curriculum doc updated with real language from calls',
     '5 waitlist leads are already keen to book'),
    (may_cycle,u4,3,'Open enrollment and personally DM 30 warm leads',
     'Personal outreach converts 3x better than broadcast emails at this stage',
     'Enrollment open + 30 DMs sent + at least 2 verbal commitments',
     'Warm lead list compiled from past 1:1 clients and engaged followers'),
    (may_cycle,u4,4,'Fill cohort to 6 participants and send the welcome package',
     'A full first cohort validates the offer and builds powerful community',
     '6 paid enrollments + welcome email with session link sent',
     '4 participants have verbally committed — need to convert 2 more'),

    -- Aisha Williams — VA agency
    (may_cycle,u5,1,'Draft and send rate-increase letters to all 4 existing clients',
     'Underpricing is unsustainable and prevents me from taking on better clients',
     '4 letters sent by Wednesday + at least 2 positive responses received',
     'Scripts reviewed by my business coach — I just need to hit send'),
    (may_cycle,u5,2,'Create premium VA service packages with clear scope and pricing',
     'Packaged offers reduce scope creep and increase perceived value',
     'New packages page live on my website with 3 clear tiers',
     'Service tier structure drafted — needs design formatting only'),
    (may_cycle,u5,3,'Attend 2 virtual networking events and make 5 genuine connections',
     'New higher-rate clients come through relationships, not cold ads',
     '2 events attended + 5 personalised follow-up emails sent same day',
     'Both events already booked in my calendar'),
    (may_cycle,u5,4,'Sign 2 new clients at the new $55/hr rate',
     'New-rate clients set the standard for all future business',
     '2 signed contracts at $55/hr in my CRM',
     '3 warm prospects from networking are in active conversations'),

    -- Emma Rodriguez — social media manager
    (may_cycle,u6,1,'Define 3 retainer package tiers and publish them on my website',
     'Without packaged offers I quote from scratch every single time — exhausting',
     'Packages page live with clear scope, deliverables, and pricing',
     'I know my pricing — this is purely a packaging and copywriting task'),
    (may_cycle,u6,2,'Build a pitch deck and send it to 15 past clients and warm leads',
     'Past clients already trust my work — they are the warmest possible audience',
     'Deck finished + 15 personalised emails sent with CRM notes updated',
     'Client list is ready and CRM is up to date'),
    (may_cycle,u6,3,'Book 3 discovery calls and send proposals to interested prospects',
     'Proposals only close when I am having real conversations',
     '3 calls completed + 2 written proposals sent within 24 hours',
     '2 prospects have already replied with strong interest'),
    (may_cycle,u6,4,'Sign the first retainer contract and build an onboarding document',
     'A signed retainer is recurring revenue — it changes everything',
     '1 contract signed + client onboarding doc sent on the same day',
     'Strong momentum from last week — one prospect is very close to yes'),

    -- Layla Hassan — course creator
    (may_cycle,u7,1,'Record and edit the first 5 video modules of the Instagram course',
     'Starting is the hardest part — I need to build momentum fast',
     '5 modules recorded, edited, and uploaded to Teachable',
     'Script written, recording corner set up and tested'),
    (may_cycle,u7,2,'Build the sales page and set up Stripe payment processing',
     'No sales page means no sales — this is the single most important unlock',
     'Sales page live + test payment completed successfully',
     'Canva template ready to adapt, copy outline already drafted'),
    (may_cycle,u7,3,'Run a beta with 3 testers and collect structured feedback',
     'Beta feedback helps me fix the course before it goes public',
     '3 testers completed all modules + feedback forms returned',
     '3 testers recruited from engaged Instagram followers'),
    (may_cycle,u7,4,'Launch to email list and run a 5-day Instagram launch campaign',
     'Launch week determines the momentum for the entire product',
     'Launch email sent + 5 posts published + 30 students enrolled',
     'All launch emails written, Instagram posts scheduled in Buffer'),

    -- Zoe Andersen — SaaS copywriter
    (may_cycle,u8,1,'Interview 2 past clients and outline the case study structure',
     'Case studies are my most powerful sales asset — I need them live',
     '2 interviews recorded + outlines approved by each client',
     'Both clients have already agreed to be featured'),
    (may_cycle,u8,2,'Write both case studies and get client approval',
     'Approved case studies can go live immediately and attract new projects',
     '2 complete drafts written + written approval from both clients',
     '3 writing mornings blocked this week — nothing else in those slots'),
    (may_cycle,u8,3,'Update website portfolio and pricing page to reflect new rates',
     'Higher rates need visible social proof to feel credible',
     'Portfolio updated with case studies + new rate card published',
     'Case studies designed as PDFs last weekend — ready to embed'),
    (may_cycle,u8,4,'Pitch 5 SaaS prospects at the new $3,500 project minimum',
     'Pitching consistently is the only way to hit my income goal this quarter',
     '5 tailored proposals sent with follow-up scheduled in CRM',
     'Prospect list identified from LinkedIn and two warm referrals')
  ON CONFLICT DO NOTHING;

  -- ── 7. Weekly reflections ─────────────────────────────────
  -- Status outcomes by design:
  -- Sofia  → yes/yes/yes/yes      = On fire 🏆 (4 done)
  -- Priya  → yes/yes/yes/partial  = On fire 🏆 (3 done)
  -- Isabel → yes/yes/partial/yes  = On fire 🏆 (3 done)
  -- Maya   → yes/partial/yes/partial = Building (2 done)
  -- Layla  → partial/yes/yes/partial = Building (2 done)
  -- Aisha  → yes/no/yes/partial   = Building  (2 done)
  -- Emma   → partial/partial/yes/no = Getting started (1 done)
  -- Zoe    → partial/partial/no/partial = You've got this (0 done)

  INSERT INTO accountability_weekly_reflections
    (cycle_id, user_id, week_number, achieved, reflection, blocker, adjustments)
  VALUES
    -- Sofia Chen: yes / yes / yes / yes
    (may_cycle,u1,1,'yes',
     'Revamped my LinkedIn and published 3 posts — one hit 8K impressions organically. Two DMs from potential clients already.',
     'Fitting writing time around client work was tight.',
     'Batch all content writing on Sunday evenings going forward.'),
    (may_cycle,u1,2,'yes',
     'Sent 22 messages, got 6 replies, and booked 3 discovery calls. Best outreach week I have ever had.',
     'None — the templates made everything faster than expected.',
     'Keep refining the template based on which lines are getting the most replies.'),
    (may_cycle,u1,3,'yes',
     'Both audit calls went incredibly well. Converted both to paid projects on the call — 2 new clients in one week!',
     'One prospect ghosted after an initial positive reply.',
     'Add a 24-hour follow-up sequence after every call. Silence is not a no.'),
    (may_cycle,u1,4,'yes',
     'Onboarded both new clients smoothly. Roadmaps delivered, they were thrilled. One already sent a referral.',
     'Juggling 5 active clients stretched me thin by Thursday.',
     'Seriously evaluate hiring a junior VA to handle admin next month.'),

    -- Maya Johnson: yes / partial / yes / partial
    (may_cycle,u2,1,'yes',
     'All 12 listings live! Photos came out beautiful and two pieces sold within 3 hours of going live.',
     'Photo editing took twice as long as planned.',
     'Batch film in sets of 20+ to make the setup time worth it.'),
    (may_cycle,u2,2,'partial',
     'Flash sale did well but only hit $320 — short of $500. Instagram reach was great but my email list is tiny.',
     'Email list has only 180 subscribers — limited revenue engine from that channel.',
     'Add a mailing-list QR code to every packaging insert starting now.'),
    (may_cycle,u2,3,'yes',
     'Applied to 4 fairs instead of 3 — and got accepted to 2 already. Summer calendar is filling up beautifully.',
     'Application fees added up more than I expected.',
     'Create a quarterly "market fund" of $200 to budget for applications and booth costs.'),
    (may_cycle,u2,4,'partial',
     'Bundle listing is live and looking gorgeous, but only 2 sales so far. Not the traction I hoped for.',
     'The $89 bundle price might be a friction point.',
     'A/B test $75 vs $89 next month and look at competitor pricing.'),

    -- Priya Patel: yes / yes / yes / partial
    (may_cycle,u3,1,'yes',
     'Client approved wireframes on the spot and called them "exactly the direction we needed." First payment milestone unlocked.',
     'The feedback session ran 2.5 hours — I need tighter facilitation.',
     'Send pre-read materials 48 hours before sessions so clients arrive prepared.'),
    (may_cycle,u3,2,'yes',
     'High-fi screens handed off in Figma. Client called to say it was exactly what they envisioned. Great feeling.',
     'The colour system took longer than expected to lock down.',
     'Set up design tokens and a style guide at project kickoff — saves hours downstream.'),
    (may_cycle,u3,3,'yes',
     '5 usability tests done, 3 significant issues uncovered and fixed before handoff. Client stakeholders were visibly impressed.',
     'Recruiting participants took 4 days instead of 1.',
     'Build a standing panel of 30 regular testers I can contact directly — much faster.'),
    (may_cycle,u3,4,'partial',
     'Project signed off! But the testimonial is still pending — client keeps saying "this weekend" for 3 weeks.',
     'Client is a slow communicator once the project closes.',
     'Send a fill-in-the-blank testimonial template to remove the friction for them.'),

    -- Isabel Moreau: yes / yes / partial / yes
    (may_cycle,u4,1,'yes',
     'Landing page live, 47 IG Live viewers, and 12 waitlist sign-ups in 24 hours. Exceeded every target!',
     'Tech setup for the live was stressful — went live 8 minutes late.',
     'Do a full tech rehearsal 30 minutes before every live from now on.'),
    (may_cycle,u4,2,'yes',
     '5 discovery calls done and 3 said yes ON the call. Curriculum is now tighter and outcomes-focused.',
     'Some calls ran 90 minutes — I love to talk but it is not scalable.',
     'Use a timer and a clear agenda to keep discovery calls to 60 minutes maximum.'),
    (may_cycle,u4,3,'partial',
     'Opened enrollment and sold 4 spots in the first 48 hours from DMs alone. But only reached 20 of the 30 on my list.',
     '30 personalised DMs took half a day — scaling warmth is hard.',
     'Create 3–4 message templates that still feel personal. Done is better than perfect.'),
    (may_cycle,u4,4,'yes',
     'Hit 6 participants! One came from an unexpected referral. First session was electric — the group chemistry is magic.',
     'One prospect went silent at the finish line and I lost a sale I thought was closed.',
     'Add urgency and a clear deadline earlier in every sales conversation.'),

    -- Aisha Williams: yes / no / yes / partial
    (may_cycle,u5,1,'yes',
     'Rate-increase letters sent to all 4 clients. 3 accepted immediately. 1 asked for a call — which went well.',
     'Honestly, my hands were shaking hitting send. Pricing anxiety is real.',
     'Remind myself: clients who respect my work will respect my rates.'),
    (may_cycle,u5,2,'no',
     'Did not get the packages page live. Rewrote the headline 12 times and published nothing. Classic perfection paralysis.',
     'Perfectionism. I got stuck trying to make it flawless.',
     'Ship the good-enough version. I can always iterate — shipping nothing helps no one.'),
    (may_cycle,u5,3,'yes',
     'Attended both networking events and made 7 genuine connections. Already have 2 discovery call requests booked.',
     'I am naturally introverted — networking drains me even when it goes well.',
     'Arrive with 3 prepared conversation starters so I do not freeze at the opening.'),
    (may_cycle,u5,4,'partial',
     'Signed 1 new client at the new rate. Second prospect is very warm but needs another week for budget approval.',
     'The second deal is outside my control right now — external approval processes.',
     'Not a failure. Pipeline is healthy and the momentum is absolutely building.'),

    -- Emma Rodriguez: partial / partial / yes / no
    (may_cycle,u6,1,'partial',
     'Designed the packages but did not get the page published. Sent the deck to 8 people (not 15).',
     'Spent too long designing and not enough time shipping — creative procrastination.',
     'Set a "done is better than perfect" rule for every future launch task.'),
    (may_cycle,u6,2,'partial',
     'Sent to 11 leads instead of 15, got 2 interested replies. Progress, but behind target.',
     'Energy was low — some personal things happening outside of work.',
     'Build in a recovery day after high-output weeks. Burnout kills momentum faster than anything.'),
    (may_cycle,u6,3,'yes',
     '2 discovery calls, both went beautifully. Sent 2 proposals and one was accepted the same day. Such a high!',
     'The proposal template took 3 hours to finalise the first time.',
     'Invest a Sunday afternoon in a polished proposal template — saves hours every time.'),
    (may_cycle,u6,4,'no',
     'Contract fell through at signing — client decided to bring social in-house. Genuinely devastating.',
     'Losing a deal I thought was closed knocked my confidence hard.',
     'Reconnect with 2 more prospects immediately. Never rely on a single deal to close.'),

    -- Layla Hassan: partial / yes / yes / partial
    (may_cycle,u7,1,'partial',
     'Recorded 3 modules but editing took 3x longer than filming. Only 3 of the 5 planned modules uploaded.',
     'Severely underestimated editing time.',
     'Budget for a video editor for future courses. Editing is not my highest-value use of time.'),
    (may_cycle,u7,2,'yes',
     'Sales page is live and looks incredible. Test payment went through. Early access link is ready to share.',
     'Writing copy for my own product was surprisingly harder than for clients.',
     'Ask a trusted peer to review my own sales copy before publishing next time.'),
    (may_cycle,u7,3,'yes',
     'All 3 beta testers completed the course and gave detailed, actionable feedback. Made 6 improvements before launch.',
     'One tester dropped off at module 4 — I needed to chase them.',
     'Add automated check-in emails at day 3 and day 7 to reduce dropout.'),
    (may_cycle,u7,4,'partial',
     'Launched! 22 students enrolled and $880 in revenue. Short of 30 students but incredible for a first launch.',
     'Launch fatigue hit hard — 5 days of showing up felt unsustainable.',
     'Batch all launch content the week BEFORE the launch. Never create during launch week again.'),

    -- Zoe Andersen: partial / partial / no / partial
    (may_cycle,u8,1,'partial',
     'Interviewed 1 client (not 2). The second rescheduled twice — interview is still pending.',
     'Client availability is completely outside my control.',
     'Set a firm "reschedule by Friday or I move on" boundary for future interview bookings.'),
    (may_cycle,u8,2,'partial',
     'First case study written and approved. Second interview finally happened but the draft is not finished.',
     'Scope creep on a current client project stole 2 full days of writing time.',
     'Protect case study writing blocks the same way I protect client deadlines.'),
    (may_cycle,u8,3,'no',
     'Website still not updated. Got deep into a client project and ran out of time entirely.',
     'Prioritising client delivery over my own business development — same old pattern.',
     'Block Wednesday mornings as protected biz-dev time. Non-negotiable. No exceptions.'),
    (may_cycle,u8,4,'partial',
     'Sent 3 pitches (not 5). Two were strong and tailored; one felt rushed. Waiting to hear back on all three.',
     'Fear of rejection slows me down when pitching at higher rates.',
     'Reframe rejection: every no is data about fit, not a verdict on my worth.')
  ON CONFLICT DO NOTHING;

END $$;
