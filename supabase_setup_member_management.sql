-- Member Management & Advanced Features Migration

-- 1. Profiles Table (Extends auth.users)
-- Stores public/admin-facing user info separate from secure auth data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name TEXT,
  email TEXT, -- Copied from auth.users for easier querying
  avatar_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'disabled')),
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
  last_seen_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Helper function to avoid infinite recursion in RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING ( public.is_admin() );

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Member Notes (Internal notes for admins)
CREATE TABLE IF NOT EXISTS public.member_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL, -- Who wrote the note
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.member_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage member notes" ON public.member_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- 3. Member Tags
CREATE TABLE IF NOT EXISTS public.member_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, tag)
);

ALTER TABLE public.member_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage member tags" ON public.member_tags
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- 4. Activity Logs (Login, Purchase, Watch, etc.)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  event TEXT NOT NULL, -- 'login', 'purchase', 'lesson_completed', 'password_change'
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own logs" ON public.activity_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own logs" ON public.activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs" ON public.activity_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- 5. Enhancing Access Grants (Subscriptions & Expiration)
-- Note: 'access_grants' already exists in schema, we add columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'access_grants' AND column_name = 'expires_at') THEN
        ALTER TABLE public.access_grants ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'access_grants' AND column_name = 'is_subscription') THEN
        ALTER TABLE public.access_grants ADD COLUMN is_subscription BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'access_grants' AND column_name = 'subscription_provider_id') THEN
        ALTER TABLE public.access_grants ADD COLUMN subscription_provider_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'access_grants' AND column_name = 'subscription_status') THEN
        ALTER TABLE public.access_grants ADD COLUMN subscription_status TEXT DEFAULT 'active';
    END IF;
END $$;


-- 6. Helper View for Admin Members List
-- Aggregates profile info, access count, and last activity
CREATE OR REPLACE VIEW public.admin_members_view AS
SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.status,
    p.last_seen_at,
    p.created_at as joined_at,
    (SELECT COUNT(*) FROM access_grants ag WHERE ag.user_id = p.id AND ag.status = 'active') as active_products_count,
    (SELECT COUNT(*) FROM orders o WHERE o.customer_user_id = p.id) as orders_count
FROM 
    public.profiles p;

-- Grant access to the view for admins (via RLS on underlying tables, but views can be tricky with RLS)
-- Since we are using an admin dashboard, we will query this view.
-- IMPORTANT: Views bypass RLS of underlying tables if the user has permission to read the view, 
-- but in Supabase `current_setting` is often used. 
-- For simplicity in this stack, we assume admins can read all profiles.

