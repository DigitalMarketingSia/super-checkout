
import { createClient } from '@supabase/supabase-js';

// Keys provided by user
const getEnv = (key: string) => {
  // In Vite (client), use import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  // In Node.js / Vercel Functions / Legacy, use process.env
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
};

// Check for both VITE_ (local/standard Vite) and NEXT_PUBLIC_ (Vercel default) prefixes
const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase URL or Anon Key missing! Check your environment variables.');
}

// Use Service Key on server if available to bypass RLS, otherwise Anon Key
const SUPABASE_KEY = (typeof window === 'undefined' && SUPABASE_SERVICE_KEY)
  ? SUPABASE_SERVICE_KEY
  : SUPABASE_ANON_KEY;

// Configure client based on environment
const clientOptions = typeof window === 'undefined'
  ? {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  }
  : {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    // Explicitly set realtime options to fallback to polling if websockets fail
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    },
    // Force Fetch implementation to ensure proper header handling on Vercel/proxies
    global: {
      fetch: (...args) => fetch(...args)
    }
  };

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, clientOptions);
