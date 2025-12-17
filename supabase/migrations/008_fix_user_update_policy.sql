-- =====================================================
-- Fix User Update RLS Policy
-- The previous policy was preventing super admins from updating users
-- because the "Users can update own profile" policy was too restrictive
-- =====================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Recreate with proper restrictions
-- Users can update their own profile, but NOT their role, building, or unit
-- Those fields can only be changed by super admins
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent users from changing these fields themselves
    role = (SELECT role FROM users WHERE id = auth.uid()) AND
    building_id = (SELECT building_id FROM users WHERE id = auth.uid()) AND
    unit_id = (SELECT unit_id FROM users WHERE id = auth.uid())
  );

-- Make sure the super admin policy is properly set
-- Drop and recreate to ensure it takes precedence
DROP POLICY IF EXISTS "Super admins can manage users" ON users;

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

-- Add comment for documentation
COMMENT ON POLICY "Users can update own profile" ON users IS
  'Allows users to update their own profile (name, email) but prevents them from changing role, building, or unit. Those can only be changed by super admins.';

COMMENT ON POLICY "Super admins can manage users" ON users IS
  'Super admins have full control over all user records, including role, building, and unit assignments.';
