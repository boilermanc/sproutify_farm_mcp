#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const farmId = '624a653c-d36b-47d6-806d-584bd6c2cfcf';

async function checkNutrientReadings() {
  console.log('Checking nutrient_readings table...\n');

  const { data, error } = await supabase
    .from('nutrient_readings')
    .select('*')
    .eq('farm_id', farmId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log(`Found ${data.length} readings`);
    if (data.length > 0) {
      console.log('\nColumns:', Object.keys(data[0]).join(', '));
      console.log('\nRecent readings:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log('No readings found for this farm');
    }
  }
}

checkNutrientReadings();
