import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Create Supabase client
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
});

// =====================================================
// AUTH HELPERS
// =====================================================

/**
 * Sign up a new user with email and password
 */
export const signUp = async (email: string, password: string, fullName: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  return { data, error };
};

/**
 * Sign in with email and password
 */
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
};

/**
 * Sign out the current user
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

/**
 * Get the current user session
 */
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
};

/**
 * Get the current user
 */
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser();
  return { user, error };
};

/**
 * Get user profile with role information
 */
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*, building:buildings(*), unit:units(*)')
    .eq('id', userId)
    .single();

  return { profile: data, error };
};

/**
 * Get all units for a user (supports multiple units per user)
 */
export const getUserUnits = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_user_units', {
    p_user_id: userId,
  });

  return { units: data, error };
};

/**
 * Check if user has a specific role
 */
export const userHasRole = async (userId: string, role: string) => {
  const { data, error } = await supabase.rpc('user_has_role', {
    p_user_id: userId,
    p_role: role,
  });

  return { hasRole: data || false, error };
};

/**
 * Get user's primary unit ID
 */
export const getUserPrimaryUnit = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_user_primary_unit', {
    p_user_id: userId,
  });

  return { primaryUnitId: data, error };
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
  const { data, error } = await supabase
    .from('user_units')
    .insert({
      user_id: userId,
      unit_id: unitId,
      is_primary: isPrimary,
      relationship_type: relationshipType,
    })
    .select()
    .single();

  return { userUnit: data, error };
};

/**
 * Remove a unit from a user
 */
export const removeUserUnit = async (userId: string, unitId: string) => {
  const { error } = await supabase
    .from('user_units')
    .delete()
    .eq('user_id', userId)
    .eq('unit_id', unitId);

  return { error };
};

/**
 * Set a unit as primary for a user
 */
export const setUserPrimaryUnit = async (userId: string, unitId: string) => {
  // First, set all units to non-primary
  await supabase
    .from('user_units')
    .update({ is_primary: false })
    .eq('user_id', userId);

  // Then set the specified unit as primary
  const { data, error } = await supabase
    .from('user_units')
    .update({ is_primary: true })
    .eq('user_id', userId)
    .eq('unit_id', unitId)
    .select()
    .single();

  return { userUnit: data, error };
};

/**
 * Add a role to a user
 */
export const addUserRole = async (userId: string, role: string) => {
  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role,
    })
    .select()
    .single();

  return { userRole: data, error };
};

/**
 * Remove a role from a user
 */
export const removeUserRole = async (userId: string, role: string) => {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role);

  return { error };
};

// =====================================================
// QUERY HELPERS
// =====================================================

/**
 * Get all payments for current user
 */
export const getUserPayments = async (userId: string) => {
  const { data, error } = await supabase
    .from('payments')
    .select('*, unit:units(unit_number)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { payments: data, error };
};

/**
 * Get all building payments (for Owners)
 */
export const getBuildingPayments = async (buildingId: string) => {
  const { data, error } = await supabase
    .from('payments')
    .select(`
      *,
      user:users(full_name, email),
      unit:units(unit_number)
    `)
    .in('unit_id',
      supabase
        .from('units')
        .select('id')
        .eq('building_id', buildingId)
    )
    .order('created_at', { ascending: false });

  return { payments: data, error };
};

/**
 * Get amenities for a building
 */
export const getBuildingAmenities = async (buildingId: string) => {
  const { data, error } = await supabase
    .from('amenities')
    .select('*')
    .eq('building_id', buildingId)
    .eq('is_active', true)
    .order('name_es');

  return { amenities: data, error };
};

/**
 * Get all amenities with building info
 */
export const getAllAmenities = async () => {
  const { data, error } = await supabase
    .from('amenities')
    .select('*, building:buildings(id, name)')
    .order('name_es');

  return { amenities: data, error };
};

/**
 * Get a single amenity by ID
 */
export const getAmenity = async (id: string) => {
  const { data, error } = await supabase
    .from('amenities')
    .select('*, building:buildings(id, name)')
    .eq('id', id)
    .single();

  return { amenity: data, error };
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
  max_capacity?: number | null;
  requires_approval?: boolean;
  is_active?: boolean;
}) => {
  const { data, error } = await supabase
    .from('amenities')
    .insert(amenity)
    .select('*, building:buildings(id, name)')
    .single();

  return { amenity: data, error };
};

/**
 * Update an amenity
 */
export const updateAmenity = async (
  id: string,
  updates: {
    building_id?: string;
    name_es?: string;
    name_en?: string | null;
    description_es?: string | null;
    description_en?: string | null;
    max_capacity?: number | null;
    requires_approval?: boolean;
    is_active?: boolean;
  }
) => {
  const { data, error } = await supabase
    .from('amenities')
    .update(updates)
    .eq('id', id)
    .select('*, building:buildings(id, name)')
    .single();

  return { amenity: data, error };
};

/**
 * Delete an amenity
 */
export const deleteAmenity = async (id: string) => {
  const { error } = await supabase
    .from('amenities')
    .delete()
    .eq('id', id);

  return { error };
};

/**
 * Get user's reservations
 */
export const getUserReservations = async (userId: string) => {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, amenity:amenities(*)')
    .eq('user_id', userId)
    .order('reservation_date', { ascending: false });

  return { reservations: data, error };
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
  notes?: string
) => {
  const { data, error } = await supabase
    .from('reservations')
    .insert({
      user_id: userId,
      amenity_id: amenityId,
      reservation_date: reservationDate,
      start_time: startTime,
      end_time: endTime,
      notes,
      status: 'pending',
    })
    .select('*, amenity:amenities(id, name_es, name_en, building_id), user:users(id, full_name, email)')
    .single();

  return { reservation: data, error };
};

/**
 * Get all reservations with amenity and user info (admin view)
 */
export const getAllReservations = async () => {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, amenity:amenities(id, name_es, name_en, building_id, building:buildings(id, name)), user:users(id, full_name, email)')
    .order('reservation_date', { ascending: false });

  return { reservations: data, error };
};

/**
 * Get reservations by building (for building admins)
 */
export const getReservationsByBuilding = async (buildingId: string) => {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, amenity:amenities!inner(id, name_es, name_en, building_id, building:buildings(id, name)), user:users(id, full_name, email)')
    .eq('amenity.building_id', buildingId)
    .order('reservation_date', { ascending: false });

  return { reservations: data, error };
};

/**
 * Get a single reservation by ID
 */
export const getReservation = async (id: string) => {
  const { data, error } = await supabase
    .from('reservations')
    .select('*, amenity:amenities(id, name_es, name_en, building_id, building:buildings(id, name)), user:users(id, full_name, email)')
    .eq('id', id)
    .single();

  return { reservation: data, error };
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
  const { data, error } = await supabase
    .from('reservations')
    .update(updates)
    .eq('id', id)
    .select('*, amenity:amenities(id, name_es, name_en, building_id, building:buildings(id, name)), user:users(id, full_name, email)')
    .single();

  return { reservation: data, error };
};

/**
 * Delete a reservation
 */
export const deleteReservation = async (id: string) => {
  const { error } = await supabase
    .from('reservations')
    .delete()
    .eq('id', id);

  return { error };
};

/**
 * Update reservation status (approve/reject/cancel)
 */
export const updateReservationStatus = async (id: string, status: string) => {
  const { data, error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', id)
    .select('*, amenity:amenities(id, name_es, name_en, building_id), user:users(id, full_name, email)')
    .single();

  return { reservation: data, error };
};

/**
 * Get published announcements for a building
 */
export const getBuildingAnnouncements = async (buildingId: string) => {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('building_id', buildingId)
    .eq('is_published', true)
    .order('published_at', { ascending: false });

  return { announcements: data, error };
};

/**
 * Get user's incidents
 */
export const getUserIncidents = async (userId: string) => {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { incidents: data, error };
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
  priority?: string
) => {
  const { data, error } = await supabase
    .from('incidents')
    .insert({
      user_id: userId,
      building_id: buildingId,
      type,
      title,
      description,
      location,
      priority,
      status: 'open',
    })
    .select()
    .single();

  return { incident: data, error };
};

/**
 * Get building documents
 */
export const getBuildingDocuments = async (buildingId: string, userId?: string) => {
  let query = supabase
    .from('documents')
    .select('*')
    .eq('building_id', buildingId);

  // If userId provided, get public docs + user's private docs
  if (userId) {
    query = query.or(`is_public.eq.true,user_id.eq.${userId}`);
  } else {
    query = query.eq('is_public', true);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  return { documents: data, error };
};

// =====================================================
// ADMIN / USER MANAGEMENT
// =====================================================

/**
 * Get all users in a building (for admin)
 */
export const getBuildingUsers = async (buildingId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*, building:buildings(name), unit:units(unit_number)')
    .eq('building_id', buildingId)
    .order('created_at', { ascending: false });

  return { users: data, error };
};

/**
 * Get all users (for super admin)
 */
export const getAllUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('*, building:buildings(name), unit:units(unit_number)')
    .order('created_at', { ascending: false });

  return { users: data, error };
};

/**
 * Get all buildings
 */
export const getAllBuildings = async () => {
  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .order('name');

  return { buildings: data, error };
};

/**
 * Get a single building by ID
 */
export const getBuilding = async (id: string) => {
  const { data, error } = await supabase
    .from('buildings')
    .select('*')
    .eq('id', id)
    .single();

  return { building: data, error };
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
}) => {
  const { data, error } = await supabase
    .from('buildings')
    .insert(building)
    .select()
    .single();

  return { building: data, error };
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
  }
) => {
  const { data, error } = await supabase
    .from('buildings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { building: data, error };
};

/**
 * Delete a building
 */
export const deleteBuilding = async (id: string) => {
  const { error } = await supabase
    .from('buildings')
    .delete()
    .eq('id', id);

  return { error };
};

/**
 * Get units in a building
 */
export const getBuildingUnits = async (buildingId: string) => {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('building_id', buildingId)
    .order('unit_number');

  return { units: data, error };
};

/**
 * Get all units with building info
 */
export const getAllUnits = async () => {
  const { data, error } = await supabase
    .from('units')
    .select('*, building:buildings(id, name)')
    .order('unit_number');

  return { units: data, error };
};

/**
 * Get a single unit by ID
 */
export const getUnit = async (id: string) => {
  const { data, error } = await supabase
    .from('units')
    .select('*, building:buildings(id, name)')
    .eq('id', id)
    .single();

  return { unit: data, error };
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
}) => {
  const { data, error } = await supabase
    .from('units')
    .insert(unit)
    .select('*, building:buildings(id, name)')
    .single();

  return { unit: data, error };
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
  }
) => {
  const { data, error } = await supabase
    .from('units')
    .update(updates)
    .eq('id', id)
    .select('*, building:buildings(id, name)')
    .single();

  return { unit: data, error };
};

/**
 * Delete a unit
 */
export const deleteUnit = async (id: string) => {
  const { error } = await supabase
    .from('units')
    .delete()
    .eq('id', id);

  return { error };
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
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  return { user: data, error };
};

/**
 * Create a new user with specific role (uses auth signup)
 * Note: This creates an auth user and profile entry
 */
export const createUserWithRole = async (
  email: string,
  password: string,
  fullName: string,
  role: string,
  buildingId?: string,
  unitId?: string
) => {
  // First, create the auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (authError) {
    return { data: null, error: authError };
  }

  if (!authData.user) {
    return { data: authData, error: null };
  }

  // Wait briefly for the trigger to create the user profile
  await new Promise(resolve => setTimeout(resolve, 500));

  // Check if trigger created the profile
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (existingUser) {
    // Trigger worked - update with role and other details
    const { data: userData, error: updateError } = await supabase
      .from('users')
      .update({
        role,
        building_id: buildingId || null,
        unit_id: unitId || null,
        full_name: fullName,
      })
      .eq('id', authData.user.id)
      .select();

    if (updateError) {
      console.error('Error updating user:', updateError);
      return { data: authData, error: updateError };
    }

    return { data: { auth: authData, user: userData?.[0] || null }, error: null };
  }

  // Trigger didn't create profile - create it directly
  console.log('Database trigger did not create profile, creating directly...');

  const { data: insertedUser, error: insertError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      email: email,
      full_name: fullName,
      role,
      building_id: buildingId || null,
      unit_id: unitId || null,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error creating user profile directly:', insertError);
    return { data: authData, error: insertError };
  }

  return { data: { auth: authData, user: insertedUser }, error: null };
};

/**
 * Delete a user (removes from users table - auth user remains)
 */
export const deleteUser = async (userId: string) => {
  // First delete from user_roles
  await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  // Then delete from users table
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  return { error };
};

/**
 * Send password reset email to a user
 * This sends an email to the user with a link to reset their password
 */
export const sendPasswordResetEmail = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  return { data, error };
};

// =====================================================
// USER ROLES MANAGEMENT (Multiple roles per user)
// =====================================================

/**
 * Get all roles for a user
 */
export const getUserRoles = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', userId)
    .order('created_at');

  return { roles: data, error };
};

/**
 * Assign a role to a user
 */
export const assignRoleToUser = async (userId: string, role: string) => {
  const { data, error } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role })
    .select()
    .single();

  return { userRole: data, error };
};

/**
 * Remove a role from a user
 */
export const removeRoleFromUser = async (userId: string, role: string) => {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
    .eq('role', role);

  return { error };
};

/**
 * Set multiple roles for a user (replaces existing roles)
 */
export const setUserRoles = async (userId: string, roles: string[]) => {
  // First, delete all existing roles for this user
  const { error: deleteError } = await supabase
    .from('user_roles')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    return { error: deleteError };
  }

  // If no roles to add, return success
  if (roles.length === 0) {
    return { error: null };
  }

  // Insert new roles
  const rolesToInsert = roles.map(role => ({
    user_id: userId,
    role
  }));

  const { data, error } = await supabase
    .from('user_roles')
    .insert(rolesToInsert)
    .select();

  return { roles: data, error };
};

/**
 * Get all users with their roles
 */
export const getAllUsersWithRoles = async () => {
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select(`
      *,
      building:buildings(id, name),
      unit:units(id, unit_number),
      user_roles(role)
    `)
    .order('created_at', { ascending: false });

  if (usersError) {
    return { users: null, error: usersError };
  }

  return { users, error: null };
};

// =====================================================
// REAL-TIME SUBSCRIPTIONS
// =====================================================

/**
 * Subscribe to new announcements
 */
export const subscribeToAnnouncements = (
  buildingId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel('announcements')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'announcements',
        filter: `building_id=eq.${buildingId}`,
      },
      callback
    )
    .subscribe();
};

/**
 * Subscribe to reservation updates
 */
export const subscribeToReservations = (
  userId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel('reservations')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reservations',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};

/**
 * Subscribe to incident updates
 */
export const subscribeToIncidents = (
  userId: string,
  callback: (payload: any) => void
) => {
  return supabase
    .channel('incidents')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'incidents',
        filter: `user_id=eq.${userId}`,
      },
      callback
    )
    .subscribe();
};

// =====================================================
// STORAGE HELPERS
// =====================================================

/**
 * Upload a file to Supabase Storage
 */
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File
) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    });

  return { data, error };
};

/**
 * Get public URL for a file
 */
export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Delete a file from storage
 */
export const deleteFile = async (bucket: string, path: string) => {
  const { data, error } = await supabase.storage.from(bucket).remove([path]);
  return { data, error };
};

// =====================================================
// PERMISSIONS MANAGEMENT
// =====================================================

/**
 * Get all permissions
 */
export const getAllPermissions = async () => {
  const { data, error } = await supabase
    .from('permissions')
    .select('*');

  return { permissions: data, error };
};

/**
 * Get a single permission by ID
 */
export const getPermission = async (id: string) => {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .eq('id', id)
    .single();

  return { permission: data, error };
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
  const { data, error } = await supabase
    .from('permissions')
    .insert(permission)
    .select()
    .single();

  return { permission: data, error };
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
  const { data, error } = await supabase
    .from('permissions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  return { permission: data, error };
};

/**
 * Delete a permission
 */
export const deletePermission = async (id: string) => {
  const { error } = await supabase
    .from('permissions')
    .delete()
    .eq('id', id);

  return { error };
};

/**
 * Get permissions for a specific role
 */
export const getRolePermissions = async (role: string) => {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*, permission:permissions(*)')
    .eq('role', role);

  return { rolePermissions: data, error };
};

/**
 * Assign a permission to a role
 */
export const assignPermissionToRole = async (role: string, permissionId: string) => {
  const { data, error } = await supabase
    .from('role_permissions')
    .insert({
      role,
      permission_id: permissionId,
    })
    .select()
    .single();

  return { rolePermission: data, error };
};

/**
 * Remove a permission from a role
 */
export const removePermissionFromRole = async (role: string, permissionId: string) => {
  const { error } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role', role)
    .eq('permission_id', permissionId);

  return { error };
};

/**
 * Get all role permissions (for all roles)
 */
export const getAllRolePermissions = async () => {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*, permission:permissions(*)');

  return { rolePermissions: data, error };
};
