-- =====================================================
-- Inmobiliaria Platform - Database Schema
-- HYBRID Translation Approach:
-- - Static UI: react-i18next (JSON files)
-- - Dynamic Content: Database columns (title_es, title_en)
-- =====================================================

-- Enable UUID extension
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- Not needed, using gen_random_uuid()

-- =====================================================
-- ENUMS (Always in English for database)
-- =====================================================

CREATE TYPE user_role AS ENUM ('regular_user', 'tenant', 'owner', 'super_admin');
CREATE TYPE payment_status AS ENUM ('paid', 'pending', 'overdue');
CREATE TYPE concept_type AS ENUM ('invoice_credit', 'invoice_cash', 'receipt', 'credit_note');
CREATE TYPE reservation_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled');
CREATE TYPE incident_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE incident_type AS ENUM ('maintenance', 'complaint', 'suggestion');

-- =====================================================
-- BUILDINGS
-- =====================================================

CREATE TABLE buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  -- Settings with translations
  welcome_message_es TEXT,
  welcome_message_en TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- UNITS
-- =====================================================

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL, -- e.g., "A-302", "B-105"
  floor INTEGER,
  area_sqm DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(building_id, unit_number)
);

-- =====================================================
-- USERS (extends Supabase auth.users)
-- =====================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role DEFAULT 'regular_user' NOT NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  building_id UUID REFERENCES buildings(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- PERMISSIONS & ROLE PERMISSIONS
-- =====================================================

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL, -- e.g., 'view_finances', 'create_reservation'
  resource TEXT NOT NULL,    -- e.g., 'finances', 'reservations'
  action TEXT NOT NULL,      -- e.g., 'view', 'create', 'update', 'delete'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role user_role NOT NULL,
  permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role, permission_id)
);

-- =====================================================
-- PAYMENTS / FINANCES
-- =====================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  concept_type concept_type NOT NULL,
  concept_description TEXT, -- Additional description if needed
  amount DECIMAL(10,2) NOT NULL,
  status payment_status DEFAULT 'pending',
  due_date DATE,
  payment_date DATE,
  receipt_url TEXT, -- URL to uploaded receipt file
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- AMENITIES (with HYBRID translations)
-- =====================================================

CREATE TABLE amenities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,           -- Technical name: "quincho_1", "piscina_norte"
  type TEXT NOT NULL,           -- Type: "quincho", "piscina", "gym", "sum", "sports_court"
  -- Display names (HYBRID translation)
  display_name_es TEXT NOT NULL, -- "Quincho Norte"
  display_name_en TEXT,          -- "North BBQ Area"
  -- Rules (HYBRID translation)
  rules_es TEXT,                 -- Spanish rules
  rules_en TEXT,                 -- English rules
  -- Capacity and settings
  max_capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  requires_deposit BOOLEAN DEFAULT false,
  deposit_amount DECIMAL(10,2),
  price_per_hour DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- RESERVATIONS
-- =====================================================

CREATE TABLE reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amenity_id UUID REFERENCES amenities(id) ON DELETE CASCADE,
  reservation_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status reservation_status DEFAULT 'pending',
  notes TEXT,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INCIDENTS
-- =====================================================

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  type incident_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status incident_status DEFAULT 'open',
  location TEXT, -- e.g., "Estacionamiento", "Piscina"
  priority TEXT DEFAULT 'medium', -- low, medium, high
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ANNOUNCEMENTS (with HYBRID translations)
-- =====================================================

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  -- Title (HYBRID translation)
  title_es TEXT NOT NULL,
  title_en TEXT,
  -- Content (HYBRID translation)
  content_es TEXT NOT NULL,
  content_en TEXT,
  -- Metadata
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- DOCUMENTS
-- =====================================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES buildings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE, -- NULL if building-wide
  title_es TEXT NOT NULL,
  title_en TEXT,
  description_es TEXT,
  description_en TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT, -- pdf, jpg, png, etc.
  category TEXT, -- reglamento, actas, balances, contratos
  is_public BOOLEAN DEFAULT false, -- Visible to all building residents
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES for Performance
-- =====================================================

CREATE INDEX idx_users_building ON users(building_id);
CREATE INDEX idx_users_unit ON users(unit_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_date ON payments(created_at);
CREATE INDEX idx_reservations_amenity ON reservations(amenity_id);
CREATE INDEX idx_reservations_user ON reservations(user_id);
CREATE INDEX idx_reservations_date ON reservations(reservation_date);
CREATE INDEX idx_incidents_building ON incidents(building_id);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_announcements_building ON announcements(building_id);
CREATE INDEX idx_announcements_published ON announcements(is_published);

-- =====================================================
-- UPDATED_AT TRIGGER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_amenities_updated_at BEFORE UPDATE ON amenities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS for Documentation
-- =====================================================

COMMENT ON TABLE users IS 'Users table with role-based access. Regular users created via registration, Owners created by admin.';
COMMENT ON COLUMN amenities.display_name_es IS 'HYBRID translation: Display name in Spanish (required)';
COMMENT ON COLUMN amenities.display_name_en IS 'HYBRID translation: Display name in English (optional)';
COMMENT ON COLUMN announcements.title_es IS 'HYBRID translation: Announcement title in Spanish (required)';
COMMENT ON COLUMN announcements.title_en IS 'HYBRID translation: Announcement title in English (optional)';
