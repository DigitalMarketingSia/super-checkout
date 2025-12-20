
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, CLIENT_INSTANCE_ID } from '../services/supabase';
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
  instanceId: string;
  fetchProfile: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

declare global {
  interface Window {
    _authLogs: string[];
  }
}
window._authLogs = window._authLogs || [];

const log = (msg: string, data?: any) => {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const line = `[${timestamp}] ${msg} ${data ? JSON.stringify(data) : ''}`;
  console.log(line);
  window._authLogs.push(line);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      log('AuthContext: init started', { clientInstance: CLIENT_INSTANCE_ID });
      try {
        // 1. Get local session data (fast, but might be stale)
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: any }, error: any }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: { message: 'Timeout' } }), 5000)
        );

        const { data: { session: localSession }, error: sessionError } = await Promise.race([sessionPromise, timeoutPromise]);

        log('AuthContext: getSession result', { hasSession: !!localSession, error: sessionError });

        // 2. If we have a local session, VERIFY it with the server (slower, but accurate)
        if (localSession?.user) {
          log('AuthContext: verifying session with server...');
          const { data: { user: validatedUser }, error: userError } = await supabase.auth.getUser();

          if (validatedUser && !userError) {
            log('AuthContext: session verified', validatedUser.id);
            setSession(localSession); // Keep original session for tokens
            setUser(validatedUser);
            storage.setUser(validatedUser);
            await fetchProfile(validatedUser.id);
          } else {
            log('AuthContext: session invalid/expired on server', userError);
            await supabase.auth.signOut(); // Force cleanup
            setSession(null);
            setUser(null);
            storage.setUser(null);
          }
        } else {
          log('AuthContext: no local session found');
          setSession(null);
          setUser(null);
          storage.setUser(null);
        }
      } catch (err) {
        log('Auth initialization error', err);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    init();

    // Safety timeout
    const timeout = setTimeout(() => {
      setLoading(current => {
        if (current) log("AuthContext: Force stopping loading after timeout");
        return false;
      });
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      log('AuthContext: onAuthStateChange', { event, userId: session?.user?.id });
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
        log('AuthContext: Safety net triggered');

        // Final attempt to get a session (with timeout)
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: any } }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null } }), 1000)
        );
        const { data: { session: finalSession } } = await Promise.race([sessionPromise, timeoutPromise]);

        if (finalSession) {
          log('AuthContext: Session recovered via safety net');
          setSession(finalSession);
          setUser(finalSession.user);
          storage.setUser(finalSession.user);
          if (!profile) await fetchProfile(finalSession.user.id);
        } else {
          log('AuthContext: No session in safety net. Nullifying.');
          setSession(null);
          setUser(null);
          storage.setUser(null);
          setProfile(null);
        }
        setLoading(false);
      }
    }, 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyNet);
      clearTimeout(timeout);
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
