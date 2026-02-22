const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables!');
  console.error('SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.error('SUPABASE_SERVICE_KEY:', supabaseKey ? '✓ Set' : '✗ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Supabase client initialized');

module.exports = supabase;