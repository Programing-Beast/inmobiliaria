import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, getUserProfile, getUserUnits, getUserRoles, signIn, signUp as signUpUser, signOut as signOutUser, updateUserPasswordByEmail, activateUserByEmail } from '@/lib/supabase';
import { clearPortalAuth, portalLogin, portalRegister, syncPortalRoleToLocalUser, syncPortalPropertiesToTurso } from "@/lib/portal-api";
import type { UserRole } from '@/lib/database.types';

interface UserUnit {
  unit_id: string;
  unit_number: string;
  building_id: string;
  building_name: string;
  portal_id?: number | null;
  is_primary: boolean;
  relationship_type: string;
  floor: number | null;
  area_sqm: number | null;
}

interface User {
  id: string;
  email: string | null;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  unit_id: string | null;
  building_id: string | null;
  is_active: boolean;
  // New fields for multiple units and roles
  units?: UserUnit[];
  roles?: UserRole[];
  currentUnit?: UserUnit | null;
  portalProperties?: { idPropiedad: number; nombre: string }[];
}

interface Session {
  user: User;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
  setCurrentUnit: (unit: UserUnit) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile with units and roles
  const fetchProfile = async (userId: string) => {
    try {
      const [
        { profile: userProfile, error: profileError },
        { units, error: unitsError },
        { roles, error: rolesError }
      ] = await Promise.all([
        getUserProfile(userId),
        getUserUnits(userId),
        getUserRoles(userId)
      ]);

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
        return;
      }

      if (!userProfile) {
        console.error('No profile found for user:', userId);
        return;
      }

      // Extract roles from the roles array
      const userRoles = roles?.map((r: any) => r.role) || [userProfile.role];

      // Combine all data
      const enhancedProfile: UserProfile = {
        ...userProfile,
        units: units || [],
        roles: userRoles,
        currentUnit: units?.find((u: UserUnit) => u.is_primary) || units?.[0] || null,
      };

      // Load portal properties if available
      const storedProperties = localStorage.getItem('userProperties');
      if (storedProperties) {
        try {
          enhancedProfile.portalProperties = JSON.parse(storedProperties);
        } catch (e) {
          console.error('Error parsing stored portal properties:', e);
        }
      }

      setProfile(enhancedProfile);

      // Store in localStorage for backward compatibility
      if (enhancedProfile) {
        // Store primary role (for backward compatibility)
        localStorage.setItem('userRole', enhancedProfile.role);
        localStorage.setItem('userName', enhancedProfile.full_name);

        // Store current unit
        if (enhancedProfile.currentUnit) {
          localStorage.setItem('userUnit', enhancedProfile.currentUnit.unit_id);
          localStorage.setItem('currentUnitNumber', enhancedProfile.currentUnit.unit_number);
        }

        // Store all units and roles as JSON
        localStorage.setItem('userUnits', JSON.stringify(enhancedProfile.units));
        localStorage.setItem('userRoles', JSON.stringify(enhancedProfile.roles));
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
    }
  };

  // Set current unit
  const setCurrentUnit = (unit: UserUnit) => {
    if (profile) {
      const updatedProfile = {
        ...profile,
        currentUnit: unit,
        building_id: unit.building_id,
        unit_id: unit.unit_id,
      };
      setProfile(updatedProfile);

      // Update localStorage
      localStorage.setItem('userUnit', unit.unit_id);
      localStorage.setItem('currentUnitNumber', unit.unit_number);
    }
  };

  // Initialize auth state
  useEffect(() => {
    // Check for existing session in localStorage
    const userId = localStorage.getItem('currentUserId');
    const userEmail = localStorage.getItem('currentUserEmail');

    if (userId && userEmail) {
      const currentUser = { id: userId, email: userEmail };
      setUser(currentUser);
      setSession({ user: currentUser });
      fetchProfile(userId);
    }

    setLoading(false);

    // Listen for storage changes (for multi-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'currentUserId') {
        if (e.newValue) {
          const newUser = { id: e.newValue, email: localStorage.getItem('currentUserEmail') };
          setUser(newUser);
          setSession({ user: newUser });
          fetchProfile(e.newValue);
        } else {
          setUser(null);
          setSession(null);
          setProfile(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Sign up function
  const handleSignUp = async (email: string, password: string, fullName: string) => {
    try {
      console.log("[AuthContext] Registration started for:", email);
      
      // 1. First register in the portal API
      const portalResult = await portalRegister({ 
        nombreCompleto: fullName, 
        correo: email, 
        password 
      });

      if (portalResult.error) {
        console.error("[AuthContext] Portal registration failed:", portalResult.error);
        return { error: portalResult.error };
      }

      console.log("[AuthContext] Portal registration successful:", portalResult.data);

      // 2. Then register in local Turso database
      const { data, error } = await signUpUser(email, password, fullName);

      if (error) {
        console.error("[AuthContext] Local registration failed:", error);
        return { error };
      }

      console.log("[AuthContext] Local registration successful");

      // No auto-login for new registrations as they are PENDING
      console.log("[AuthContext] Registration complete - user is PENDING");
      return { error: null };
    } catch (error: any) {
      console.error("[AuthContext] Unexpected sign-up error:", error);
      return { error };
    }
  };

  // Sign in function — KOVE is the auth source of truth
  const handleSignIn = async (email: string, password: string) => {
    try {
      const portalResult = await portalLogin(email, password, { reason: "primary-auth" });

      if (portalResult.error) {
        return { error: { message: 'Invalid email or password' } };
      }

      // Portal accepted — activate user in Turso and sync password hash
      await activateUserByEmail(email);
      await updateUserPasswordByEmail(email, password);

      const { data, error } = await signIn(email, password);

      if (error || !data?.user) {
        return { error: error || { message: 'Local auth sync failed after portal login' } };
      }

      // currentUserId is now set in localStorage by signIn() — re-run role sync with explicit userId
      // (the earlier call inside portalLogin() silently no-oped because currentUserId wasn't set yet)
      const portalRole = portalResult.data?.data?.rol;
      await syncPortalRoleToLocalUser(portalRole, data.user.id);

      // Sync KOVE building assignment to Turso users.building_id
      const portalProperties = portalResult.data?.data?.propiedades;
      if (portalProperties?.length) {
        await syncPortalPropertiesToTurso(portalProperties, data.user.id);
        localStorage.setItem('userProperties', JSON.stringify(portalProperties));
      }

      const newUser = { id: data.user.id, email: data.user.email || email };
      setUser(newUser);
      setSession({ user: newUser });
      await fetchProfile(data.user.id);

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  // Sign out function
  const handleSignOut = async () => {
    try {
      const { error } = await signOutUser();

      // Clear state
      setUser(null);
      setSession(null);
      setProfile(null);
      clearPortalAuth();

      // Clear localStorage
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUserEmail');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userUnit');
      localStorage.removeItem('currentUnitNumber');
      localStorage.removeItem('userUnits');
      localStorage.removeItem('userRoles');

      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  // Refresh profile manually
  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp: handleSignUp,
    signIn: handleSignIn,
    signOut: handleSignOut,
    refreshProfile,
    setCurrentUnit,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
