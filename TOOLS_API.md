# Sage Tools API Documentation

**Server:** `http://localhost:3002` (configurable via `TOOLS_PORT`)

The Sage Tools Server provides 5 focused API endpoints for AI agents and applications to interact with farm management systems.

---

## Available Tools

### 1. **Search Training Manual**
**Endpoint:** `POST /tools/search_manual`

Search the training manual using vector similarity search.

**Request:**
```json
{
  "query": "How do I mix nutrients?",
  "limit": 3  // optional, default: 3
}
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "content": "Training manual content...",
      "similarity": 0.85
    }
  ],
  "count": 3
}
```

---

### 2. **Get Farm Data**
**Endpoint:** `POST /tools/get_farm_data`

Query farm data from the database.

**Supported Query Types:**
- `towers` - All towers
- `plant_batches` - Plant batches with seeds/crops info
- `tower_plants` - Currently growing plants
- `seed_inventory` - Seed stock levels
- `crops` - Available crops
- `vendors` - Vendor list
- `nutrient_readings` - pH/EC readings
- `tasks` - Pending tasks

**Request:**
```json
{
  "query_type": "plant_batches",
  "farm_id": "uuid-here",
  "filters": {
    "limit": 20  // optional
  }
}
```

**Response:**
```json
{
  "success": true,
  "query_type": "plant_batches",
  "data": [ /* array of results */ ],
  "count": 15
}
```

---

### 3. **Generate Report**
**Endpoint:** `POST /tools/generate_report`

Generate printable HTML reports.

**Supported Report Types:**
- `seed_inventory` - Seed stock levels and alerts
- `tower_status` - Tower utilization and status
- `harvest` - Ready to harvest and upcoming
- `weekly_planning` - Seeding/spacing/planting schedule
- `production_summary` - 30-day harvest statistics
- `nutrient_readings` - pH & EC monitoring history
- `water_test` - Lab test results
- `spray_applications` - Chemical application logs
- `chemical_inventory` - Chemical stock levels
- `vendor_list` - Vendor directory

**Request:**
```json
{
  "report_type": "harvest",
  "farm_id": "uuid-here",
  "farm_name": "My Farm",  // optional
  "user_email": "user@farm.com"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "report_type": "Harvest Report",
  "file_path": "/path/to/report.html",
  "filename": "Harvest-Report-2025-10-06.html",
  "message": "Harvest Report generated successfully"
}
```

---

### 4. **Record Data (Conversational)**
**Endpoint:** `POST /tools/record_data`

Start or continue a conversational data entry session.

**Supported Operations:**
- Seeding
- pH/EC/Temperature readings
- Spray applications
- Harvesting

**Request:**
```json
{
  "message": "I want to seed some romaine",
  "user_id": "user@farm.com",
  "farm_id": "uuid-here",
  "farm_name": "My Farm"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "response": "Great! I'll help you record that seeding. What crop are you seeding?",
  "is_conversation_active": true
}
```

**Conversation Flow:**
1. User starts: "I want to seed some romaine"
2. System asks for crop
3. User responds: "romaine"
4. System asks for quantity
5. User responds: "100"
6. System asks for tray
7. User responds: "5"
8. System asks for date
9. User responds: "today"
10. System shows confirmation
11. User confirms: "yes"
12. System inserts to database

**Cancel anytime:** Send `"cancel"` as the message

---

### 5. **Ask Sage (Expert Knowledge)**
**Endpoint:** `POST /tools/ask_sage`

Get expert advice on farming topics.

**Topics Covered:**
- Pest management
- Disease identification
- Nutrient issues
- Environmental control
- Crop information

**Request:**
```json
{
  "question": "How do I get rid of aphids?",
  "farm_name": "My Farm"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "question": "How do I get rid of aphids?",
  "answer": "🐛 **Dealing with Aphids**\n\n**Signs to look for:**\n..."
}
```

---

## Health & Discovery

### Get Available Tools
**Endpoint:** `GET /tools`

Returns list of all available tools with descriptions and parameters.

### Health Check
**Endpoint:** `GET /health`

```json
{
  "status": "ok",
  "tools_count": 5
}
```

---

## Running the Server

### Development
```bash
npm run dev:tools
```

### Production
```bash
npm run build
npm run start:tools
```

### Environment Variables
- `TOOLS_PORT` - Port number (default: 3002)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service key
- `OPENAI_API_KEY` - OpenAI API key for vector search

---

## Integration with n8n

Each tool can be configured as an HTTP Request node in n8n:

**Example: Generate Report Tool**
```
Method: POST
URL: http://localhost:3002/tools/generate_report
Body:
{
  "report_type": "{{ $json.report_type }}",
  "farm_id": "{{ $json.farm_id }}",
  "farm_name": "{{ $json.farm_name }}"
}
```

**Example: Conversational Data Entry**
```
Method: POST
URL: http://localhost:3002/tools/record_data
Body:
{
  "message": "{{ $json.user_message }}",
  "user_id": "{{ $json.user_email }}",
  "farm_id": "{{ $json.farm_id }}"
}
```

---

## Error Handling

All tools return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad request (missing parameters)
- `500` - Server error

---

## Benefits of Tools Architecture

✅ **Focused & Simple** - Each tool does one thing well
✅ **Easy Integration** - Simple HTTP POST requests
✅ **Clear Responses** - Structured JSON outputs
✅ **AI-Friendly** - Perfect for LLM function calling
✅ **Scalable** - Add new tools easily
✅ **Testable** - Each tool can be tested independently
