
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: any | null; // TODO: Type this properly with Profile interface
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      console.log('AuthContext: init started');
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log('AuthContext: session retrieved', currentSession?.user?.id);
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          console.log('AuthContext: fetching profile...');
          await fetchProfile(currentSession.user.id);
          console.log('AuthContext: profile fetched');
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        console.log('AuthContext: init finally - setting loading false');
        setLoading(false);
      }
    };

    init();

    // Safety timeout
    const timeout = setTimeout(() => {
      setLoading(current => {
        if (current) console.warn("AuthContext: Force stopping loading after timeout");
        return false;
      });
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: onAuthStateChange', event);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        // Fire and forget profile fetch to avoid blocking UI
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) console.error('Error fetching profile:', error);
      setProfile(data);
    } catch (e) {
      console.error('Exception fetching profile:', e);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, signOut, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
