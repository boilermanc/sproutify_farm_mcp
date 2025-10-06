import { spawn } from 'child_process';

const farmId = '097991c7-b481-4aeb-affe-397c75fe465d';

// Spawn the MCP server
const mcp = spawn('node', ['dist/index-stdio.js'], {
  env: {
    ...process.env,
    SUPABASE_URL: 'https://qffmtkmetkfysmqmughg.supabase.co',
    SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmZm10a21ldGtmeXNtcW11Z2hnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzAxMDQ5NywiZXhwIjoyMDcyNTg2NDk3fQ.EbrYSb-d07JI7DuH92gtbUy0nAD5FfOZ9HzLkidW2eM'
  }
});

mcp.stdout.on('data', (data) => {
  try {
    const response = JSON.parse(data.toString());
    console.log('\n=== RESPONSE ===');
    console.log(JSON.stringify(response, null, 2));

    // If this is the plant batches response, analyze tower data
    if (response.result && response.result.content) {
      const content = response.result.content[0];
      if (content && content.text) {
        try {
          const batches = JSON.parse(content.text);
          console.log('\n=== ANALYSIS ===');
          console.log(`Total plant batches: ${batches.length}`);

          // Count unique towers
          const towersWithPlants = new Set();
          batches.forEach(batch => {
            if (batch.towers && batch.towers.tower_number) {
              towersWithPlants.add(batch.towers.tower_number);
            }
          });

          console.log(`\n🌱 TOWERS WITH GROWING PLANTS: ${towersWithPlants.size}`);
          console.log(`Tower numbers: ${Array.from(towersWithPlants).sort((a, b) => a - b).join(', ')}`);

          // Show details by tower
          console.log('\n=== DETAILS BY TOWER ===');
          batches.forEach(batch => {
            if (batch.towers) {
              console.log(`Tower ${batch.towers.tower_number}: ${batch.seeds?.crops?.crop_name || 'Unknown crop'} - Status: ${batch.status}`);
            }
          });
        } catch (e) {
          // Response might not be JSON plant batch data
        }
      }
    }
  } catch (e) {
    console.log('STDOUT:', data.toString());
  }
});

mcp.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

mcp.on('close', (code) => {
  console.log(`\nProcess exited with code ${code}`);
});

// Wait a bit for server to start
setTimeout(() => {
  console.log('\n=== Testing get_plant_batches with tower information ===');

  const callToolRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'get_plant_batches',
      arguments: {
        farmId: farmId,
        limit: 100
      }
    }
  };

  mcp.stdin.write(JSON.stringify(callToolRequest) + '\n');

  setTimeout(() => {
    mcp.kill();
  }, 3000);
}, 1000);
