-- =====================================================
-- COMPLETE FIX FOR USER UPDATE ISSUES
-- Run this entire file in Supabase Dashboard → SQL Editor
-- =====================================================

-- This file combines:
-- - Migration 007: RLS for user_units and user_roles tables
-- - Migration 008: Fix conflicting user update policies

-- =====================================================
-- STEP 1: Enable RLS on new tables (if not already done)
-- =====================================================

ALTER TABLE IF EXISTS user_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 2: Drop existing policies on new tables (if any)
-- =====================================================

DROP POLICY IF EXISTS "Users can view own unit assignments" ON user_units;
DROP POLICY IF EXISTS "Super admins can view all unit assignments" ON user_units;
DROP POLICY IF EXISTS "Super admins can manage unit assignments" ON user_units;
DROP POLICY IF EXISTS "Users can update own primary unit" ON user_units;

DROP POLICY IF EXISTS "Users can view own roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Super admins can manage roles" ON user_roles;

-- =====================================================
-- STEP 3: Create RLS policies for user_units table
-- =====================================================

-- Users can view their own unit assignments
CREATE POLICY "Users can view own unit assignments"
  ON user_units FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can view all unit assignments
CREATE POLICY "Super admins can view all unit assignments"
  ON user_units FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admins can manage all unit assignments
CREATE POLICY "Super admins can manage unit assignments"
  ON user_units FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Users can update their own primary unit designation
CREATE POLICY "Users can update own primary unit"
  ON user_units FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- STEP 4: Create RLS policies for user_roles table
-- =====================================================

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can view all roles
CREATE POLICY "Super admins can view all roles"
  ON user_roles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Super admins can manage all roles
CREATE POLICY "Super admins can manage roles"
  ON user_roles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- STEP 5: Fix the conflicting users table policies
-- =====================================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Super admins can manage users" ON users;

-- Recreate user self-update policy with proper restrictions
-- Users can update their own profile, but NOT their role, building, or unit
-- Those fields can only be changed by super admins
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent users from changing these fields themselves
    role = (SELECT role FROM users WHERE id = auth.uid()) AND
    COALESCE(building_id, 'NULL'::text) = COALESCE((SELECT building_id::text FROM users WHERE id = auth.uid()), 'NULL') AND
    COALESCE(unit_id, 'NULL'::text) = COALESCE((SELECT unit_id::text FROM users WHERE id = auth.uid()), 'NULL')
  );

-- Recreate super admin policy with explicit permissions
CREATE POLICY "Super admins can manage users"
  ON users FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- STEP 6: Add helpful comments
-- =====================================================

COMMENT ON POLICY "Users can view own unit assignments" ON user_units IS 'Allows users to see which units they have access to';
COMMENT ON POLICY "Super admins can manage unit assignments" ON user_units IS 'Super admins can assign/remove units for any user';
COMMENT ON POLICY "Users can view own roles" ON user_roles IS 'Allows users to see their assigned roles';
COMMENT ON POLICY "Super admins can manage roles" ON user_roles IS 'Super admins can assign/remove roles for any user';
COMMENT ON POLICY "Users can update own profile" ON users IS 'Allows users to update their own profile (name, email) but prevents them from changing role, building, or unit. Those can only be changed by super admins.';
COMMENT ON POLICY "Super admins can manage users" ON users IS 'Super admins have full control over all user records, including role, building, and unit assignments.';

-- =====================================================
-- STEP 7: Verify the fix
-- =====================================================

-- Check if policies are created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  CASE
    WHEN roles = '{public}' THEN 'Public'
    ELSE array_to_string(roles, ', ')
  END as roles
FROM pg_policies
WHERE tablename IN ('users', 'user_units', 'user_roles')
ORDER BY tablename, policyname;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ All RLS policies have been fixed!';
  RAISE NOTICE '✅ Super admins can now update users without issues';
  RAISE NOTICE '✅ Test by editing a user in the Admin Panel';
END $$;
