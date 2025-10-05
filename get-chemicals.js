#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl) {
  console.error('Error: SUPABASE_URL environment variable is not defined');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is not defined');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const farmId = '624a653c-d36b-47d6-806d-584bd6c2cfcf';

async function getChemicals() {
  console.log('Getting farm chemicals with details...\n');

  const { data, error } = await supabase
    .from('farm_chemicals')
    .select('*, chemical_registry(*)')
    .eq('farm_id', farmId)
    .eq('is_active', true);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} active chemicals\n`);
    console.log(JSON.stringify(data, null, 2));
  }
}

getChemicals();
