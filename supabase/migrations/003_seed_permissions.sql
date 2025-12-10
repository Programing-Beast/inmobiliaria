-- =====================================================
-- Inmobiliaria Platform - Seed Permissions and Role Mappings
-- Default permissions for all user roles
-- =====================================================

-- =====================================================
-- INSERT PERMISSIONS
-- =====================================================

-- Dashboard permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('view_dashboard', 'dashboard', 'view', 'View main dashboard'),
  ('view_stats', 'dashboard', 'view_stats', 'View dashboard statistics');

-- Finance permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('view_finances', 'finances', 'view', 'View finance module'),
  ('view_own_payments', 'payments', 'view_own', 'View own payments'),
  ('view_all_payments', 'payments', 'view_all', 'View all building payments'),
  ('create_payment', 'payments', 'create', 'Create new payment record'),
  ('update_payment', 'payments', 'update', 'Update payment record'),
  ('delete_payment', 'payments', 'delete', 'Delete payment record'),
  ('export_payments', 'payments', 'export', 'Export payment records');

-- Reservation permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('view_reservations', 'reservations', 'view', 'View reservations module'),
  ('view_own_reservations', 'reservations', 'view_own', 'View own reservations'),
  ('view_all_reservations', 'reservations', 'view_all', 'View all reservations'),
  ('create_reservation', 'reservations', 'create', 'Create new reservation'),
  ('update_own_reservation', 'reservations', 'update_own', 'Update own pending reservation'),
  ('cancel_own_reservation', 'reservations', 'cancel_own', 'Cancel own reservation'),
  ('approve_reservation', 'reservations', 'approve', 'Approve pending reservations'),
  ('reject_reservation', 'reservations', 'reject', 'Reject pending reservations');

-- Amenity permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('view_amenities', 'amenities', 'view', 'View amenities'),
  ('create_amenity', 'amenities', 'create', 'Create new amenity'),
  ('update_amenity', 'amenities', 'update', 'Update amenity'),
  ('delete_amenity', 'amenities', 'delete', 'Delete amenity');

-- Incident permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('view_incidents', 'incidents', 'view', 'View incidents module'),
  ('view_own_incidents', 'incidents', 'view_own', 'View own incidents'),
  ('view_all_incidents', 'incidents', 'view_all', 'View all building incidents'),
  ('create_incident', 'incidents', 'create', 'Create new incident'),
  ('update_own_incident', 'incidents', 'update_own', 'Update own open incident'),
  ('update_incident', 'incidents', 'update', 'Update any incident'),
  ('assign_incident', 'incidents', 'assign', 'Assign incident to user'),
  ('resolve_incident', 'incidents', 'resolve', 'Mark incident as resolved');

-- Announcement permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('view_announcements', 'announcements', 'view', 'View published announcements'),
  ('create_announcement', 'announcements', 'create', 'Create new announcement'),
  ('update_announcement', 'announcements', 'update', 'Update announcement'),
  ('delete_announcement', 'announcements', 'delete', 'Delete announcement'),
  ('publish_announcement', 'announcements', 'publish', 'Publish announcement');

-- Document permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('view_documents', 'documents', 'view', 'View public documents'),
  ('view_own_documents', 'documents', 'view_own', 'View own private documents'),
  ('upload_document', 'documents', 'upload', 'Upload new document'),
  ('delete_document', 'documents', 'delete', 'Delete document');

-- User management permissions
INSERT INTO permissions (name, resource, action, description) VALUES
  ('view_users', 'users', 'view', 'View users list'),
  ('create_user', 'users', 'create', 'Create new user (Owner)'),
  ('update_user', 'users', 'update', 'Update user details'),
  ('deactivate_user', 'users', 'deactivate', 'Deactivate user account'),
  ('assign_unit', 'users', 'assign_unit', 'Assign unit to user');

-- Approval permissions (Super Admin only)
INSERT INTO permissions (name, resource, action, description) VALUES
  ('view_approvals', 'approvals', 'view', 'View pending approvals'),
  ('approve_user', 'approvals', 'approve_user', 'Approve user registration'),
  ('reject_user', 'approvals', 'reject_user', 'Reject user registration');

-- =====================================================
-- MAP PERMISSIONS TO ROLES
-- =====================================================

-- REGULAR_USER PERMISSIONS
-- Basic access: Dashboard, Documents, Profile
INSERT INTO role_permissions (role, permission_id)
SELECT 'regular_user', id FROM permissions WHERE name IN (
  'view_dashboard',
  'view_stats',
  'view_documents',
  'view_own_documents'
);

-- TENANT PERMISSIONS
-- Dashboard, Reservations, Incidents, Documents
INSERT INTO role_permissions (role, permission_id)
SELECT 'tenant', id FROM permissions WHERE name IN (
  -- Dashboard
  'view_dashboard',
  'view_stats',

  -- Reservations
  'view_reservations',
  'view_own_reservations',
  'view_all_reservations',
  'create_reservation',
  'update_own_reservation',
  'cancel_own_reservation',
  'view_amenities',

  -- Incidents
  'view_incidents',
  'view_own_incidents',
  'create_incident',
  'update_own_incident',

  -- Announcements
  'view_announcements',

  -- Documents
  'view_documents',
  'view_own_documents'
);

-- OWNER PERMISSIONS
-- All Tenant permissions + Finance + User Management
INSERT INTO role_permissions (role, permission_id)
SELECT 'owner', id FROM permissions WHERE name IN (
  -- Dashboard
  'view_dashboard',
  'view_stats',

  -- Finance (Owner exclusive)
  'view_finances',
  'view_own_payments',
  'view_all_payments',
  'create_payment',
  'update_payment',
  'delete_payment',
  'export_payments',

  -- Reservations
  'view_reservations',
  'view_own_reservations',
  'view_all_reservations',
  'create_reservation',
  'update_own_reservation',
  'cancel_own_reservation',
  'approve_reservation',
  'reject_reservation',
  'view_amenities',
  'create_amenity',
  'update_amenity',
  'delete_amenity',

  -- Incidents
  'view_incidents',
  'view_own_incidents',
  'view_all_incidents',
  'create_incident',
  'update_own_incident',
  'update_incident',
  'assign_incident',
  'resolve_incident',

  -- Announcements
  'view_announcements',
  'create_announcement',
  'update_announcement',
  'delete_announcement',
  'publish_announcement',

  -- Documents
  'view_documents',
  'view_own_documents',
  'upload_document',
  'delete_document',

  -- User Management
  'view_users',
  'create_user',
  'update_user',
  'assign_unit'
);

-- SUPER_ADMIN PERMISSIONS
-- All permissions including approvals
INSERT INTO role_permissions (role, permission_id)
SELECT 'super_admin', id FROM permissions;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE permissions IS 'All available permissions in the system';
COMMENT ON TABLE role_permissions IS 'Maps permissions to user roles';
COMMENT ON COLUMN permissions.name IS 'Unique permission identifier (e.g., view_finances)';
COMMENT ON COLUMN permissions.resource IS 'Resource being accessed (e.g., finances, reservations)';
COMMENT ON COLUMN permissions.action IS 'Action being performed (e.g., view, create, update)';
