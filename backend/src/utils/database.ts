import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

// Service role client for admin operations (backend only)
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-client-info': 'capstone-pos-backend'
    }
  },
  // Increase timeout to handle larger queries
  realtime: {
    timeout: 60000
  }
});

// Anon client for client-side operations (frontend)
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

