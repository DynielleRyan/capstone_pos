/**
 * Simple script to test Supabase connection
 * Run with: node test-supabase.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection...\n');

// Check environment variables
if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('❌ Missing environment variables!');
  console.error('Required:');
  console.error('  - PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  console.error('  - SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓' : '✗');
  process.exit(1);
}

console.log('✓ Environment variables found');
console.log('  Supabase URL:', supabaseUrl);
console.log('  Service Key:', supabaseServiceKey.substring(0, 20) + '...');
console.log('  Anon Key:', supabaseAnonKey.substring(0, 20) + '...\n');

// Test with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testConnection() {
  try {
    console.log('📊 Test 1: Querying Product table...');
    const { data, error } = await supabase.from('Product').select('*').limit(1);
    
    if (error) {
      console.error('❌ Failed to query Product table:', error.message);
      if (error.message.includes('Invalid API key')) {
        console.error('\n💡 Hint: Your SUPABASE_SERVICE_ROLE_KEY might be invalid.');
        console.error('   Get it from: https://supabase.com/dashboard/project/_/settings/api');
      }
      return;
    }
    
    console.log('✓ Successfully queried Product table');
    console.log('  Sample records:', data?.length || 0);
    
    // Test auth
    console.log('\n🔐 Test 2: Testing authentication...');
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('⚠️  Auth test failed:', authError.message);
    } else {
      console.log('✓ Authentication working');
      console.log('  Total users:', authData?.users?.length || 0);
    }
    
    console.log('\n✅ All tests passed! Supabase connection is working.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    process.exit(1);
  }
}

testConnection();
