-- =====================================================
-- Row Level Security for New Tables (user_units, user_roles)
-- This migration adds RLS policies for the new tables created in migration 005
-- =====================================================

-- Enable Row Level Security on new tables
ALTER TABLE user_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USER_UNITS TABLE POLICIES
-- =====================================================

-- Users can view their own unit assignments
CREATE POLICY "Users can view own unit assignments"
  ON user_units FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can view all unit assignments
CREATE POLICY "Super admins can view all unit assignments"
  ON user_units FOR SELECT
  USING (public.is_super_admin());

-- Super admins can manage all unit assignments
CREATE POLICY "Super admins can manage unit assignments"
  ON user_units FOR ALL
  USING (public.is_super_admin());

-- Users can update their own primary unit designation
CREATE POLICY "Users can update own primary unit"
  ON user_units FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- =====================================================
-- USER_ROLES TABLE POLICIES
-- =====================================================

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can view all roles
CREATE POLICY "Super admins can view all roles"
  ON user_roles FOR SELECT
  USING (public.is_super_admin());

-- Super admins can manage all roles
CREATE POLICY "Super admins can manage roles"
  ON user_roles FOR ALL
  USING (public.is_super_admin());

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON POLICY "Users can view own unit assignments" ON user_units IS 'Allows users to see which units they have access to';
COMMENT ON POLICY "Super admins can manage unit assignments" ON user_units IS 'Super admins can assign/remove units for any user';
COMMENT ON POLICY "Users can view own roles" ON user_roles IS 'Allows users to see their assigned roles';
COMMENT ON POLICY "Super admins can manage roles" ON user_roles IS 'Super admins can assign/remove roles for any user';
