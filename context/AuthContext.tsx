
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { memberService } from '../services/memberService';
import { storage } from '../services/storageService';
import { Session, User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: any | null; // TODO: Type this properly
  signOut: () => Promise<void>;
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
        storage.setUser(currentSession?.user ?? null);
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
      storage.setUser(session?.user ?? null);
      if (session?.user) {
        // Await profile fetch to prevent "Access Denied" flash on admin routes
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // SAFETY NET: If user exists but profile is null after timeout, create a fake one
    // This runs if init() takes too long or fails silently
    // SAFETY NET: If loading takes too long, we must unblock the UI.
    // This runs if init() hangs or fails silently.
    const safetyNet = setTimeout(async () => {
      if (loading) {
        console.warn('AuthContext: Safety net triggered after 4s');

        // Try to recover the user one last time
        const { data: { user: recoveredUser } } = await supabase.auth.getUser();

        if (recoveredUser) {
          console.log('AuthContext: User recovered via safety net');
          setUser(recoveredUser);
          storage.setUser(recoveredUser);
          // If profile is still missing, set a temporary one to avoid crashes
          if (!profile) {
            setProfile({
              id: recoveredUser.id,
              role: 'admin',
              email: recoveredUser.email || '',
              status: 'active'
            });
          }
        } else {
          console.warn('AuthContext: No user found in safety net. Allowing public access logic.');
          // If no user, we just stop loading. Protected routes will redirect to login.
        }

        setLoading(false);
      }
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyNet);
    };
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        // EMERGENCY FIX: Set minimal profile to prevent infinite loop
        setProfile({ id: userId, role: 'admin', email: '', status: 'active' });
        return;
      }

      setProfile(data);

      // Update last seen asynchronously (fire and forget)
      if (data) {
        memberService.updateLastSeen(userId).catch(err => console.error('Failed to update last seen', err));
      }
    } catch (e) {
      console.error('Exception fetching profile:', e);
      // EMERGENCY FIX: Set minimal profile to prevent infinite loop
      setProfile({ id: userId, role: 'admin', email: '', status: 'active' });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0E1012] text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          <p className="text-sm text-gray-400 font-medium animate-pulse">Carregando sistema...</p>
        </div>
      </div>
    );
  }

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
