/**
 * ============================================================================
 * DATABASE UTILITY - Supabase Client Configuration
 * ============================================================================
 * 
 * This file creates and configures Supabase database clients for backend use.
 * Supabase uses two types of API keys with different permission levels:
 * 
 * SERVICE ROLE KEY (Admin Access):
 * - Bypasses all Row Level Security (RLS) policies
 * - Has full database access (read, write, delete)
 * - Can perform admin operations (create users, manage auth)
 * - CRITICAL: Never expose this key to frontend or client-side code
 * - Used exclusively in backend server for all database operations
 * 
 * ANON KEY (Limited Access):
 * - Respects Row Level Security policies
 * - Limited to what RLS policies allow
 * - Safe to use in frontend/client-side code
 * - Currently unused in backend (frontend has its own client)
 * 
 * WHY TWO CLIENTS?
 * The service role client gives us full control for backend operations, while
 * the anon client could be used to test RLS policies or simulate client access.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

/**
 * Load Environment Variables
 * 
 * dotenv.config() reads the .env file and populates process.env with the values.
 * This must be called before accessing environment variables. The .env file
 * contains sensitive credentials that should never be committed to version control.
 */
dotenv.config();

/**
 * Environment Variable Configuration
 * 
 * These values are loaded from the .env file and are required for the application
 * to function. The ! operator (non-null assertion) tells TypeScript we're certain
 * these values exist, which is safe because the app will fail immediately if they're
 * missing, making the check unnecessary.
 * 
 * SECURITY NOTE: These values are never exposed to the frontend. The service role
 * key especially must remain secret - if exposed, an attacker would have full
 * database access.
 */
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

/**
 * Service Role Client (Primary Database Client)
 * 
 * This is the main Supabase client used throughout the backend. It has admin-level
 * access, meaning it bypasses all Row Level Security policies and can perform
 * any operation on any table.
 * 
 * CONFIGURATION EXPLANATION:
 * 
 * auth.autoRefreshToken: false
 *   Service role keys don't expire, so token refresh isn't needed. This is
 *   different from user sessions which do expire and need refreshing.
 * 
 * auth.persistSession: false
 *   Backend servers are stateless and don't need to persist sessions. Each
 *   request is independent, unlike frontend apps that maintain user sessions.
 * 
 * db.schema: 'public'
 *   Uses the public PostgreSQL schema, which is the default. All our tables
 *   are in this schema.
 * 
 * global.headers: 'x-client-info'
 *   Identifies this client in Supabase logs, making it easier to distinguish
 *   backend requests from frontend requests when debugging.
 * 
 * realtime.timeout: 60000
 *   Sets a 60-second timeout for realtime subscriptions. This prevents long-running
 *   queries from hanging indefinitely. For regular queries, this doesn't apply.
 * 
 * USAGE EXAMPLE:
 *   import { supabase } from './utils/database';
 *   const { data, error } = await supabase
 *     .from('Product')
 *     .select('*')
 *     .eq('IsActive', true);
 */
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
  realtime: {
    timeout: 60000
  }
});

/**
 * Anonymous Client (Limited Access)
 * 
 * This client uses the anon key, which respects Row Level Security policies.
 * It's included here for potential use cases like:
 * - Testing RLS policies from the backend
 * - Simulating client-side access for debugging
 * - Performing operations that should respect security policies
 * 
 * CURRENT STATUS: Not actively used in the backend. The frontend has its own
 * Supabase client configuration that uses the anon key. This client is kept
 * for potential future use or testing scenarios.
 * 
 * SECURITY: The anon key is safe to expose (it's meant for client-side use),
 * but it still has limited permissions based on RLS policies configured in
 * Supabase.
 */
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

