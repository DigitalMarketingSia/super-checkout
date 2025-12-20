
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, CLIENT_INSTANCE_ID } from '../services/supabase';
import { memberService } from '../services/memberService';
import { storage } from '../services/storageService';
import { Session, User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

import { Loading } from '../components/ui/Loading';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: any | null;
  signOut: () => Promise<void>;
  instanceId: string;
  fetchProfile: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setProfile({ id: userId, role: 'admin', email: '', status: 'active' });
        return;
      }

      setProfile(data);

      if (data) {
        memberService.updateLastSeen(userId).catch(err => console.error('Failed to update last seen', err));
      }
    } catch (e) {
      console.error('Exception fetching profile:', e);
      setProfile({ id: userId, role: 'admin', email: '', status: 'active' });
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        storage.setUser(session.user);
        fetchProfile(session.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      storage.setUser(session?.user ?? null);

      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <AuthContext.Provider value={{ session, user, profile, signOut, loading, instanceId: CLIENT_INSTANCE_ID, fetchProfile }}>
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
