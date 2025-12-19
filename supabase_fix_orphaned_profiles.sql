-- Fix Orphaned Profiles
-- Creates a profile for every auth.user that doesn't have one
-- Sets the first user found as 'admin', others as 'member'

DO $$
DECLARE
    r RECORD;
    admin_exists BOOLEAN;
BEGIN
    -- Check if any admin exists
    SELECT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'admin') INTO admin_exists;

    FOR r IN SELECT * FROM auth.users LOOP
        INSERT INTO public.profiles (id, email, full_name, role, status, created_at, updated_at)
        VALUES (
            r.id,
            r.email,
            COALESCE(r.raw_user_meta_data->>'full_name', 'Usuário Recuperado'),
            CASE 
                WHEN admin_exists = FALSE THEN 'admin' 
                ELSE COALESCE(r.raw_user_meta_data->>'role', 'member') 
            END,
            'active',
            r.created_at,
            NOW()
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- If we just created an admin, update flag so next ones are members
        IF admin_exists = FALSE THEN
            admin_exists := TRUE;
        END IF;
    END LOOP;
END $$;
