import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';

interface Profile {
  id: string;
  role: AppRole;
  full_name: string | null;
  phone: string | null;
}

interface StoreAdmin {
  store_id: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  storeAdmin: StoreAdmin | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  getRedirectPath: () => string;
  isStoreAdmin: () => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [storeAdmin, setStoreAdmin] = useState<StoreAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as Profile | null;
  };

  const fetchStoreAdmin = async (userId: string) => {
    const { data, error } = await supabase
      .from('store_admins')
      .select('store_id, role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching store admin:', error);
      return null;
    }

    return data as StoreAdmin | null;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          // Use setTimeout to prevent potential race conditions
          setTimeout(async () => {
            const [profileData, storeAdminData] = await Promise.all([
              fetchProfile(currentSession.user.id),
              fetchStoreAdmin(currentSession.user.id),
            ]);
            setProfile(profileData);
            setStoreAdmin(storeAdminData);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setStoreAdmin(null);
          setLoading(false);
        }
      }
    );

    // Then get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        const [profileData, storeAdminData] = await Promise.all([
          fetchProfile(initialSession.user.id),
          fetchStoreAdmin(initialSession.user.id),
        ]);
        setProfile(profileData);
        setStoreAdmin(storeAdminData);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    // Clear all auth state immediately before calling signOut
    setUser(null);
    setSession(null);
    setProfile(null);
    setStoreAdmin(null);
    await supabase.auth.signOut();
  };

  const isSuperAdmin = (): boolean => {
    return profile?.role === 'SUPER_ADMIN';
  };

  const isStoreAdmin = (): boolean => {
    return storeAdmin !== null;
  };

  const getRedirectPath = (): string => {
    if (!profile) return '/';
    
    // Super Admin goes to super admin dashboard
    if (profile.role === 'SUPER_ADMIN') {
      return '/superadmin';
    }
    
    // Store admin goes to admin dashboard
    if (storeAdmin) {
      return '/admin';
    }
    
    // Default: customer to homepage
    return '/';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        storeAdmin,
        loading,
        signUp,
        signIn,
        signOut,
        getRedirectPath,
        isStoreAdmin,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
