-- Add YouTube support to resources and seed the three Luma Circle workshop videos.
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS youtube_id TEXT;

INSERT INTO public.resources (title, description, category, duration, youtube_id, is_featured, sort_order) VALUES
  ('Navigating Sales Conversations', 'Lead sales conversations with confidence — qualifying, handling objections, and closing without the pressure.', 'Workshops', '20 min', 'YCsiUY1jITs', true, 3),
  ('Pricing, Value & Receiving', 'Set prices that reflect your value, and the mindset shift to actually receive what you''re worth.', 'Workshops', '44 min', '1Tnw3J-_VGI', true, 4),
  ('Intentional Beginnings Workshop', 'Start your month — and your business — with intention: clarity, focus, and momentum from day one.', 'Workshops', '22 min', 'bFd8UT91vIQ', true, 5);
