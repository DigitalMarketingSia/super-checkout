// integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://xpljmuqtkdlvsbbsrmjg.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhwbGptdXF0a2RsdnNiYnNybWpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2ODIzMzEsImV4cCI6MjA2NzI1ODMzMX0.Mmcm9cuFNfdWlvUHE259HOdYWct06WuLZZqaI1YI5Ag";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
