-- =====================================================
-- Inmobiliaria Platform - Row Level Security Policies
-- Multi-tenant security with role-based access control
-- =====================================================

-- Enable Row Level Security on all tables
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get current user's role
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Get current user's building_id
CREATE OR REPLACE FUNCTION public.user_building()
RETURNS UUID AS $$
  SELECT building_id FROM users WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is owner
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'owner'
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (id = auth.uid());

-- Super admins can view all users
CREATE POLICY "Super admins can view all users"
  ON users FOR SELECT
  USING (public.is_super_admin());

-- Users can update their own profile (except role)
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = (SELECT role FROM users WHERE id = auth.uid()));

-- Super admins can manage all users
CREATE POLICY "Super admins can manage users"
  ON users FOR ALL
  USING (public.is_super_admin());

-- =====================================================
-- BUILDINGS TABLE POLICIES
-- =====================================================

-- Users can view their building
CREATE POLICY "Users can view own building"
  ON buildings FOR SELECT
  USING (id = public.user_building());

-- Super admins can manage all buildings
CREATE POLICY "Super admins can manage buildings"
  ON buildings FOR ALL
  USING (public.is_super_admin());

-- =====================================================
-- UNITS TABLE POLICIES
-- =====================================================

-- Users can view units in their building
CREATE POLICY "Users can view building units"
  ON units FOR SELECT
  USING (building_id = public.user_building());

-- Super admins can manage all units
CREATE POLICY "Super admins can manage units"
  ON units FOR ALL
  USING (public.is_super_admin());

-- =====================================================
-- PAYMENTS TABLE POLICIES
-- =====================================================

-- Owners can view all payments in their building
CREATE POLICY "Owners can view building payments"
  ON payments FOR SELECT
  USING (
    public.is_owner() AND
    unit_id IN (SELECT id FROM units WHERE building_id = public.user_building())
  );

-- Users can view their own payments
CREATE POLICY "Users can view own payments"
  ON payments FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can manage all payments
CREATE POLICY "Super admins can manage payments"
  ON payments FOR ALL
  USING (public.is_super_admin());

-- Owners can create payments
CREATE POLICY "Owners can create payments"
  ON payments FOR INSERT
  WITH CHECK (
    public.is_owner() AND
    unit_id IN (SELECT id FROM units WHERE building_id = public.user_building())
  );

-- Owners can update payments in their building
CREATE POLICY "Owners can update building payments"
  ON payments FOR UPDATE
  USING (
    public.is_owner() AND
    unit_id IN (SELECT id FROM units WHERE building_id = public.user_building())
  );

-- =====================================================
-- AMENITIES TABLE POLICIES
-- =====================================================

-- All authenticated users can view amenities in their building
CREATE POLICY "Users can view building amenities"
  ON amenities FOR SELECT
  USING (building_id = public.user_building());

-- Super admins can manage all amenities
CREATE POLICY "Super admins can manage amenities"
  ON amenities FOR ALL
  USING (public.is_super_admin());

-- Owners can manage amenities in their building
CREATE POLICY "Owners can manage building amenities"
  ON amenities FOR ALL
  USING (
    public.is_owner() AND
    building_id = public.user_building()
  );

-- =====================================================
-- RESERVATIONS TABLE POLICIES
-- =====================================================

-- Users can view their own reservations
CREATE POLICY "Users can view own reservations"
  ON reservations FOR SELECT
  USING (user_id = auth.uid());

-- Users can view all reservations for amenities in their building
CREATE POLICY "Users can view building reservations"
  ON reservations FOR SELECT
  USING (
    amenity_id IN (
      SELECT id FROM amenities WHERE building_id = public.user_building()
    )
  );

-- Users can create reservations for amenities in their building
CREATE POLICY "Users can create reservations"
  ON reservations FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    amenity_id IN (
      SELECT id FROM amenities WHERE building_id = public.user_building()
    )
  );

-- Users can update their own pending reservations
CREATE POLICY "Users can update own reservations"
  ON reservations FOR UPDATE
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

-- Super admins can manage all reservations
CREATE POLICY "Super admins can manage reservations"
  ON reservations FOR ALL
  USING (public.is_super_admin());

-- Owners can approve/reject reservations in their building
CREATE POLICY "Owners can manage building reservations"
  ON reservations FOR UPDATE
  USING (
    public.is_owner() AND
    amenity_id IN (
      SELECT id FROM amenities WHERE building_id = public.user_building()
    )
  );

-- =====================================================
-- INCIDENTS TABLE POLICIES
-- =====================================================

-- Users can view their own incidents
CREATE POLICY "Users can view own incidents"
  ON incidents FOR SELECT
  USING (user_id = auth.uid());

-- Users can view incidents in their building
CREATE POLICY "Users can view building incidents"
  ON incidents FOR SELECT
  USING (building_id = public.user_building());

-- Users can create incidents
CREATE POLICY "Users can create incidents"
  ON incidents FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    building_id = public.user_building()
  );

-- Users can update their own open incidents
CREATE POLICY "Users can update own incidents"
  ON incidents FOR UPDATE
  USING (user_id = auth.uid() AND status = 'open')
  WITH CHECK (user_id = auth.uid());

-- Super admins can manage all incidents
CREATE POLICY "Super admins can manage incidents"
  ON incidents FOR ALL
  USING (public.is_super_admin());

-- Owners can manage incidents in their building
CREATE POLICY "Owners can manage building incidents"
  ON incidents FOR ALL
  USING (
    public.is_owner() AND
    building_id = public.user_building()
  );

-- =====================================================
-- ANNOUNCEMENTS TABLE POLICIES
-- =====================================================

-- All users can view published announcements in their building
CREATE POLICY "Users can view published announcements"
  ON announcements FOR SELECT
  USING (
    building_id = public.user_building() AND
    is_published = true
  );

-- Super admins can manage all announcements
CREATE POLICY "Super admins can manage announcements"
  ON announcements FOR ALL
  USING (public.is_super_admin());

-- Owners can manage announcements in their building
CREATE POLICY "Owners can manage building announcements"
  ON announcements FOR ALL
  USING (
    public.is_owner() AND
    building_id = public.user_building()
  );

-- =====================================================
-- DOCUMENTS TABLE POLICIES
-- =====================================================

-- Users can view public documents in their building
CREATE POLICY "Users can view public documents"
  ON documents FOR SELECT
  USING (
    building_id = public.user_building() AND
    is_public = true
  );

-- Users can view their own private documents
CREATE POLICY "Users can view own documents"
  ON documents FOR SELECT
  USING (user_id = auth.uid());

-- Super admins can manage all documents
CREATE POLICY "Super admins can manage documents"
  ON documents FOR ALL
  USING (public.is_super_admin());

-- Owners can manage documents in their building
CREATE POLICY "Owners can manage building documents"
  ON documents FOR ALL
  USING (
    public.is_owner() AND
    building_id = public.user_building()
  );

-- =====================================================
-- PERMISSIONS & ROLE_PERMISSIONS POLICIES
-- =====================================================

-- All authenticated users can view permissions (for UI display)
CREATE POLICY "Users can view permissions"
  ON permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Super admins can manage permissions
CREATE POLICY "Super admins can manage permissions"
  ON permissions FOR ALL
  USING (public.is_super_admin());

-- All authenticated users can view role permissions
CREATE POLICY "Users can view role permissions"
  ON role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Super admins can manage role permissions
CREATE POLICY "Super admins can manage role permissions"
  ON role_permissions FOR ALL
  USING (public.is_super_admin());

-- =====================================================
-- AUTOMATIC USER CREATION TRIGGER
-- =====================================================

-- Create user record automatically when auth.users is created
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'regular_user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.user_role() IS 'Returns the role of the currently authenticated user';
COMMENT ON FUNCTION public.user_building() IS 'Returns the building_id of the currently authenticated user';
COMMENT ON FUNCTION public.is_super_admin() IS 'Returns true if current user is super_admin';
COMMENT ON FUNCTION public.is_owner() IS 'Returns true if current user is owner';
