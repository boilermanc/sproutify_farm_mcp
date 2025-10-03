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
  console.log('STDOUT:', data.toString());
});

mcp.stderr.on('data', (data) => {
  console.log('STDERR:', data.toString());
});

mcp.on('close', (code) => {
  console.log(`Process exited with code ${code}`);
});

// Wait a bit for server to start
setTimeout(() => {
  console.log('\n=== Sending list tools request ===');

  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  };

  mcp.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  setTimeout(() => {
    console.log('\n=== Sending get_farm_stats request ===');

    const callToolRequest = {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_farm_stats',
        arguments: {
          farmId: farmId
        }
      }
    };

    mcp.stdin.write(JSON.stringify(callToolRequest) + '\n');

    setTimeout(() => {
      mcp.kill();
    }, 2000);
  }, 2000);
}, 1000);
