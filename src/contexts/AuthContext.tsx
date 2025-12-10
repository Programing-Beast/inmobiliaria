import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, getUserProfile } from '@/lib/supabase';
import type { UserRole } from '@/lib/database.types';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  unit_id: string | null;
  building_id: string | null;
  is_active: boolean;
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

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { profile: userProfile, error } = await getUserProfile(userId);
      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }
      setProfile(userProfile);

      // Store in localStorage for backward compatibility
      if (userProfile) {
        localStorage.setItem('userRole', userProfile.role);
        localStorage.setItem('userName', userProfile.full_name);
        if (userProfile.unit_id) {
          localStorage.setItem('userUnit', userProfile.unit_id);
        }
      }
    } catch (error) {
      console.error('Error in fetchProfile:', error);
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
