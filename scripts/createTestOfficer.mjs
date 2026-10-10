import { createClient } from '@supabase/supabase-js';

import { getSupabaseEnv } from './envHelper.mjs';

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseEnv();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const email = 'officer@omnirisk.com';
  const password = 'BankOfficer2026!';
  
  console.log(`Creating test bank officer: ${email}...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Rajesh Kumar (Lead Risk Officer)',
        bank_name: 'State Bank Rural & Agri Division',
        branch_code: 'SME-MUM-402'
      }
    }
  });

  if (error) {
    console.error('Error creating officer:', error.message);
    process.exit(1);
  }

  console.log('Officer created successfully:', data.user?.id);
  
  // Also insert or upsert profile
  if (data.user?.id) {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: data.user.id,
        full_name: 'Rajesh Kumar (Lead Risk Officer)',
        bank_name: 'State Bank Rural & Agri Division',
        branch_code: 'SME-MUM-402',
        role: 'bank_officer'
      });
    if (profileError) {
      console.warn('Profile notice:', profileError.message);
    } else {
      console.log('Profile created successfully in profiles table');
    }
  }
}

run();
