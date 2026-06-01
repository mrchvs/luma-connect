"""
Import May 2026 Monday Momentum cohort data from the Excel spreadsheet into Supabase.
Run with: python3 import_momentum.py <SERVICE_ROLE_KEY>
"""
import sys
import requests

SERVICE_ROLE_KEY = sys.argv[1] if len(sys.argv) > 1 else ""
SUPABASE_URL = "https://alyvcgfcolxbksrjjsie.supabase.co"

headers = {
    "apikey": SERVICE_ROLE_KEY,
    "Authorization": f"Bearer {SERVICE_ROLE_KEY}",
    "Content-Type": "application/json",
}

def get(path, params=""):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}?{params}", headers=headers)
    return r.json()

def upsert(table, data):
    conflict_map = {
        "accountability_monthly_goals": "cycle_id,user_id",
        "accountability_weekly_entries": "cycle_id,user_id,week_number",
        "accountability_weekly_reflections": "cycle_id,user_id,week_number",
    }
    on_conflict = conflict_map[table]
    r = requests.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers={**headers, "Prefer": f"resolution=merge-duplicates,return=minimal"},
        params={"on_conflict": on_conflict},
        json=[data],
    )
    if not r.ok:
        print(f"  ERROR {table}: {r.status_code} {r.text[:300]}")

# ── 1. Look up user IDs by first name ────────────────────────────────────────
print("Fetching profiles...")
profiles = get("profiles", "select=user_id,full_name")
print(f"  Found {len(profiles)} profiles: {[p['full_name'] for p in profiles]}")

def find_user(first_name):
    fn = first_name.strip().lower()
    for p in profiles:
        if p.get("full_name", "").strip().lower().startswith(fn):
            return p["user_id"]
    return None

# ── 2. Find May 2026 cycle ────────────────────────────────────────────────────
print("\nFinding May 2026 cycle...")
cycles = get("accountability_cycles", "select=id,name,month,year&month=eq.5&year=eq.2026")
if not cycles:
    print("  Creating May 2026 cycle...")
    r = requests.post(f"{SUPABASE_URL}/rest/v1/accountability_cycles",
        headers={**headers, "Prefer": "return=representation"},
        json={"name": "May 2026", "month": 5, "year": 2026})
    cycle_id = r.json()[0]["id"]
else:
    cycle_id = cycles[0]["id"]
print(f"  Cycle ID: {cycle_id}")

# ── 3. Monthly goals ──────────────────────────────────────────────────────────
monthly_goals = {
    "Gina":    ("Reach out to identified companies in Lisbon and conduct 3-5 exploratory calls to identify concrete entry points for collaboration.",
                "10-12 personalized outreach messages sent, 3-5 exploratory calls completed, at least 1 concrete next step (e.g. follow-up, workshop interest or proposal discussion)."),
    "Alyssa":  ("Successful brand launch and first event (May 10).\nGo from instagram & landing page to full product ordering system",
                "Recipes tested and approved (by us and partner nutritionists)\nProducts and packages defined\nFirst round of orders completed"),
    "Marta":   ("Run a yoga retreat and launch two more retreats for later this year",
                "Yoga retreat delivered next week (May 7-10th), a landing page for my next 2 retreats built and shared within my community (WhatsApp group, Insta and mailing list)"),
    "Janet":   ("Validate my offering, the right size of a target business I can contribute best, and start a pilot project", None),
    "Daniela": ("Launch my client acquisition strategy and get my first paying clients through consistent content and direct outreach.",
                "2 clients enrolled in a 1:1 accompaniment package and at least 8 integrative medical consultations booked."),
    "Susanne": ("Optimize my website for conversion and grow my digital/social community (brand vs sales)",
                "Sell 40 blankets by the end of the month, grow Instagram to 300+ followers and get 40 event attendees for my first event in Berlin"),
}

print("\nInserting monthly goals...")
for name, (goal, metric) in monthly_goals.items():
    uid = find_user(name)
    if not uid:
        print(f"  SKIP {name}: user not found in profiles")
        continue
    row = {"cycle_id": cycle_id, "user_id": uid, "monthly_goal": goal}
    if metric:
        row["success_metric"] = metric
    upsert("accountability_monthly_goals", row)
    print(f"  ✓ {name}")

# ── 4. Weekly entries & reflections ──────────────────────────────────────────
weeks_data = {
    1: {
        "Siria": {
            "specific_goal": "Attract 5 users to my platform so they can give me valuable feedback.",
            "relevance": "It will help validate my website concept and identify gaps or issues.",
            "achievable": "issues to finding right people and getting them participate",
            "measurable": "messure the five ones",
            "achieved": "partial",
            "reflection": "I lunch the platform in LinkedIn, and share it in the communities chat, and instagram account, did not attract new user",
            "blocker": "Maybe the posts are not too attractive",
            "adjustments": "Make them more attractive and find other channels to share",
        },
        "Gina": {
            "specific_goal": "Identify 3 contact persons from my list of potential clients, write and send 3 individualized mails to introduze myself & ask for exploratory call",
            "relevance": "Understand demand & challenges, first contact with potential clients.",
            "achievable": "Potential blocker: feeling exhausting from my other job. resitance & fear of visibility. Ressources available.",
            "measurable": "E-Mails sent.",
            "achieved": "partial",
            "reflection": "Sent one individualized email to a warm potential client contact, arranged two exchange calls with Portuguese trainers, and scheduled a meeting with a new Portuguese HR contact via LinkedIn.",
            "blocker": "Most potential client contacts were cold leads, and I felt uncertain about how to frame the value of exploratory calls. I realized I currently rely more on warm introductions and local network-building.",
            "adjustments": "Focus on expanding my Portuguese network, actively ask for introductions to potential clients, and begin testing low-pressure outreach to selected cold contacts.",
        },
        "Alyssa": {
            "specific_goal": "Push towards launch event and properly evaluating what is possible on the long list (testing/ finalizing recipes, creating product offers on website, cooking, website design and integration)",
            "relevance": "Super relevent event for the business. For building community but also actual leads.",
            "achievable": "The biggest thing holding me back is my own perfectionism. It makes me hesitate and over-refine instead of taking action, but I'm working on shifting that, choosing progress and consistency over perfection.",
            "measurable": "Not feeling disappointed or completely drained following the event",
        },
        "Marta": {
            "specific_goal": "Delivering my sold out yoga retreat",
            "relevance": "making currents clients satisfied so that they can buy other retreats/ services in the future",
            "achievable": "time limitations (other tasks on the table)",
            "measurable": "delivering the retreat, getting feedback from participants, pitching my other two retreats later this year",
            "achieved": "yes",
            "reflection": "I hosted my retreat with 22 participants and pitched my other 2 retreats later this year (offering a bonus if they book another retreat this year)",
            "blocker": "the time frame was clearly defined so there was no delays or slowing down",
            "adjustments": "planning more time to rest",
        },
        "Janet": {
            "specific_goal": "Research 20-30 companies I'd like to target, and connect the first 5",
            "relevance": "Validating if it's releveant -> are there responses?",
            "achievable": "Fear of rejection and emotional capacity due to a personal situation.\nI'll do time blocking and just simply send the messages, move from perfect to done, start with the easiest to get momentum",
            "measurable": "I sent the messages - firsts are OK with simple message, then I'll move to videos",
            "achieved": "no",
            "reflection": "I missed the dedicated time window for this, and my goals felt far ahead from where I started.",
            "blocker": "Having my focus scattered among many tasks.",
            "adjustments": "Dedicate time for this work purposfully, and start with more achievable goals",
        },
        "Daniela": {
            "specific_goal": "Create my first video, whether for a reel or story, and post it on IG.",
            "relevance": "It would be the starting point for me to take the promotion of the business more seriously and have a greater reach to get clients.",
            "achievable": "Overcoming my own resistance to simply doing what needs to be done. And now having a device that allows me to work.",
            "measurable": "Posting my first video on IG",
            "achieved": "yes",
            "reflection": "I uploaded a video to a story talking and telling a personal example of my view of health.",
            "blocker": "I had a personal situation that disconnected me from everything. I'm in the middle of a personal grieving process.",
            "adjustments": "Perhaps better organization of how and when to do it. Planning.",
        },
        "Milagros": {
            "specific_goal": "I want to optimize my funnel and bring people from Instagram to my website.",
            "relevance": "Bring traffic to the website, and sales.",
            "achievable": "The biggest thing holding me back is my own perfectionism. It makes me hesitate and over-refine instead of taking action, but I'm working on shifting that, choosing progress and consistency over perfection.",
            "measurable": "Welcome series are running, and the KPIs (Growth, Engagement, Sales) show results",
        },
        "Susanne": {
            "specific_goal": "Update website (Home, Shop, Product) with new content and copy; get final programming items for Berlin event (olive oil) and send event reminder on Friday; finish cards for Second Chance Club fundraiser",
            "relevance": "It will help me improve the clarity of my offering, increase my visibility and improve online sales; Berlin event will help establish my brand in the right circles and starts building a community",
            "achievable": "I tend to overengineer and write too much copy. Think more of icons and snackable infos than rolling out your brand story and vision; For the event I need to move away from the perfect set design etc and just simplify things",
            "measurable": "Page is updated by Weds for Home, Shop, Product; Olive oil is in my suitcase, Event reminder is sent",
            "achieved": "yes",
            "reflection": "Well, I didn't do the website myself but got someone to help me. I always want to keep control of everything but letting go has helped and I managed to fine-tune everything today and am super pleased with the result. We also managed to update the local language versions (pt, de).",
            "blocker": "I should have asked for help earlier or put more emphasis on higher sales-yielding activities than the event.",
            "adjustments": "nothing",
        },
    },
    2: {
        "Siria": {
            "specific_goal": "Find other channels to share the platform",
            "relevance": "Find more users",
            "achievable": "Find time to do it and make my reaserch",
            "achieved": "partial",
            "reflection": "I found an opportunity with my coach to start a campaign go attract more users",
            "blocker": "As a blocker, I got the idea on Friday, so I could only find time over the weekend to do my research and define the strategy for starting the campaign.",
            "adjustments": "Pick a day and start with the research",
        },
        "Gina": {
            "specific_goal": "Reach out to 3 Portuguese-based contacts for networking conversations and send 2 outreach messages to potential clients from my target list.",
            "relevance": "Get in touch with potential clients, build a network, ideally get introductions and referrals",
            "achievable": "replies may take time, could effect my motivation and will take time to see whats approaches work best",
            "measurable": "mails/requests sent, calls scheduled",
            "achieved": "no",
            "reflection": "/",
            "blocker": "I was sick most the entire week, while working my main job. needed the days off to fully recover.",
            "adjustments": "now back on track this week",
        },
        "Marta": {
            "specific_goal": "Retreat launch (Mon/ Tue), teaching yoga classes, giving 1:1 coaching sessions, packing for Portugal, driving from Berlin -> Portugal",
            "relevance": "getting first sign-ups for my future retreats, wanting to relocate to Portugal - packing + driving is necessary to make it happen",
            "achievable": "being at capacity, anything unexpected on top could be a blocker",
            "measurable": "retreat launch done, having packed, making it to Portugal",
            "achieved": "yes",
            "reflection": "retreat launch done, packed my stuff and made it to Portugal (driving from Berlin)",
            "blocker": "schedule very tight so no time for slowing down ;)",
            "adjustments": "giving myself more breathing time",
        },
        "Janet": {
            "specific_goal": "Dedicate time for this work, get clear about my intention and my capacity. Use this dedicated time to invite curiousity and contact one company a day. Experiment with content creation. What is that I want to share? Be authentic, and let myself be out there as I am.",
            "relevance": "Create the container to keep on going and remove the pressure of what needs to be achieved.",
            "achievable": "Things in my private life that took lot of time and energy before -> I'm shifting it and using time blockers for that. I prioritize and do my forward-bringing activities first in the day.",
            "measurable": "Companies contacted. I created a deck and a video I can share",
            "achieved": "yes",
            "reflection": "Learning: start with ai when you feel stuck, it'll work out better from there, and you'll find your voice and path.\n\nI created a business presentation and plan with the help of AI. It's great to get a structured start.\nI also created a dedicated time for this work, which is great and by Friday I established a routine to do it every day.\nI managed to put aside distractions, but not entirely, I am making peace with it that I possibly can't do it 100% for now.\nI did create content, 2x on LinkedIn.",
            "blocker": "Feeling at times exhausted from the emotional impact of a certain event. Creating a video after this felt overwhelming. I still have half an hour for this though to do. ;)",
            "adjustments": "Start with the video, and do it first thing when I'm on top of things. Let the rest, that can be done written for times when I might have less capacity.",
        },
        "Daniela": {
            "specific_goal": "Create content for my Instagram. Create content for this week and prepare for the following weeks. Start publishing my writing on Substack.",
            "relevance": "I need to showcase what I do and how my service can help people. That way, I'll get people interested in booking appointments.",
            "achievable": "The blocks would be the fear of exposure and of not doing it perfectly.",
            "measurable": "Upload 1-2 reel-style videos and continue uploading stories. And upload my first piece of writing to Substack.",
            "achieved": "no",
            "reflection": "It was difficult to concentrate and make time. I was very distracted during the week.",
            "blocker": "I've been dealing with all the emotions I'd been avoiding last week; I needed some downtime.",
            "adjustments": "This week I've already organized myself much better in order to achieve my goals.",
        },
        "Susanne": {
            "specific_goal": "Reach out to event attendees who haven't confirmed their attendance yet",
            "relevance": "Put my mind at ease and make sure I plan well for drinks and food for the event; my network is one of my assets and I want to make sure I am personally connected with everyone.",
            "achievable": "Traveling. Going to hamburg Monday and Tuesday and have other meetings which are not related to LAR, but to my freelance business",
            "measurable": "Have a better understanding by Thursday who will come and whether I need to do another push or ask people to push more, get 40 event attendees",
            "achieved": "yes",
            "reflection": "Was messy and busy and I was across all sorts of different comms platforms (luma, email, IG, Whatsapp) but managed to pull a full crowd",
            "blocker": "Too many comms channels, not focused strategy",
            "adjustments": "Get better at optimizing my comms",
        },
    },
    3: {
        "Siria": {
            "specific_goal": "Start my campaing to gift 5 free coach sessions and get 10 new users",
            "relevance": "To promote the platform in better attractive way to get this users",
            "achievable": "have the resources just to make a good research",
            "measurable": "to see if I get 10 new user",
        },
        "Gina": {
            "specific_goal": "Reach out to 3 Portuguese-based contacts for networking conversations and send 2 cold outreach messages to potential clients from my target list. Publish another LinkedIn post.",
            "relevance": "tell people about my offer, get in touch with potential clients",
            "achievable": "get overwhelmed with different to do's and reading content on LinkedIn from other creators",
            "measurable": "Mails sent, post published.",
            "achieved": "yes",
            "reflection": "Reached out to 5 contacts and sent 2 cold-call messages, published 3 LinkedIn posts & prepared content for next week, pitched for a podcast",
            "blocker": "nothing",
            "adjustments": "Find a good balance for upcoming weeks.",
        },
        "Alyssa": {
            "specific_goal": "Test and confirm at least 3 recipes for package.\nMake cuts on full offerings to what is realistic for Juliana and I.",
            "relevance": "We are beginning to feel our limits physically and need to only commit to what we can deliver (to clients and each other).\nDefining the priorities and concretely having recipes checked off the list will be relief while also giving us a realistic idea of what we should do.",
            "achievable": "Time (as per usual).\nWe both have other work, big personal events this week and never know how we're going to feel physically each day.",
            "measurable": "We have a freezer full of tests that we can taste with critics for next week.\nWe have a revised menu we're both satisfied with and a concrete plan/schedule for how to execute in the coming month.",
        },
        "Marta": {
            "specific_goal": "making it to Ericeira and taking time to land",
            "relevance": "setting a stable foundation for my new start in life and business after transitioning to Portugal",
            "achieved": "yes",
        },
        "Janet": {
            "specific_goal": "1. Continue 2x posting on LinkedIn (set for 21 posts to establish the routine). Keep on LinkedIn until I figure where my audience is (I can repurpose later). Focus on business-themed post, build better boundaries about what I share personally\n2. Cementing the idea that I'm building a location-independent, international business, stay part of the Monday Momentum.\n3. Connecting with and following target companies on social, collect 10 problems they talk about on their platforms/based on research.",
            "relevance": "1. Consistency, defining my value-add, visibility\n2. Autonomy, flexibility and continuous workstreams\n3. Understand the audience first to adapt the value prop",
            "achievable": "Too many things at stake/moving parallel with business --> I simplify other areas of my life",
            "measurable": "List 10 problems of my target audience --> maintain my document\nContinue having the time window for my business each day\n2 LinkedIn posts\nGet the foundations set from end of May/June throughout the summer",
            "achieved": "yes",
            "reflection": "1. Li - done 1x. I need to figure what to post about when I don't feel like sharing much. I was respective of my plans around boundaries, so it's cool. I really did well with communicating about my capacity and boundaries overall when communicating about work and projects. Yay!\n2. I need more reminders :)\n3. I did less, but I notice that I comment organically when I follow ppl and businesses I feel passionate about and interested in",
            "blocker": "Underestimated my need for rest and logistics",
            "adjustments": "Become more consistent despite the circumstances\nCreate the bandwidth to be able to have the time to rest, recalibrate and build sustainably\nPlan an actual holiday",
        },
        "Daniela": {
            "specific_goal": "Create content for my Instagram. Create content for this week and prepare for the following weeks. Start publishing my writing on Substack.",
            "relevance": "I need to showcase what I do and how my service can help people. That way, I'll get people interested in booking appointments.",
            "achievable": "The blocks would be the fear of exposure and of not doing it perfectly.",
            "measurable": "Upload 1-2 reel-style videos and continue uploading stories. And upload my first piece of writing to Substack.",
            "achieved": "partial",
            "reflection": "I only uploaded a few stories, I didn't make the videos. And I focused on Substack.",
            "blocker": "I had a few days off, and I realized how exhausted I was. So I consciously decided to treat them like a holiday (I haven't had a holiday in two years).",
            "adjustments": "I needed to recharge my batteries so I could work with greater focus and organization.",
        },
        "Susanne": {
            "specific_goal": "Follow up with event attendees and push discount to drive sales, go to shelter for stories",
            "relevance": "Drive engagement and sales",
            "achievable": "Traveling again and feeling a little bit exhausted/with cold",
            "measurable": "Sent emails and went to shelter",
            "achieved": "partial",
            "reflection": "Sent email and went to the shelter, but the discount code I sent didn't generate any new sales and I had some Klaviyo tech issues",
            "blocker": "Traveling and content creation and editing",
            "adjustments": "I need to learn CRM tools and Klaviyo better to finetune communication moving forwards",
        },
    },
    4: {
        "Siria": {
            "specific_goal": "Finish the campaing and see if I get 5 user",
            "relevance": "I am promoting the platform, the idea is to get more users",
            "achievable": "check with an expert of campaing why is not working",
            "measurable": "when I finish the campaing, at the moment to see if I got more users",
        },
        "Gina": {
            "specific_goal": "Publish 1-2 LinkedIn posts, do follow-ups with Portuguese contacts, do some research and follow-up on potential co-creation opportunities",
            "relevance": "get better understanding of market & opportunities (e.g. focus in PT or Germany), build network",
            "achievable": "good weather, being dependant on people's availabilities",
            "measurable": "posts published, conversations I had",
        },
        "Marta": {
            "specific_goal": "defining pricing and program for the upcoming Azores retreat in September, sending it out to warm leads plus cold reach out to other potential clients",
            "relevance": "required to sign up participants",
            "achievable": "potential blockers - availability of the venue owner, availability of the person helping me with my website, other resources are there",
            "measurable": "PDF file created with all retreat details, retreat landing page live",
        },
        "Janet": {
            "specific_goal": "1. Do at least one thing a day around my business, create a list of topics to pick from, make it simple.\n2. Start planning the fall season of coaching, plan the offer + marketing + timing\n3. Plan a holiday",
            "relevance": "I'm gonna progress and not stall",
            "achievable": "Block work times\nLimit meetings\nMake logistics as simple as possible",
            "measurable": "One business task is completed each day",
        },
        "Daniela": {
            "specific_goal": "Create content for Instagram and Substack. Organize the content. Launch my project on all platforms.",
            "relevance": "It would help me find people interested in working with me.",
            "achievable": "Numbness.",
            "measurable": "When I do it.",
        },
        "Susanne": {
            "specific_goal": "Develop a campaign plan to drive sales, including timing, key channels and assets needed (including competitive and channel research)",
            "relevance": "Drive sales - essential",
            "achievable": "A lot of different tasks and limited knowledge on Meta and Google Ads",
            "measurable": "I have a concrete plan by the end of the week and know what I need to do for the campaign to go live by mid-June while making sure that I keep a healthy balance",
        },
    },
}

print("\nInserting weekly entries and reflections...")
entry_fields = ["specific_goal", "relevance", "achievable", "measurable"]

for week_num, members in weeks_data.items():
    print(f"\n  Week {week_num}:")
    for name, data in members.items():
        uid = find_user(name)
        if not uid:
            print(f"    SKIP {name}: not found")
            continue

        entry_row = {"cycle_id": cycle_id, "user_id": uid, "week_number": week_num}
        for f in entry_fields:
            if data.get(f):
                entry_row[f] = data[f]
        upsert("accountability_weekly_entries", entry_row)

        if data.get("achieved"):
            reflect_row = {"cycle_id": cycle_id, "user_id": uid, "week_number": week_num,
                           "achieved": data["achieved"]}
            for f in ["reflection", "blocker", "adjustments"]:
                if data.get(f):
                    reflect_row[f] = data[f]
            upsert("accountability_weekly_reflections", reflect_row)

        print(f"    ✓ {name} wk{week_num}")

print("\n✅ Import complete!")
