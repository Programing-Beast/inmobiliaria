import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getUserProfile, getUserUnits, getUserRoles } from '@/lib/supabase';
import type { UserRole } from '@/lib/database.types';

interface UserUnit {
  unit_id: string;
  unit_number: string;
  building_id: string;
  building_name: string;
  is_primary: boolean;
  relationship_type: string;
  floor: number | null;
  area_sqm: number | null;
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

      // Combine all data
      const enhancedProfile: UserProfile = {
        ...userProfile,
        units: units || [],
        roles: roles || [userProfile.role],
        currentUnit: units?.find(u => u.is_primary) || units?.[0] || null,
      };

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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        // Clear localStorage
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userUnit');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign up function
  const handleSignUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  // Sign in function
  const handleSignIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (error: any) {
      return { error };
    }
  };

  // Sign out function
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();

      // Clear localStorage
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userUnit');

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
