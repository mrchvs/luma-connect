-- Make user an admin (user_id: af131052-03ac-4de0-8402-7fb93f96f5bf)
INSERT INTO public.user_roles (user_id, role)
VALUES ('af131052-03ac-4de0-8402-7fb93f96f5bf', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;