const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'your-supabase-anon-or-service-key';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 100 } }
});

console.log('[Supabase Engine] Initialized Supabase Realtime & PostgreSQL client.');

module.exports = supabase;
