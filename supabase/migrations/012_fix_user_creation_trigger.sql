-- =====================================================
-- FIX USER CREATION TRIGGER
-- =====================================================
-- This migration ensures the trigger that automatically creates
-- a user profile when a new auth user signs up is properly configured.

-- =====================================================
-- STEP 1: CLEAN UP EXISTING TRIGGER AND FUNCTION
-- =====================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- =====================================================
-- STEP 2: CREATE THE TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _full_name TEXT;
BEGIN
  -- Extract full_name from metadata or use email
  _full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(NEW.email, '@', 1)
  );

  -- Insert the user profile
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, _full_name, 'regular_user')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail auth signup
    RAISE LOG 'handle_new_user() failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 3: SET PROPER OWNERSHIP AND PERMISSIONS
-- =====================================================
-- The function must be owned by postgres and granted to auth admin
ALTER FUNCTION public.handle_new_user() OWNER TO postgres;

-- Grant to all roles that might need it
DO $$
BEGIN
  GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
  GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
  -- Try granting to supabase_auth_admin if it exists
  BEGIN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin';
  EXCEPTION WHEN undefined_object THEN
    RAISE NOTICE 'supabase_auth_admin role does not exist, skipping grant';
  END;
END;
$$;

-- =====================================================
-- STEP 4: CREATE THE TRIGGER
-- =====================================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 5: FIX RLS POLICIES FOR USERS TABLE
-- =====================================================
-- Remove overly permissive policy if exists
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;

-- Super admins can insert users directly
DROP POLICY IF EXISTS "Super admins can insert users" ON public.users;
CREATE POLICY "Super admins can insert users"
  ON public.users FOR INSERT
  WITH CHECK (public.is_super_admin());

-- Users can insert their own profile (fallback)
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- STEP 6: BACKFILL MISSING USER PROFILES
-- =====================================================
-- Create profiles for any auth users that don't have one yet
INSERT INTO public.users (id, email, full_name, role)
SELECT
  au.id,
  au.email,
  COALESCE(
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'name',
    split_part(au.email, '@', 1)
  ),
  'regular_user'
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERY (run separately to check)
-- =====================================================
-- SELECT
--   au.id as auth_id,
--   au.email as auth_email,
--   pu.id as profile_id,
--   pu.email as profile_email
-- FROM auth.users au
-- LEFT JOIN public.users pu ON au.id = pu.id;
