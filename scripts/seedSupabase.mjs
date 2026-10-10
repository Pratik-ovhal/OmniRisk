import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

import { getSupabaseEnv } from './envHelper.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY } = getSupabaseEnv();

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seed() {
  console.log('--- Seeding OmniRisk Database ---');
  console.log('Authenticating as Bank Officer...');
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: 'officer@omnirisk.com',
    password: 'BankOfficer2026!'
  });

  if (authErr) {
    console.warn('Officer auth note:', authErr.message);
  } else {
    console.log('✓ Authenticated as Officer Rajesh Kumar.');
  }

  // 1. Regional Hazards
  const hazardsPath = path.resolve(__dirname, '../src/data/worldBankHazards.json');
  const hazardsData = JSON.parse(fs.readFileSync(hazardsPath, 'utf-8'));

  console.log(`Seeding ${hazardsData.length} regional hazard benchmarks...`);
  for (const h of hazardsData) {
    const { error } = await supabase
      .from('regional_hazards')
      .upsert({
        district: h.district,
        state: h.state,
        country: h.country,
        latitude: h.latitude,
        longitude: h.longitude,
        flood_hazard_index: h.flood_hazard_index,
        drought_hazard_index: h.drought_hazard_index,
        heat_stress_index: h.heat_stress_index,
        cyclone_storm_index: h.cyclone_storm_index,
      }, { onConflict: 'district,state' });

    if (error) {
      console.error(`Error inserting hazard for ${h.district}:`, error.message);
    }
  }
  console.log('✓ Regional hazards populated successfully.');

  // 2. Synthetic Borrowers
  const borrowersPath = path.resolve(__dirname, '../src/data/syntheticBorrowers.json');
  const borrowersData = JSON.parse(fs.readFileSync(borrowersPath, 'utf-8'));

  console.log(`Seeding ${borrowersData.length} synthetic borrowers...`);
  
  // First clear existing synthetic borrowers for clean rerun
  const { error: deleteErr } = await supabase
    .from('borrowers')
    .delete()
    .eq('is_synthetic', true);

  if (deleteErr) {
    console.warn('Notice on clear existing:', deleteErr.message);
  }

  // Insert borrowers
  const borrowersToInsert = borrowersData.map((b, idx) => ({
    borrower_name: b.borrower_name,
    business_name: b.business_name,
    sector: b.sector,
    sub_activity: b.sub_activity,
    district: b.district,
    state: b.state,
    latitude: b.latitude,
    longitude: b.longitude,
    soil_type: b.soil_type,
    irrigation_access: b.irrigation_access,
    utility_reliability: b.utility_reliability,
    supply_chain_resilience: b.supply_chain_resilience,
    loan_amount: b.loan_amount,
    monthly_revenue: b.monthly_revenue,
    repayment_score: b.repayment_score,
    insurance_status: b.insurance_status,
    is_synthetic: true,
    public_token: `token_${b.district.toLowerCase()}_${idx + 1}`
  }));

  const { data: insertedBorrowers, error: insertErr } = await supabase
    .from('borrowers')
    .insert(borrowersToInsert)
    .select();

  if (insertErr) {
    console.error('Error inserting borrowers:', insertErr.message);
  } else {
    console.log(`✓ Successfully inserted ${insertedBorrowers?.length || 0} synthetic borrowers into Supabase!`);
  }

  console.log('--- Database Seeding Complete ---');
}

seed().catch(err => {
  console.error('Seed script error:', err);
  process.exit(1);
});
