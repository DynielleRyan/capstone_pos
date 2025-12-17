/**
 * ============================================================================
 * DATABASE UTILITY - utils/database.ts
 * ============================================================================
 * 
 * This file configures and exports Supabase database clients.
 * 
 * SUPABASE CLIENTS:
 * 1. supabase (Service Role): Backend-only, full database access
 * 2. supabaseAnon (Anon Key): Frontend/client-side, limited access
 * 
 * SERVICE ROLE KEY:
 * - Has full access to database (bypasses Row Level Security)
 * - Can perform admin operations (create users, etc.)
 * - NEVER expose this key to frontend/client-side code
 * - Used only in backend server
 * 
 * ANON KEY:
 * - Limited access based on Row Level Security policies
 * - Safe to use in frontend/client-side code
 * - Used for client-side Supabase operations
 * 
 * CONFIGURATION:
 * - Environment variables loaded from .env file
 * - Timeout set to 60 seconds for large queries
 * - No session persistence (backend doesn't need it)
 */

// Import Supabase client library
import { createClient } from '@supabase/supabase-js';

// Import dotenv to load environment variables
import dotenv from 'dotenv';

// Load environment variables from .env file
// Makes process.env variables available (SUPABASE_URL, etc.)
dotenv.config();

/**
 * ============================================================================
 * ENVIRONMENT VARIABLES
 * ============================================================================
 * 
 * These values come from the .env file in the backend directory
 * 
 * PUBLIC_SUPABASE_URL:
 *   - Your Supabase project URL
 *   - Format: https://xxxxx.supabase.co
 * 
 * SUPABASE_SERVICE_ROLE_KEY:
 *   - Service role key (admin access)
 *   - Format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *   - NEVER expose to frontend
 * 
 * SUPABASE_ANON_KEY:
 *   - Anonymous key (public access)
 *   - Format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *   - Safe to use in frontend
 * 
 * The ! operator tells TypeScript these values will definitely exist
 * (they're required for the app to work)
 */
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

/**
 * ============================================================================
 * SERVICE ROLE CLIENT (Backend Only)
 * ============================================================================
 * 
 * This client has full database access and is used for all backend operations.
 * 
 * FEATURES:
 * - Full database access (bypasses Row Level Security)
 * - Can perform admin operations (create users, etc.)
 * - No session persistence (backend doesn't need it)
 * - No auto token refresh (not needed for service role)
 * 
 * USAGE:
 * import { supabase } from './utils/database';
 * const { data, error } = await supabase.from('Product').select('*');
 * 
 * SECURITY:
 * - This key should NEVER be exposed to frontend
 * - Only used in backend server code
 * - Has admin-level access to all tables
 */
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  // Authentication configuration
  auth: {
    autoRefreshToken: false,  // Don't auto-refresh (not needed for service role)
    persistSession: false      // Don't persist session (backend doesn't need it)
  },
  // Database configuration
  db: {
    schema: 'public'  // Use public schema (default)
  },
  // Global headers
  global: {
    headers: {
      'x-client-info': 'capstone-pos-backend'  // Identify this client in logs
    }
  },
  // Realtime configuration
  realtime: {
    timeout: 60000  // 60 second timeout for large queries
  }
});

/**
 * ============================================================================
 * ANON CLIENT (For Client-Side Operations)
 * ============================================================================
 * 
 * This client has limited access and is safe to use in frontend code.
 * 
 * FEATURES:
 * - Limited access based on Row Level Security policies
 * - Safe to use in frontend/client-side code
 * - Can be used for client-side Supabase operations
 * 
 * USAGE:
 * import { supabaseAnon } from './utils/database';
 * const { data, error } = await supabaseAnon.from('Product').select('*');
 * 
 * NOTE:
 * - Currently not used in backend (we use service role client)
 * - Could be used if you need to simulate client-side access in backend
 * - Frontend has its own Supabase client configuration
 */
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

