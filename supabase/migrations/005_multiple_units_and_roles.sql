-- =====================================================
-- Milestone 1: Multiple Units and Roles Support
-- This migration adds support for:
-- 1. Owners with multiple units
-- 2. Users with multiple roles (e.g., Owner + Tenant)
-- =====================================================

-- =====================================================
-- USER_UNITS: Many-to-Many Relationship
-- =====================================================

CREATE TABLE user_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE NOT NULL,
  -- Additional metadata
  is_primary BOOLEAN DEFAULT false, -- Indicates primary residence
  relationship_type TEXT DEFAULT 'owner', -- 'owner', 'tenant', 'resident'
  start_date DATE,
  end_date DATE, -- NULL for indefinite
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, unit_id)
);

-- =====================================================
-- USER_ROLES: Many-to-Many Relationship
-- =====================================================

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

CREATE INDEX idx_user_units_user ON user_units(user_id);
CREATE INDEX idx_user_units_unit ON user_units(unit_id);
CREATE INDEX idx_user_units_primary ON user_units(is_primary);
CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_user_units_updated_at
  BEFORE UPDATE ON user_units
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DATA MIGRATION
-- =====================================================

-- Migrate existing user units to the new junction table
INSERT INTO user_units (user_id, unit_id, is_primary, relationship_type)
SELECT
  id as user_id,
  unit_id,
  true as is_primary,
  CASE
    WHEN role = 'owner' THEN 'owner'
    WHEN role = 'tenant' THEN 'tenant'
    ELSE 'resident'
  END as relationship_type
FROM users
WHERE unit_id IS NOT NULL;

-- Migrate existing user roles to the new junction table
INSERT INTO user_roles (user_id, role)
SELECT id as user_id, role
FROM users
WHERE role IS NOT NULL;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get all units for a user
CREATE OR REPLACE FUNCTION get_user_units(p_user_id UUID)
RETURNS TABLE (
  unit_id UUID,
  unit_number TEXT,
  building_id UUID,
  building_name TEXT,
  is_primary BOOLEAN,
  relationship_type TEXT,
  floor INTEGER,
  area_sqm DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.unit_number,
    u.building_id,
    b.name,
    uu.is_primary,
    uu.relationship_type,
    u.floor,
    u.area_sqm
  FROM user_units uu
  JOIN units u ON uu.unit_id = u.id
  JOIN buildings b ON u.building_id = b.id
  WHERE uu.user_id = p_user_id
    AND (uu.end_date IS NULL OR uu.end_date >= CURRENT_DATE)
  ORDER BY uu.is_primary DESC, u.unit_number;
END;
$$ LANGUAGE plpgsql;

-- Function to get all roles for a user
CREATE OR REPLACE FUNCTION get_user_roles(p_user_id UUID)
RETURNS TABLE (
  role user_role
) AS $$
BEGIN
  RETURN QUERY
  SELECT ur.role
  FROM user_roles ur
  WHERE ur.user_id = p_user_id
  ORDER BY
    CASE ur.role
      WHEN 'super_admin' THEN 1
      WHEN 'owner' THEN 2
      WHEN 'tenant' THEN 3
      WHEN 'regular_user' THEN 4
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION user_has_role(p_user_id UUID, p_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = p_user_id
      AND role = p_role
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's primary unit
CREATE OR REPLACE FUNCTION get_user_primary_unit(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_unit_id UUID;
BEGIN
  SELECT unit_id INTO v_unit_id
  FROM user_units
  WHERE user_id = p_user_id
    AND is_primary = true
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LIMIT 1;

  -- If no primary unit, return the first active unit
  IF v_unit_id IS NULL THEN
    SELECT unit_id INTO v_unit_id
    FROM user_units
    WHERE user_id = p_user_id
      AND (end_date IS NULL OR end_date >= CURRENT_DATE)
    ORDER BY created_at
    LIMIT 1;
  END IF;

  RETURN v_unit_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS for Backward Compatibility
-- =====================================================

-- View to maintain backward compatibility with existing queries
CREATE OR REPLACE VIEW users_with_primary_unit AS
SELECT
  u.*,
  get_user_primary_unit(u.id) as primary_unit_id,
  (SELECT role FROM user_roles WHERE user_id = u.id ORDER BY
    CASE role
      WHEN 'super_admin' THEN 1
      WHEN 'owner' THEN 2
      WHEN 'tenant' THEN 3
      WHEN 'regular_user' THEN 4
    END
  LIMIT 1) as primary_role
FROM users u;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE user_units IS 'Junction table for many-to-many relationship between users and units. Supports owners with multiple units.';
COMMENT ON TABLE user_roles IS 'Junction table for many-to-many relationship between users and roles. Supports users with multiple roles (e.g., Owner + Tenant).';
COMMENT ON COLUMN user_units.is_primary IS 'Indicates the users primary residence. Only one unit should be marked as primary per user.';
COMMENT ON COLUMN user_units.relationship_type IS 'Type of relationship: owner, tenant, or resident';
COMMENT ON FUNCTION get_user_units IS 'Returns all active units for a given user';
COMMENT ON FUNCTION get_user_roles IS 'Returns all roles for a given user, ordered by hierarchy';
COMMENT ON FUNCTION user_has_role IS 'Checks if a user has a specific role';
COMMENT ON FUNCTION get_user_primary_unit IS 'Returns the primary unit ID for a user, or first active unit if no primary is set';
