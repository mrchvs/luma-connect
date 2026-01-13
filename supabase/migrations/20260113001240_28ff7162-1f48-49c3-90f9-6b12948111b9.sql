-- Create enums for course fields
CREATE TYPE public.course_format AS ENUM ('live', 'hybrid', 'on_demand');
CREATE TYPE public.course_access_type AS ENUM ('free', 'paid', 'subscription');
CREATE TYPE public.course_status AS ENUM ('draft', 'published');
CREATE TYPE public.course_content_type AS ENUM ('video', 'text', 'file');

-- Create courses table
CREATE TABLE public.courses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text NOT NULL,
    short_description text,
    mentor_name text,
    format course_format NOT NULL DEFAULT 'on_demand',
    price_cents integer NOT NULL DEFAULT 0,
    access_type course_access_type NOT NULL DEFAULT 'free',
    status course_status NOT NULL DEFAULT 'draft',
    cover_image_url text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create course content table
CREATE TABLE public.course_content (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    content_type course_content_type NOT NULL,
    title text NOT NULL,
    content text, -- video URL, text content, or file URL
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create course access table (for manual access grants)
CREATE TABLE public.course_access (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    granted_by uuid NOT NULL,
    granted_at timestamp with time zone NOT NULL DEFAULT now(),
    revoked_at timestamp with time zone,
    UNIQUE(user_id, course_id)
);

-- Enable RLS on all tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_access ENABLE ROW LEVEL SECURITY;

-- RLS Policies for courses table
-- Admins can do everything
CREATE POLICY "Admins can manage all courses"
ON public.courses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view published free courses
CREATE POLICY "Users can view published free courses"
ON public.courses FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND status = 'published' 
    AND access_type = 'free'
);

-- Users can view published courses they have access to
CREATE POLICY "Users can view courses they have access to"
ON public.courses FOR SELECT
USING (
    auth.uid() IS NOT NULL 
    AND status = 'published'
    AND EXISTS (
        SELECT 1 FROM public.course_access ca
        WHERE ca.course_id = courses.id
        AND ca.user_id = auth.uid()
        AND ca.revoked_at IS NULL
    )
);

-- RLS Policies for course_content table
-- Admins can do everything
CREATE POLICY "Admins can manage all course content"
ON public.course_content FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view content for courses they have access to
CREATE POLICY "Users can view content for accessible courses"
ON public.course_content FOR SELECT
USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
        SELECT 1 FROM public.courses c
        WHERE c.id = course_content.course_id
        AND c.status = 'published'
        AND (
            c.access_type = 'free'
            OR has_role(auth.uid(), 'admin'::app_role)
            OR EXISTS (
                SELECT 1 FROM public.course_access ca
                WHERE ca.course_id = c.id
                AND ca.user_id = auth.uid()
                AND ca.revoked_at IS NULL
            )
        )
    )
);

-- RLS Policies for course_access table
-- Admins can manage all access grants
CREATE POLICY "Admins can manage course access"
ON public.course_access FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own access grants
CREATE POLICY "Users can view own course access"
ON public.course_access FOR SELECT
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_course_content_course_id ON public.course_content(course_id);
CREATE INDEX idx_course_content_display_order ON public.course_content(course_id, display_order);
CREATE INDEX idx_course_access_user_id ON public.course_access(user_id);
CREATE INDEX idx_course_access_course_id ON public.course_access(course_id);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_courses_access_type ON public.courses(access_type);

-- Create trigger for updated_at on courses
CREATE TRIGGER update_courses_updated_at
BEFORE UPDATE ON public.courses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on course_content
CREATE TRIGGER update_course_content_updated_at
BEFORE UPDATE ON public.course_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();