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
    .order('display_name_es');

  return { amenities: data, error };
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
    .select()
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
 * Update user profile (role, building, unit)
 */
export const updateUserProfile = async (
  userId: string,
  updates: {
    role?: string;
    building_id?: string;
    unit_id?: string;
    is_active?: boolean;
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

  // Wait a moment for the trigger to create the user profile
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Update the user profile with role, building, and unit
  if (authData.user) {
    const { data: userData, error: updateError } = await supabase
      .from('users')
      .update({
        role,
        building_id: buildingId || null,
        unit_id: unitId || null,
      })
      .eq('id', authData.user.id)
      .select()
      .single();

    if (updateError) {
      return { data: authData, error: updateError };
    }

    return { data: { auth: authData, user: userData }, error: null };
  }

  return { data: authData, error: null };
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
