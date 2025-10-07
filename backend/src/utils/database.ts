import { createClient } from '@supabase/supabase-js';
// import dotenv from 'dotenv';

// // Load environment variables
// dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;


export const supabase = createClient(supabaseUrl, supabaseKey);

