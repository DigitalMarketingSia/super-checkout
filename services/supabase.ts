
import { createClient } from '@supabase/supabase-js';

// Keys provided by user
const DEFAULT_URL = 'https://vixlzrmhqsbzjhpgfwdn.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpeGx6cm1ocXNiempocGdmd2RuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2NzQ5MDMsImV4cCI6MjA3OTI1MDkwM30.RBczB_Ji82DUWCVblvXEGb8U9wHQ5fxIcdkLDIaRr7k';

// Helper to get env vars safely in Vite/React
const getEnv = (key: string) => {
  // Cast to any to avoid TS error about 'env' property missing on ImportMeta
  const meta = import.meta as any;
  if (typeof meta !== 'undefined' && meta.env) {
    return meta.env[key];
  }
  return undefined;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || DEFAULT_URL;
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || DEFAULT_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
