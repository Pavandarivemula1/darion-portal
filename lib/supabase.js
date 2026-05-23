// Server-side Supabase client (used by Vercel API functions)
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tigxrqqykijkofgntway.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
  throw new Error('SUPABASE_ANON_KEY or SUPABASE_SERVICE_KEY env var is required');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Anon client (for operations that only need public access)
export const supabaseAnon = createClient(
  SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY || SUPABASE_KEY
);
