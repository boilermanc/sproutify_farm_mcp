#!/usr/bin/env node
import 'dotenv/config';

const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const PORT = process.env.PORT || 3010;
const BASE_URL = `http://localhost:${PORT}`;

async function testSageChat(message, farmId = null, farmName = 'Test Farm') {
  const requestBody = {
    message,
    farmId,
    farmName,
    sessionId: 'test-session-' + Date.now()
  };

  console.log('\n=== Testing Sage Chat ===');
  console.log('Message:', message);
  console.log('Farm ID:', farmId || 'none');
  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/api/sage/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    console.log('\nResponse Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error:', errorText);
      return;
    }

    const data = await response.json();
    console.log('\n=== Sage Response ===');
    console.log(data.response);
    console.log('\nSession ID:', data.sessionId);
    console.log('Timestamp:', data.timestamp);
  } catch (error) {
    console.error('Request failed:', error.message);
  }
}

// Run tests
const testMessage = process.argv[2] || "What's seeded?";
const testFarmId = process.argv[3] || '624a653c-d36b-47d6-806d-584bd6c2cfcf';

testSageChat(testMessage, testFarmId);
