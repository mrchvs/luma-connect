-- Create mentor_profiles table
CREATE TABLE public.mentor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    headline TEXT NOT NULL DEFAULT '',
    expertise_areas TEXT[] NOT NULL DEFAULT '{}',
    who_this_is_for TEXT,
    availability TEXT NOT NULL DEFAULT 'by_request',
    is_complete BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentor_services table
CREATE TABLE public.mentor_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES public.mentor_profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentor_bookings table
CREATE TABLE public.mentor_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id UUID REFERENCES public.mentor_profiles(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES public.mentor_services(id) ON DELETE SET NULL,
    client_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    service_name TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    intro_request_id UUID REFERENCES public.intro_requests(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_bookings ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is a mentor
CREATE OR REPLACE FUNCTION public.is_mentor(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'mentor'
  )
$$;

-- RLS Policies for mentor_profiles
CREATE POLICY "Approved users can view complete mentor profiles"
ON public.mentor_profiles
FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND is_approved_user(auth.uid()) 
    AND is_complete = true 
    AND is_active = true
);

CREATE POLICY "Mentors can view own mentor profile"
ON public.mentor_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Mentors can create own mentor profile"
ON public.mentor_profiles
FOR INSERT
WITH CHECK (
    auth.uid() = user_id 
    AND is_mentor(auth.uid())
);

CREATE POLICY "Mentors can update own mentor profile"
ON public.mentor_profiles
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all mentor profiles"
ON public.mentor_profiles
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update mentor profiles"
ON public.mentor_profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for mentor_services
CREATE POLICY "Approved users can view active mentor services"
ON public.mentor_services
FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND is_approved_user(auth.uid())
    AND is_active = true
    AND EXISTS (
        SELECT 1 FROM public.mentor_profiles mp
        WHERE mp.id = mentor_services.mentor_id
        AND mp.is_complete = true
        AND mp.is_active = true
    )
);

CREATE POLICY "Mentors can view own services"
ON public.mentor_services
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.mentor_profiles mp
        WHERE mp.id = mentor_services.mentor_id
        AND mp.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can create own services"
ON public.mentor_services
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.mentor_profiles mp
        WHERE mp.id = mentor_services.mentor_id
        AND mp.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can update own services"
ON public.mentor_services
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.mentor_profiles mp
        WHERE mp.id = mentor_services.mentor_id
        AND mp.user_id = auth.uid()
    )
);

CREATE POLICY "Mentors can delete own services"
ON public.mentor_services
FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.mentor_profiles mp
        WHERE mp.id = mentor_services.mentor_id
        AND mp.user_id = auth.uid()
    )
);

-- RLS Policies for mentor_bookings
CREATE POLICY "Users can view own bookings as client"
ON public.mentor_bookings
FOR SELECT
USING (auth.uid() = client_user_id);

CREATE POLICY "Mentors can view their bookings"
ON public.mentor_bookings
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.mentor_profiles mp
        WHERE mp.id = mentor_bookings.mentor_id
        AND mp.user_id = auth.uid()
    )
);

CREATE POLICY "Approved users can create bookings"
ON public.mentor_bookings
FOR INSERT
WITH CHECK (
    auth.uid() = client_user_id
    AND is_approved_user(auth.uid())
);

CREATE POLICY "Clients can update own bookings"
ON public.mentor_bookings
FOR UPDATE
USING (auth.uid() = client_user_id);

CREATE POLICY "Mentors can update their bookings"
ON public.mentor_bookings
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.mentor_profiles mp
        WHERE mp.id = mentor_bookings.mentor_id
        AND mp.user_id = auth.uid()
    )
);

CREATE POLICY "Admins can view all bookings"
ON public.mentor_bookings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_mentor_profiles_updated_at
BEFORE UPDATE ON public.mentor_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentor_services_updated_at
BEFORE UPDATE ON public.mentor_services
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentor_bookings_updated_at
BEFORE UPDATE ON public.mentor_bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();