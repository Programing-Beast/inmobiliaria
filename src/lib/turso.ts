import { createClient, type Client, type ResultSet } from '@libsql/client';
import type { UserRole } from './database.types';

// Turso configuration
const tursoUrl = import.meta.env.VITE_TURSO_DATABASE_URL;
const tursoAuthToken = import.meta.env.VITE_TURSO_AUTH_TOKEN;

if (!tursoUrl || !tursoAuthToken) {
  throw new Error('Missing Turso environment variables. Please check your .env file.');
}

// Create Turso client
export const db: Client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

// Helper to generate UUIDs
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Helper to get current timestamp
const now = (): string => new Date().toISOString();

// Helper to convert ResultSet rows to objects
const rowsToObjects = <T>(result: ResultSet): T[] => {
  if (!result.rows || result.rows.length === 0) return [];
  const columns = result.columns;
  return result.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, idx) => {
      obj[col] = row[idx];
    });
    return obj as T;
  });
};

// Helper to get single object from ResultSet
const rowToObject = <T>(result: ResultSet): T | null => {
  const objects = rowsToObjects<T>(result);
  return objects.length > 0 ? objects[0] : null;
};

// =====================================================
// AUTH HELPERS (Simple local auth - no external service)
// =====================================================

// Simple password hashing (for demo - use bcrypt in production)
const hashPassword = async (password: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
};

/**
 * Sign up a new user with email and password
 */
export const signUp = async (email: string, password: string, fullName: string) => {
  try {
    const id = generateUUID();
    const passwordHash = await hashPassword(password);
    const timestamp = now();

    // Check if user already exists
    const existingUser = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email],
    });

    if (existingUser.rows.length > 0) {
      return { data: null, error: { message: 'User with this email already exists' } };
    }

    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'regular_user', 1, ?, ?)`,
      args: [id, email, passwordHash, fullName, timestamp, timestamp],
    });

    const user = { id, email, full_name: fullName };

    // Store session
    localStorage.setItem('currentUserId', id);
    localStorage.setItem('currentUserEmail', email);

    return { data: { user }, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, email, password_hash, full_name, role, is_active FROM users WHERE email = ?',
      args: [email],
    });

    const user = rowToObject<{
      id: string;
      email: string;
      password_hash: string;
      full_name: string;
      role: string;
      is_active: number;
    }>(result);

    if (!user) {
      return { data: null, error: { message: 'Invalid email or password' } };
    }

    if (!user.is_active) {
      return { data: null, error: { message: 'Account is disabled' } };
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return { data: null, error: { message: 'Invalid email or password' } };
    }

    // Store session
    localStorage.setItem('currentUserId', user.id);
    localStorage.setItem('currentUserEmail', user.email);

    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
        },
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  localStorage.removeItem('currentUserId');
  localStorage.removeItem('currentUserEmail');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('userUnit');
  localStorage.removeItem('currentUnitNumber');
  localStorage.removeItem('userUnits');
  localStorage.removeItem('userRoles');
  return { error: null };
};

/**
 * Get the current user session
 */
export const getSession = async () => {
  const userId = localStorage.getItem('currentUserId');
  if (!userId) {
    return { session: null, error: null };
  }

  return {
    session: { user: { id: userId } },
    error: null,
  };
};

/**
 * Get the current user
 */
export const getCurrentUser = async () => {
  const userId = localStorage.getItem('currentUserId');
  if (!userId) {
    return { user: null, error: null };
  }

  const result = await db.execute({
    sql: 'SELECT id, email, full_name FROM users WHERE id = ?',
    args: [userId],
  });

  const user = rowToObject<{ id: string; email: string; full_name: string }>(result);
  return { user, error: null };
};

/**
 * Get user profile with role information
 */
export const getUserProfile = async (userId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT u.*, b.name as building_name, b.address as building_address,
                   b.portal_id as building_portal_id,
                   un.unit_number, un.floor, un.area_sqm as unit_area, un.portal_id as unit_portal_id
            FROM users u
            LEFT JOIN buildings b ON u.building_id = b.id
            LEFT JOIN units un ON u.unit_id = un.id
            WHERE u.id = ?`,
      args: [userId],
    });

    const profile = rowToObject<any>(result);

    if (profile) {
      // Transform to match expected structure
      profile.building = profile.building_id ? {
        id: profile.building_id,
        portal_id: profile.building_portal_id ?? null,
        name: profile.building_name,
        address: profile.building_address,
      } : null;

      profile.unit = profile.unit_id ? {
        id: profile.unit_id,
        portal_id: profile.unit_portal_id ?? null,
        unit_number: profile.unit_number,
        floor: profile.floor,
        area_sqm: profile.unit_area,
      } : null;
    }

    return { profile, error: null };
  } catch (error: any) {
    return { profile: null, error: { message: error.message } };
  }
};

/**
 * Get all units for a user (supports multiple units per user)
 */
export const getUserUnits = async (userId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT uu.unit_id, u.unit_number, u.building_id, b.name as building_name,
                   uu.is_primary, uu.relationship_type, u.floor, u.area_sqm, u.portal_id as unit_portal_id
            FROM user_units uu
            JOIN units u ON uu.unit_id = u.id
            JOIN buildings b ON u.building_id = b.id
            WHERE uu.user_id = ?
            ORDER BY uu.is_primary DESC, u.unit_number`,
      args: [userId],
    });

    const units = rowsToObjects<any>(result).map((unit) => ({
      ...unit,
      portal_id: unit.unit_portal_id ?? null,
    }));
    return { units, error: null };
  } catch (error: any) {
    return { units: [], error: { message: error.message } };
  }
};

/**
 * Check if user has a specific role
 */
export const userHasRole = async (userId: string, role: string) => {
  try {
    const result = await db.execute({
      sql: 'SELECT 1 FROM user_roles WHERE user_id = ? AND role = ?',
      args: [userId, role],
    });

    return { hasRole: result.rows.length > 0, error: null };
  } catch (error: any) {
    return { hasRole: false, error: { message: error.message } };
  }
};

/**
 * Get user's primary unit ID
 */
export const getUserPrimaryUnit = async (userId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT unit_id FROM user_units WHERE user_id = ? AND is_primary = 1
            UNION ALL
            SELECT unit_id FROM user_units WHERE user_id = ? AND is_primary = 0
            LIMIT 1`,
      args: [userId, userId],
    });

    const row = rowToObject<{ unit_id: string }>(result);
    return { primaryUnitId: row?.unit_id || null, error: null };
  } catch (error: any) {
    return { primaryUnitId: null, error: { message: error.message } };
  }
};

/**
 * Add a unit to a user
 */
export const addUserUnit = async (
  userId: string,
  unitId: string,
  isPrimary: boolean = false,
  relationshipType: string = 'owner'
) => {
  try {
    const id = generateUUID();
    const timestamp = now();

    await db.execute({
      sql: `INSERT INTO user_units (id, user_id, unit_id, is_primary, relationship_type, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, userId, unitId, isPrimary ? 1 : 0, relationshipType, timestamp, timestamp],
    });

    return { userUnit: { id, user_id: userId, unit_id: unitId, is_primary: isPrimary, relationship_type: relationshipType }, error: null };
  } catch (error: any) {
    return { userUnit: null, error: { message: error.message } };
  }
};

/**
 * Remove a unit from a user
 */
export const removeUserUnit = async (userId: string, unitId: string) => {
  try {
    await db.execute({
      sql: 'DELETE FROM user_units WHERE user_id = ? AND unit_id = ?',
      args: [userId, unitId],
    });

    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

/**
 * Set a unit as primary for a user
 */
export const setUserPrimaryUnit = async (userId: string, unitId: string) => {
  try {
    // First, set all units to non-primary
    await db.execute({
      sql: 'UPDATE user_units SET is_primary = 0 WHERE user_id = ?',
      args: [userId],
    });

    // Then set the specified unit as primary
    await db.execute({
      sql: 'UPDATE user_units SET is_primary = 1 WHERE user_id = ? AND unit_id = ?',
      args: [userId, unitId],
    });

    return { userUnit: { user_id: userId, unit_id: unitId, is_primary: true }, error: null };
  } catch (error: any) {
    return { userUnit: null, error: { message: error.message } };
  }
};

/**
 * Add a role to a user
 */
export const addUserRole = async (userId: string, role: string) => {
  try {
    const id = generateUUID();
    const timestamp = now();

    await db.execute({
      sql: 'INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
      args: [id, userId, role, timestamp],
    });

    return { userRole: { id, user_id: userId, role }, error: null };
  } catch (error: any) {
    return { userRole: null, error: { message: error.message } };
  }
};

/**
 * Remove a role from a user
 */
export const removeUserRole = async (userId: string, role: string) => {
  try {
    await db.execute({
      sql: 'DELETE FROM user_roles WHERE user_id = ? AND role = ?',
      args: [userId, role],
    });

    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

// =====================================================
// QUERY HELPERS
// =====================================================

/**
 * Get all payments for current user
 */
export const getUserPayments = async (userId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT p.*, u.unit_number
            FROM payments p
            LEFT JOIN units u ON p.unit_id = u.id
            WHERE p.user_id = ?
            ORDER BY p.created_at DESC`,
      args: [userId],
    });

    const payments = rowsToObjects<any>(result).map(p => ({
      ...p,
      unit: p.unit_number ? { unit_number: p.unit_number } : null,
    }));

    return { payments, error: null };
  } catch (error: any) {
    return { payments: [], error: { message: error.message } };
  }
};

/**
 * Get all building payments (for Owners)
 */
export const getBuildingPayments = async (buildingId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT p.*, us.full_name as user_full_name, us.email as user_email, un.unit_number
            FROM payments p
            LEFT JOIN users us ON p.user_id = us.id
            LEFT JOIN units un ON p.unit_id = un.id
            WHERE un.building_id = ?
            ORDER BY p.created_at DESC`,
      args: [buildingId],
    });

    const payments = rowsToObjects<any>(result).map(p => ({
      ...p,
      user: { full_name: p.user_full_name, email: p.user_email },
      unit: { unit_number: p.unit_number },
    }));

    return { payments, error: null };
  } catch (error: any) {
    return { payments: [], error: { message: error.message } };
  }
};

/**
 * Get amenities for a building
 */
export const getBuildingAmenities = async (buildingId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM amenities WHERE building_id = ? AND is_active = 1 ORDER BY name_es`,
      args: [buildingId],
    });

    const amenities = rowsToObjects<any>(result);
    return { amenities, error: null };
  } catch (error: any) {
    return { amenities: [], error: { message: error.message } };
  }
};

/**
 * Get all amenities with building info
 */
export const getAllAmenities = async () => {
  try {
    const result = await db.execute({
      sql: `SELECT a.*, b.id as building_id, b.name as building_name
            FROM amenities a
            LEFT JOIN buildings b ON a.building_id = b.id
            ORDER BY a.name_es`,
      args: [],
    });

    const amenities = rowsToObjects<any>(result).map(a => ({
      ...a,
      building: { id: a.building_id, name: a.building_name },
    }));

    return { amenities, error: null };
  } catch (error: any) {
    return { amenities: [], error: { message: error.message } };
  }
};

/**
 * Get a single amenity by ID
 */
export const getAmenity = async (id: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT a.*, b.id as building_id, b.name as building_name
            FROM amenities a
            LEFT JOIN buildings b ON a.building_id = b.id
            WHERE a.id = ?`,
      args: [id],
    });

    const amenity = rowToObject<any>(result);
    if (amenity) {
      amenity.building = { id: amenity.building_id, name: amenity.building_name };
    }

    return { amenity, error: null };
  } catch (error: any) {
    return { amenity: null, error: { message: error.message } };
  }
};

/**
 * Get an amenity by name within a building
 */
export const getAmenityByNameInBuilding = async (buildingId: string, nameEs: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT a.*, b.id as building_id, b.name as building_name
            FROM amenities a
            LEFT JOIN buildings b ON a.building_id = b.id
            WHERE a.building_id = ? AND LOWER(a.name_es) = LOWER(?)`,
      args: [buildingId, nameEs],
    });

    const amenity = rowToObject<any>(result);
    if (amenity) {
      amenity.building = { id: amenity.building_id, name: amenity.building_name };
    }

    return { amenity, error: null };
  } catch (error: any) {
    return { amenity: null, error: { message: error.message } };
  }
};

/**
 * Create a new amenity
 */
export const createAmenity = async (amenity: {
  building_id: string;
  name_es: string;
  name_en?: string | null;
  description_es?: string | null;
  description_en?: string | null;
  rules_pdf_url?: string | null;
  max_capacity?: number | null;
  requires_approval?: boolean;
  is_active?: boolean;
  portal_id?: number | null;
}) => {
  try {
    const id = generateUUID();
    const timestamp = now();

    await db.execute({
      sql: `INSERT INTO amenities (id, building_id, portal_id, name_es, name_en, description_es, description_en, rules_pdf_url, max_capacity, requires_approval, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        amenity.building_id,
        amenity.portal_id || null,
        amenity.name_es,
        amenity.name_en || null,
        amenity.description_es || null,
        amenity.description_en || null,
        amenity.rules_pdf_url || null,
        amenity.max_capacity || null,
        amenity.requires_approval ? 1 : 0,
        amenity.is_active !== false ? 1 : 0,
        timestamp,
        timestamp,
      ],
    });

    return await getAmenity(id);
  } catch (error: any) {
    return { amenity: null, error: { message: error.message } };
  }
};

/**
 * Update an amenity
 */
export const updateAmenity = async (
  id: string,
  updates: {
    building_id?: string;
    portal_id?: number | null;
    name_es?: string;
    name_en?: string | null;
    description_es?: string | null;
    description_en?: string | null;
    rules_pdf_url?: string | null;
    max_capacity?: number | null;
    requires_approval?: boolean;
    is_active?: boolean;
  }
) => {
  try {
    const fields: string[] = [];
    const args: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        if (key === 'requires_approval' || key === 'is_active') {
          args.push(value ? 1 : 0);
        } else {
          args.push(value);
        }
      }
    });

    fields.push('updated_at = ?');
    args.push(now());
    args.push(id);

    await db.execute({
      sql: `UPDATE amenities SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });

    return await getAmenity(id);
  } catch (error: any) {
    return { amenity: null, error: { message: error.message } };
  }
};

/**
 * Delete an amenity
 */
export const deleteAmenity = async (id: string) => {
  try {
    await db.execute({
      sql: 'DELETE FROM amenities WHERE id = ?',
      args: [id],
    });

    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

/**
 * Get user's reservations
 */
export const getUserReservations = async (userId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT r.*, a.id as amenity_id, a.name_es as amenity_name_es, a.name_en as amenity_name_en,
                   a.building_id, a.max_capacity, a.is_active as amenity_is_active
            FROM reservations r
            LEFT JOIN amenities a ON r.amenity_id = a.id
            WHERE r.user_id = ?
            ORDER BY r.reservation_date DESC`,
      args: [userId],
    });

    const reservations = rowsToObjects<any>(result).map(r => ({
      ...r,
      amenity: {
        id: r.amenity_id,
        name_es: r.amenity_name_es,
        name_en: r.amenity_name_en,
        building_id: r.building_id,
        max_capacity: r.max_capacity,
        is_active: r.amenity_is_active,
      },
    }));

    return { reservations, error: null };
  } catch (error: any) {
    return { reservations: [], error: { message: error.message } };
  }
};

/**
 * Create a new reservation
 */
export const createReservation = async (
  userId: string,
  amenityId: string,
  reservationDate: string,
  startTime: string,
  endTime: string,
  notes?: string,
  portalId?: number | null
) => {
  try {
    const id = generateUUID();
    const timestamp = now();

    await db.execute({
      sql: `INSERT INTO reservations (id, portal_id, user_id, amenity_id, reservation_date, start_time, end_time, notes, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      args: [id, portalId || null, userId, amenityId, reservationDate, startTime, endTime, notes || null, timestamp, timestamp],
    });

    return await getReservation(id);
  } catch (error: any) {
    return { reservation: null, error: { message: error.message } };
  }
};

/**
 * Get all reservations with amenity and user info (admin view)
 */
export const getAllReservations = async () => {
  try {
    const result = await db.execute({
      sql: `SELECT r.*,
                   a.id as amenity_id, a.name_es as amenity_name_es, a.name_en as amenity_name_en, a.building_id,
                   b.id as building_id, b.name as building_name,
                   u.id as user_id, u.full_name as user_full_name, u.email as user_email
            FROM reservations r
            LEFT JOIN amenities a ON r.amenity_id = a.id
            LEFT JOIN buildings b ON a.building_id = b.id
            LEFT JOIN users u ON r.user_id = u.id
            ORDER BY r.reservation_date DESC`,
      args: [],
    });

    const reservations = rowsToObjects<any>(result).map(r => ({
      ...r,
      amenity: {
        id: r.amenity_id,
        name_es: r.amenity_name_es,
        name_en: r.amenity_name_en,
        building_id: r.building_id,
        building: { id: r.building_id, name: r.building_name },
      },
      user: { id: r.user_id, full_name: r.user_full_name, email: r.user_email },
    }));

    return { reservations, error: null };
  } catch (error: any) {
    return { reservations: [], error: { message: error.message } };
  }
};

/**
 * Get reservations by building (for building admins)
 */
export const getReservationsByBuilding = async (buildingId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT r.*,
                   a.id as amenity_id, a.name_es as amenity_name_es, a.name_en as amenity_name_en, a.building_id,
                   b.id as building_id, b.name as building_name,
                   u.id as user_id, u.full_name as user_full_name, u.email as user_email
            FROM reservations r
            JOIN amenities a ON r.amenity_id = a.id
            JOIN buildings b ON a.building_id = b.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE a.building_id = ?
            ORDER BY r.reservation_date DESC`,
      args: [buildingId],
    });

    const reservations = rowsToObjects<any>(result).map(r => ({
      ...r,
      amenity: {
        id: r.amenity_id,
        name_es: r.amenity_name_es,
        name_en: r.amenity_name_en,
        building_id: r.building_id,
        building: { id: r.building_id, name: r.building_name },
      },
      user: { id: r.user_id, full_name: r.user_full_name, email: r.user_email },
    }));

    return { reservations, error: null };
  } catch (error: any) {
    return { reservations: [], error: { message: error.message } };
  }
};

/**
 * Get a single reservation by ID
 */
export const getReservation = async (id: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT r.*,
                   a.id as amenity_id, a.name_es as amenity_name_es, a.name_en as amenity_name_en, a.building_id,
                   b.id as building_id, b.name as building_name,
                   u.id as user_id, u.full_name as user_full_name, u.email as user_email
            FROM reservations r
            LEFT JOIN amenities a ON r.amenity_id = a.id
            LEFT JOIN buildings b ON a.building_id = b.id
            LEFT JOIN users u ON r.user_id = u.id
            WHERE r.id = ?`,
      args: [id],
    });

    const r = rowToObject<any>(result);
    if (r) {
      r.amenity = {
        id: r.amenity_id,
        name_es: r.amenity_name_es,
        name_en: r.amenity_name_en,
        building_id: r.building_id,
        building: { id: r.building_id, name: r.building_name },
      };
      r.user = { id: r.user_id, full_name: r.user_full_name, email: r.user_email };
    }

    return { reservation: r, error: null };
  } catch (error: any) {
    return { reservation: null, error: { message: error.message } };
  }
};

/**
 * Update a reservation
 */
export const updateReservation = async (
  id: string,
  updates: {
    amenity_id?: string;
    reservation_date?: string;
    start_time?: string;
    end_time?: string;
    status?: string;
    notes?: string | null;
  }
) => {
  try {
    const fields: string[] = [];
    const args: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        args.push(value);
      }
    });

    fields.push('updated_at = ?');
    args.push(now());
    args.push(id);

    await db.execute({
      sql: `UPDATE reservations SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });

    return await getReservation(id);
  } catch (error: any) {
    return { reservation: null, error: { message: error.message } };
  }
};

/**
 * Delete a reservation
 */
export const deleteReservation = async (id: string) => {
  try {
    await db.execute({
      sql: 'DELETE FROM reservations WHERE id = ?',
      args: [id],
    });

    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

/**
 * Update reservation status (approve/reject/cancel)
 */
export const updateReservationStatus = async (id: string, status: string) => {
  return updateReservation(id, { status });
};

/**
 * Get published announcements for a building
 */
export const getBuildingAnnouncements = async (buildingId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM announcements WHERE building_id = ? AND is_published = 1 ORDER BY published_at DESC`,
      args: [buildingId],
    });

    const announcements = rowsToObjects<any>(result);
    return { announcements, error: null };
  } catch (error: any) {
    return { announcements: [], error: { message: error.message } };
  }
};

/**
 * Get user's incidents
 */
export const getUserIncidents = async (userId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM incidents WHERE user_id = ? ORDER BY created_at DESC`,
      args: [userId],
    });

    const incidents = rowsToObjects<any>(result);
    return { incidents, error: null };
  } catch (error: any) {
    return { incidents: [], error: { message: error.message } };
  }
};

/**
 * Create a new incident
 */
export const createIncident = async (
  userId: string,
  buildingId: string,
  type: 'maintenance' | 'complaint' | 'suggestion',
  title: string,
  description: string,
  location?: string,
  priority?: string,
  portalId?: number | null
) => {
  try {
    const id = generateUUID();
    const timestamp = now();

    await db.execute({
      sql: `INSERT INTO incidents (id, portal_id, user_id, building_id, type, title, description, location, priority, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)`,
      args: [id, portalId || null, userId, buildingId, type, title, description, location || null, priority || 'medium', timestamp, timestamp],
    });

    const result = await db.execute({
      sql: 'SELECT * FROM incidents WHERE id = ?',
      args: [id],
    });

    return { incident: rowToObject<any>(result), error: null };
  } catch (error: any) {
    return { incident: null, error: { message: error.message } };
  }
};

/**
 * Get a single amenity by portal ID
 */
export const getAmenityByPortalId = async (portalId: number) => {
  try {
    const result = await db.execute({
      sql: `SELECT a.*, b.id as building_id, b.name as building_name
            FROM amenities a
            LEFT JOIN buildings b ON a.building_id = b.id
            WHERE a.portal_id = ?`,
      args: [portalId],
    });

    const amenity = rowToObject<any>(result);
    if (amenity) {
      amenity.building = { id: amenity.building_id, name: amenity.building_name };
    }

    return { amenity, error: null };
  } catch (error: any) {
    return { amenity: null, error: { message: error.message } };
  }
};

/**
 * Update an incident
 */
export const updateIncident = async (
  id: string,
  updates: {
    title?: string;
    description?: string;
    location?: string | null;
    priority?: string | null;
    status?: 'open' | 'in_progress' | 'resolved' | 'closed';
    portal_id?: number | null;
  }
) => {
  try {
    const fields: string[] = [];
    const args: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        args.push(value);
      }
    });

    fields.push('updated_at = ?');
    args.push(now());
    args.push(id);

    await db.execute({
      sql: `UPDATE incidents SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });

    const result = await db.execute({
      sql: 'SELECT * FROM incidents WHERE id = ?',
      args: [id],
    });

    return { incident: rowToObject<any>(result), error: null };
  } catch (error: any) {
    return { incident: null, error: { message: error.message } };
  }
};

export const getBuildingPortalId = async (buildingId: string) => {
  const result = await db.execute({
    sql: 'SELECT portal_id FROM buildings WHERE id = ?',
    args: [buildingId],
  });
  const row = rowToObject<{ portal_id: number | null }>(result);
  return row?.portal_id ?? null;
};

export const getUnitPortalId = async (unitId: string) => {
  const result = await db.execute({
    sql: 'SELECT portal_id FROM units WHERE id = ?',
    args: [unitId],
  });
  const row = rowToObject<{ portal_id: number | null }>(result);
  return row?.portal_id ?? null;
};

export const getAmenityPortalId = async (amenityId: string) => {
  const result = await db.execute({
    sql: 'SELECT portal_id FROM amenities WHERE id = ?',
    args: [amenityId],
  });
  const row = rowToObject<{ portal_id: number | null }>(result);
  return row?.portal_id ?? null;
};

export const updateReservationPortalId = async (id: string, portalId: number) => {
  try {
    await db.execute({
      sql: 'UPDATE reservations SET portal_id = ?, updated_at = ? WHERE id = ?',
      args: [portalId, now(), id],
    });
    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

export const updateIncidentPortalId = async (id: string, portalId: number) => {
  try {
    await db.execute({
      sql: 'UPDATE incidents SET portal_id = ?, updated_at = ? WHERE id = ?',
      args: [portalId, now(), id],
    });
    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

/**
 * Get building documents
 */
export const getBuildingDocuments = async (buildingId: string, userId?: string) => {
  try {
    let sql = 'SELECT * FROM documents WHERE building_id = ?';
    const args: any[] = [buildingId];

    if (userId) {
      sql += ' AND (is_public = 1 OR user_id = ?)';
      args.push(userId);
    } else {
      sql += ' AND is_public = 1';
    }

    sql += ' ORDER BY created_at DESC';

    const result = await db.execute({ sql, args });
    const documents = rowsToObjects<any>(result);
    return { documents, error: null };
  } catch (error: any) {
    return { documents: [], error: { message: error.message } };
  }
};

// =====================================================
// ADMIN / USER MANAGEMENT
// =====================================================

/**
 * Get all users in a building (for admin)
 */
export const getBuildingUsers = async (buildingId: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT u.*, b.name as building_name, un.unit_number
            FROM users u
            LEFT JOIN buildings b ON u.building_id = b.id
            LEFT JOIN units un ON u.unit_id = un.id
            WHERE u.building_id = ?
            ORDER BY u.created_at DESC`,
      args: [buildingId],
    });

    const users = rowsToObjects<any>(result).map(u => ({
      ...u,
      building: { name: u.building_name },
      unit: u.unit_number ? { unit_number: u.unit_number } : null,
    }));

    return { users, error: null };
  } catch (error: any) {
    return { users: [], error: { message: error.message } };
  }
};

/**
 * Get all users (for super admin)
 */
export const getAllUsers = async () => {
  try {
    const result = await db.execute({
      sql: `SELECT u.*, b.name as building_name, un.unit_number
            FROM users u
            LEFT JOIN buildings b ON u.building_id = b.id
            LEFT JOIN units un ON u.unit_id = un.id
            ORDER BY u.created_at DESC`,
      args: [],
    });

    const users = rowsToObjects<any>(result).map(u => ({
      ...u,
      building: u.building_name ? { name: u.building_name } : null,
      unit: u.unit_number ? { unit_number: u.unit_number } : null,
    }));

    return { users, error: null };
  } catch (error: any) {
    return { users: [], error: { message: error.message } };
  }
};

/**
 * Get all buildings
 */
export const getAllBuildings = async () => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM buildings ORDER BY name',
      args: [],
    });

    const buildings = rowsToObjects<any>(result);
    return { buildings, error: null };
  } catch (error: any) {
    return { buildings: [], error: { message: error.message } };
  }
};

/**
 * Get a single building by ID
 */
export const getBuilding = async (id: string) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM buildings WHERE id = ?',
      args: [id],
    });

    const building = rowToObject<any>(result);
    return { building, error: null };
  } catch (error: any) {
    return { building: null, error: { message: error.message } };
  }
};

/**
 * Get a single building by name (case-insensitive)
 */
export const getBuildingByName = async (name: string) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM buildings WHERE LOWER(name) = LOWER(?)',
      args: [name],
    });

    const building = rowToObject<any>(result);
    return { building, error: null };
  } catch (error: any) {
    return { building: null, error: { message: error.message } };
  }
};

/**
 * Get a single building by portal ID
 */
export const getBuildingByPortalId = async (portalId: number) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM buildings WHERE portal_id = ?',
      args: [portalId],
    });

    const building = rowToObject<any>(result);
    return { building, error: null };
  } catch (error: any) {
    return { building: null, error: { message: error.message } };
  }
};

/**
 * Create a new building
 */
export const createBuilding = async (building: {
  name: string;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  total_units?: number | null;
  portal_id?: number | null;
}) => {
  try {
    const id = generateUUID();
    const timestamp = now();

    await db.execute({
      sql: `INSERT INTO buildings (id, portal_id, name, address, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, building.portal_id || null, building.name, building.address || null, timestamp, timestamp],
    });

    return await getBuilding(id);
  } catch (error: any) {
    return { building: null, error: { message: error.message } };
  }
};

/**
 * Update a building
 */
export const updateBuilding = async (
  id: string,
  updates: {
    name?: string;
    address?: string | null;
    city?: string | null;
    country?: string | null;
    total_units?: number | null;
    portal_id?: number | null;
  }
) => {
  try {
    const fields: string[] = [];
    const args: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        args.push(value);
      }
    });

    fields.push('updated_at = ?');
    args.push(now());
    args.push(id);

    await db.execute({
      sql: `UPDATE buildings SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });

    return await getBuilding(id);
  } catch (error: any) {
    return { building: null, error: { message: error.message } };
  }
};

/**
 * Delete a building
 */
export const deleteBuilding = async (id: string) => {
  try {
    await db.execute({
      sql: 'DELETE FROM buildings WHERE id = ?',
      args: [id],
    });

    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

/**
 * Get units in a building
 */
export const getBuildingUnits = async (buildingId: string) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM units WHERE building_id = ? ORDER BY unit_number',
      args: [buildingId],
    });

    const units = rowsToObjects<any>(result);
    return { units, error: null };
  } catch (error: any) {
    return { units: [], error: { message: error.message } };
  }
};

/**
 * Get all units with building info
 */
export const getAllUnits = async () => {
  try {
    const result = await db.execute({
      sql: `SELECT u.*, b.id as building_id, b.name as building_name
            FROM units u
            LEFT JOIN buildings b ON u.building_id = b.id
            ORDER BY u.unit_number`,
      args: [],
    });

    const units = rowsToObjects<any>(result).map(u => ({
      ...u,
      building: { id: u.building_id, name: u.building_name },
    }));

    return { units, error: null };
  } catch (error: any) {
    return { units: [], error: { message: error.message } };
  }
};

/**
 * Get a single unit by ID
 */
export const getUnit = async (id: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT u.*, b.id as building_id, b.name as building_name
            FROM units u
            LEFT JOIN buildings b ON u.building_id = b.id
            WHERE u.id = ?`,
      args: [id],
    });

    const unit = rowToObject<any>(result);
    if (unit) {
      unit.building = { id: unit.building_id, name: unit.building_name };
    }

    return { unit, error: null };
  } catch (error: any) {
    return { unit: null, error: { message: error.message } };
  }
};

/**
 * Get a unit by number within a building
 */
export const getUnitByNumberInBuilding = async (buildingId: string, unitNumber: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT u.*, b.id as building_id, b.name as building_name
            FROM units u
            LEFT JOIN buildings b ON u.building_id = b.id
            WHERE u.building_id = ? AND u.unit_number = ?`,
      args: [buildingId, unitNumber],
    });

    const unit = rowToObject<any>(result);
    if (unit) {
      unit.building = { id: unit.building_id, name: unit.building_name };
    }
    return { unit, error: null };
  } catch (error: any) {
    return { unit: null, error: { message: error.message } };
  }
};

/**
 * Get a single unit by portal ID
 */
export const getUnitByPortalId = async (portalId: number) => {
  try {
    const result = await db.execute({
      sql: `SELECT u.*, b.id as building_id, b.name as building_name
            FROM units u
            LEFT JOIN buildings b ON u.building_id = b.id
            WHERE u.portal_id = ?`,
      args: [portalId],
    });

    const unit = rowToObject<any>(result);
    if (unit) {
      unit.building = { id: unit.building_id, name: unit.building_name };
    }
    return { unit, error: null };
  } catch (error: any) {
    return { unit: null, error: { message: error.message } };
  }
};

/**
 * Create a new unit
 */
export const createUnit = async (unit: {
  building_id: string;
  unit_number: string;
  floor?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  area_sqm?: number | null;
  monthly_fee?: number | null;
  portal_id?: number | null;
}) => {
  try {
    const id = generateUUID();
    const timestamp = now();

    await db.execute({
      sql: `INSERT INTO units (id, building_id, portal_id, unit_number, floor, area_sqm, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, unit.building_id, unit.portal_id || null, unit.unit_number, unit.floor || null, unit.area_sqm || null, timestamp],
    });

    return await getUnit(id);
  } catch (error: any) {
    return { unit: null, error: { message: error.message } };
  }
};

/**
 * Update a unit
 */
export const updateUnit = async (
  id: string,
  updates: {
    building_id?: string;
    unit_number?: string;
    floor?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    area_sqm?: number | null;
    monthly_fee?: number | null;
    portal_id?: number | null;
  }
) => {
  try {
    const fields: string[] = [];
    const args: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        args.push(value);
      }
    });

    args.push(id);

    await db.execute({
      sql: `UPDATE units SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });

    return await getUnit(id);
  } catch (error: any) {
    return { unit: null, error: { message: error.message } };
  }
};

/**
 * Delete a unit
 */
export const deleteUnit = async (id: string) => {
  try {
    await db.execute({
      sql: 'DELETE FROM units WHERE id = ?',
      args: [id],
    });

    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

/**
 * Update user profile (role, building, unit)
 */
export const updateUserProfile = async (
  userId: string,
  updates: {
    role?: string;
    building_id?: string;
    unit_id?: string;
    full_name?: string;
  }
) => {
  try {
    const fields: string[] = [];
    const args: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        args.push(value);
      }
    });

    fields.push('updated_at = ?');
    args.push(now());
    args.push(userId);

    await db.execute({
      sql: `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });

    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [userId],
    });

    return { user: rowToObject<any>(result), error: null };
  } catch (error: any) {
    return { user: null, error: { message: error.message } };
  }
};

/**
 * Create a new user with specific role
 */
export const createUserWithRole = async (
  email: string,
  password: string,
  fullName: string,
  role: string,
  buildingId?: string,
  unitId?: string
) => {
  try {
    const id = generateUUID();
    const passwordHash = await hashPassword(password);
    const timestamp = now();

    // Check if user already exists
    const existingUser = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email],
    });

    if (existingUser.rows.length > 0) {
      return { data: null, error: { message: 'User with this email already exists' } };
    }

    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, full_name, role, building_id, unit_id, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      args: [id, email, passwordHash, fullName, role, buildingId || null, unitId || null, timestamp, timestamp],
    });

    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE id = ?',
      args: [id],
    });

    return { data: { auth: { user: { id, email } }, user: rowToObject<any>(result) }, error: null };
  } catch (error: any) {
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Delete a user (removes from users table)
 */
export const deleteUser = async (userId: string) => {
  try {
    // First delete from user_roles
    await db.execute({
      sql: 'DELETE FROM user_roles WHERE user_id = ?',
      args: [userId],
    });

    // Then delete from users table
    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?',
      args: [userId],
    });

    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

/**
 * Send password reset email (stub - not implemented without email service)
 */
export const sendPasswordResetEmail = async (email: string) => {
  // Without an email service, this is a no-op
  // In a real implementation, you would integrate with an email service
  console.log('Password reset requested for:', email);
  return { data: null, error: { message: 'Password reset via email is not available. Contact your administrator.' } };
};

// =====================================================
// USER ROLES MANAGEMENT (Multiple roles per user)
// =====================================================

/**
 * Get all roles for a user
 */
export const getUserRoles = async (userId: string) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM user_roles WHERE user_id = ? ORDER BY created_at',
      args: [userId],
    });

    const roles = rowsToObjects<any>(result);
    return { roles, error: null };
  } catch (error: any) {
    return { roles: [], error: { message: error.message } };
  }
};

/**
 * Assign a role to a user
 */
export const assignRoleToUser = async (userId: string, role: string) => {
  try {
    const id = generateUUID();
    const timestamp = now();

    await db.execute({
      sql: 'INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
      args: [id, userId, role, timestamp],
    });

    return { userRole: { id, user_id: userId, role }, error: null };
  } catch (error: any) {
    return { userRole: null, error: { message: error.message } };
  }
};

/**
 * Remove a role from a user
 */
export const removeRoleFromUser = async (userId: string, role: string) => {
  try {
    await db.execute({
      sql: 'DELETE FROM user_roles WHERE user_id = ? AND role = ?',
      args: [userId, role],
    });

    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

/**
 * Set multiple roles for a user (replaces existing roles)
 */
export const setUserRoles = async (userId: string, roles: string[]) => {
  try {
    // First, delete all existing roles for this user
    await db.execute({
      sql: 'DELETE FROM user_roles WHERE user_id = ?',
      args: [userId],
    });

    // If no roles to add, return success
    if (roles.length === 0) {
      return { error: null };
    }

    // Insert new roles
    const timestamp = now();
    for (const role of roles) {
      const id = generateUUID();
      await db.execute({
        sql: 'INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, ?)',
        args: [id, userId, role, timestamp],
      });
    }

    return { roles, error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

/**
 * Get all users with their roles
 */
export const getAllUsersWithRoles = async () => {
  try {
    const result = await db.execute({
      sql: `SELECT u.*, b.id as building_id, b.name as building_name, un.id as unit_id, un.unit_number, un.portal_id as unit_portal_id
            FROM users u
            LEFT JOIN buildings b ON u.building_id = b.id
            LEFT JOIN units un ON u.unit_id = un.id
            ORDER BY u.created_at DESC`,
      args: [],
    });

    const users = rowsToObjects<any>(result);

    // Fetch roles for each user
    for (const user of users) {
      const rolesResult = await db.execute({
        sql: 'SELECT role FROM user_roles WHERE user_id = ?',
        args: [user.id],
      });
      user.user_roles = rowsToObjects<{ role: string }>(rolesResult);
      user.building = user.building_id ? { id: user.building_id, name: user.building_name } : null;
      user.unit = user.unit_id ? { id: user.unit_id, unit_number: user.unit_number, portal_id: user.unit_portal_id ?? null } : null;
    }

    return { users, error: null };
  } catch (error: any) {
    return { users: null, error: { message: error.message } };
  }
};

// =====================================================
// REAL-TIME SUBSCRIPTIONS (Not supported in Turso)
// =====================================================

/**
 * Subscribe to new announcements (stub - polling alternative recommended)
 */
export const subscribeToAnnouncements = (
  buildingId: string,
  callback: (payload: any) => void
) => {
  console.warn('Real-time subscriptions are not supported with Turso. Consider implementing polling.');
  return { unsubscribe: () => {} };
};

/**
 * Subscribe to reservation updates (stub)
 */
export const subscribeToReservations = (
  userId: string,
  callback: (payload: any) => void
) => {
  console.warn('Real-time subscriptions are not supported with Turso. Consider implementing polling.');
  return { unsubscribe: () => {} };
};

/**
 * Subscribe to incident updates (stub)
 */
export const subscribeToIncidents = (
  userId: string,
  callback: (payload: any) => void
) => {
  console.warn('Real-time subscriptions are not supported with Turso. Consider implementing polling.');
  return { unsubscribe: () => {} };
};

// =====================================================
// STORAGE HELPERS (Not supported in Turso)
// =====================================================

/**
 * Upload a file (stub - not supported without storage service)
 */
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File
) => {
  console.warn('File storage is not supported with Turso. Consider using a separate storage service.');
  return { data: null, error: { message: 'File storage not available' } };
};

/**
 * Get public URL for a file (stub)
 */
export const getPublicUrl = (bucket: string, path: string) => {
  console.warn('File storage is not supported with Turso.');
  return '';
};

/**
 * Delete a file from storage (stub)
 */
export const deleteFile = async (bucket: string, path: string) => {
  console.warn('File storage is not supported with Turso.');
  return { data: null, error: { message: 'File storage not available' } };
};

// =====================================================
// PERMISSIONS MANAGEMENT
// =====================================================

/**
 * Get all permissions
 */
export const getAllPermissions = async () => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM permissions',
      args: [],
    });

    const permissions = rowsToObjects<any>(result);
    return { permissions, error: null };
  } catch (error: any) {
    return { permissions: [], error: { message: error.message } };
  }
};

/**
 * Get a single permission by ID
 */
export const getPermission = async (id: string) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM permissions WHERE id = ?',
      args: [id],
    });

    const permission = rowToObject<any>(result);
    return { permission, error: null };
  } catch (error: any) {
    return { permission: null, error: { message: error.message } };
  }
};

/**
 * Create a new permission
 */
export const createPermission = async (permission: {
  name: string;
  resource: string;
  action: string;
  description?: string | null;
}) => {
  try {
    const id = generateUUID();
    const timestamp = now();

    await db.execute({
      sql: `INSERT INTO permissions (id, name, resource, action, description, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, permission.name, permission.resource, permission.action, permission.description || null, timestamp],
    });

    return await getPermission(id);
  } catch (error: any) {
    return { permission: null, error: { message: error.message } };
  }
};

/**
 * Update a permission
 */
export const updatePermission = async (
  id: string,
  updates: {
    name?: string;
    resource?: string;
    action?: string;
    description?: string | null;
  }
) => {
  try {
    const fields: string[] = [];
    const args: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = ?`);
        args.push(value);
      }
    });

    args.push(id);

    await db.execute({
      sql: `UPDATE permissions SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });

    return await getPermission(id);
  } catch (error: any) {
    return { permission: null, error: { message: error.message } };
  }
};

/**
 * Delete a permission
 */
export const deletePermission = async (id: string) => {
  try {
    await db.execute({
      sql: 'DELETE FROM permissions WHERE id = ?',
      args: [id],
    });

    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

/**
 * Get permissions for a specific role
 */
export const getRolePermissions = async (role: string) => {
  try {
    const result = await db.execute({
      sql: `SELECT rp.*, p.name, p.resource, p.action, p.description
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            WHERE rp.role = ?`,
      args: [role],
    });

    const rolePermissions = rowsToObjects<any>(result).map(rp => ({
      ...rp,
      permission: { id: rp.permission_id, name: rp.name, resource: rp.resource, action: rp.action, description: rp.description },
    }));

    return { rolePermissions, error: null };
  } catch (error: any) {
    return { rolePermissions: [], error: { message: error.message } };
  }
};

/**
 * Assign a permission to a role
 */
export const assignPermissionToRole = async (role: string, permissionId: string) => {
  try {
    const id = generateUUID();
    const timestamp = now();

    await db.execute({
      sql: 'INSERT INTO role_permissions (id, role, permission_id, created_at) VALUES (?, ?, ?, ?)',
      args: [id, role, permissionId, timestamp],
    });

    return { rolePermission: { id, role, permission_id: permissionId }, error: null };
  } catch (error: any) {
    return { rolePermission: null, error: { message: error.message } };
  }
};

/**
 * Remove a permission from a role
 */
export const removePermissionFromRole = async (role: string, permissionId: string) => {
  try {
    await db.execute({
      sql: 'DELETE FROM role_permissions WHERE role = ? AND permission_id = ?',
      args: [role, permissionId],
    });

    return { error: null };
  } catch (error: any) {
    return { error: { message: error.message } };
  }
};

/**
 * Get all role permissions (for all roles)
 */
export const getAllRolePermissions = async () => {
  try {
    const result = await db.execute({
      sql: `SELECT rp.*, p.name, p.resource, p.action, p.description
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id`,
      args: [],
    });

    const rolePermissions = rowsToObjects<any>(result).map(rp => ({
      ...rp,
      permission: { id: rp.permission_id, name: rp.name, resource: rp.resource, action: rp.action, description: rp.description },
    }));

    return { rolePermissions, error: null };
  } catch (error: any) {
    return { rolePermissions: [], error: { message: error.message } };
  }
};

// Export db for direct access if needed
export { db as tursoClient };
