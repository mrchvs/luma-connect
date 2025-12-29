-- Create profile status enum
CREATE TYPE public.profile_status AS ENUM ('pending_review', 'approved', 'rejected', 'suspended');

-- Create intro request status enum
CREATE TYPE public.intro_request_status AS ENUM ('pending', 'accepted', 'declined');

-- Create intro format enum
CREATE TYPE public.intro_format AS ENUM ('async', 'short_call', 'long_call');

-- Create user roles enum for admin
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  city TEXT,
  country TEXT,
  timezone TEXT,
  languages TEXT[] DEFAULT '{}',
  short_bio TEXT,
  bio_long TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  portfolio_url TEXT,
  instagram_url TEXT,
  company_name TEXT,
  job_title TEXT,
  years_experience INTEGER,
  proof_links TEXT[] DEFAULT '{}',
  credibility_confirmed BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  status public.profile_status DEFAULT 'pending_review',
  admin_notes TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tags table
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profile_needs junction table
CREATE TABLE public.profile_needs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tag_id)
);

-- Create profile_offers junction table
CREATE TABLE public.profile_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tag_id)
);

-- Create intro_requests table
CREATE TABLE public.intro_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  helper_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  expected_outcome TEXT,
  format public.intro_format DEFAULT 'async',
  status public.intro_request_status DEFAULT 'pending',
  matching_tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create match_notifications table (to prevent duplicate notifications)
CREATE TABLE public.match_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notified_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  helper_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(notified_user_id, helper_user_id)
);

-- Create user_roles table for admin management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Insert default tags
INSERT INTO public.tags (label, category) VALUES
('Fundraising', 'business'),
('Hiring', 'business'),
('Marketing Strategy', 'marketing'),
('Product Development', 'product'),
('Sales & BD', 'business'),
('Tech & Engineering', 'tech'),
('Design & Branding', 'creative'),
('Legal & Compliance', 'operations'),
('Operations', 'operations'),
('Finance & Accounting', 'finance'),
('Mentorship', 'personal'),
('Career Transition', 'personal'),
('Leadership Development', 'personal'),
('Work-Life Balance', 'personal'),
('Networking', 'personal'),
('Public Speaking', 'skills'),
('Writing & Content', 'creative'),
('Data & Analytics', 'tech'),
('AI & Machine Learning', 'tech'),
('Community Building', 'marketing');

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_needs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intro_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create has_role function for admin checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Approved users can view other approved profiles" ON public.profiles
  FOR SELECT USING (
    status = 'approved' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Tags policies (public read)
CREATE POLICY "Anyone can view tags" ON public.tags
  FOR SELECT USING (true);

-- Profile needs policies
CREATE POLICY "Users can manage own needs" ON public.profile_needs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Approved users can view others needs" ON public.profile_needs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'approved')
  );

-- Profile offers policies
CREATE POLICY "Users can manage own offers" ON public.profile_offers
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Approved users can view others offers" ON public.profile_offers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'approved')
  );

-- Intro requests policies
CREATE POLICY "Users can view own requests" ON public.intro_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = helper_id);

CREATE POLICY "Approved users can create requests" ON public.intro_requests
  FOR INSERT WITH CHECK (
    auth.uid() = requester_id AND
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'approved')
  );

CREATE POLICY "Helpers can update request status" ON public.intro_requests
  FOR UPDATE USING (auth.uid() = helper_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- Match notifications policies
CREATE POLICY "System can manage match notifications" ON public.match_notifications
  FOR ALL USING (true);

-- User roles policies
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_intro_requests_updated_at
  BEFORE UPDATE ON public.intro_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create compute_matches function
CREATE OR REPLACE FUNCTION public.compute_matches(p_user_id UUID)
RETURNS TABLE (
  matched_user_id UUID,
  score INTEGER,
  overlapping_tags TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_needs AS (
    SELECT t.label
    FROM profile_needs pn
    JOIN tags t ON t.id = pn.tag_id
    WHERE pn.user_id = p_user_id
  ),
  user_profile AS (
    SELECT timezone, languages
    FROM profiles
    WHERE user_id = p_user_id
  ),
  potential_matches AS (
    SELECT 
      p.user_id AS match_id,
      p.timezone AS match_timezone,
      p.languages AS match_languages,
      ARRAY_AGG(t.label) FILTER (WHERE t.label IN (SELECT label FROM user_needs)) AS matching_tags
    FROM profiles p
    JOIN profile_offers po ON po.user_id = p.user_id
    JOIN tags t ON t.id = po.tag_id
    WHERE p.user_id != p_user_id
      AND p.status = 'approved'
      AND p.completed = true
    GROUP BY p.user_id, p.timezone, p.languages
    HAVING ARRAY_LENGTH(ARRAY_AGG(t.label) FILTER (WHERE t.label IN (SELECT label FROM user_needs)), 1) > 0
  )
  SELECT 
    pm.match_id,
    (COALESCE(ARRAY_LENGTH(pm.matching_tags, 1), 0) +
     CASE WHEN pm.match_languages && (SELECT languages FROM user_profile) THEN 1 ELSE 0 END)::INTEGER AS match_score,
    pm.matching_tags
  FROM potential_matches pm
  ORDER BY match_score DESC
  LIMIT 10;
END;
$$;