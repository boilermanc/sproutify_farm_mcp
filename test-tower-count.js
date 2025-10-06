// Test script to check how many towers have growing plants
import fetch from 'node-fetch';

const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZm10a21ldGtmeXNtcW11Z2hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAxMDQ5NywiZXhwIjoyMDcyNTg2NDk3fQ.EbrYSb-d07JI7DuH92gtbUy0nAD5FfOZ9HzLkidW2eM';
const farmId = '097991c7-b481-4aeb-affe-397c75fe465d';

async function testPlantBatches() {
  try {
    console.log('🌱 Testing get_plant_batches with tower information...\n');

    const response = await fetch('http://localhost:3010/api/sage/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify({
        message: "How many towers do I have growing?",
        farmId: farmId,
        sessionId: 'test-session',
        farmName: 'Test Farm'
      })
    });

    const data = await response.json();
    console.log('📊 Response from Sage:\n');
    console.log(data.response);
    console.log('\n✅ Test completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testPlantBatches();
