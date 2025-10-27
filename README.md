# TaskSnap API

A serverless backend API for TaskSnap, built with Cloudflare Workers. Extracts tasks from messy text using AI (OpenAI) with a rule-based fallback system and provides shareable task lists.

## Features

- 🤖 **AI-Powered Task Extraction** using OpenAI GPT-3.5-turbo
- 🛡️ **Fallback System** with rule-based extraction when AI is unavailable
- 📱 **Shareable Task Lists** with 30-day expiration
- 🎨 **Beautiful HTML Pages** with dark theme for shared tasks
- ⚡ **Serverless & Fast** powered by Cloudflare Workers
- 🌍 **Global Edge Network** for low latency worldwide

## API Endpoints

### POST /api/ai-extract
Extract tasks from text using AI or rule-based fallback.

**Request:**
```json
{
  "text": "Call client tomorrow, buy groceries friday, urgent meeting next week"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": "Personal and work tasks",
    "tasks": [
      {
        "title": "Call client tomorrow",
        "priority": "medium",
        "due": "2024-01-22",
        "tags": ["communication"],
        "confidence": 0.95
      },
      {
        "title": "Buy groceries friday",
        "priority": "medium", 
        "due": "2024-01-26",
        "tags": ["shopping"],
        "confidence": 0.90
      },
      {
        "title": "Urgent meeting next week",
        "priority": "high",
        "due": "2024-01-28",
        "tags": ["work"],
        "confidence": 0.85
      }
    ]
  },
  "stats": {
    "count": 3,
    "high": 1,
    "medium": 2,
    "low": 0,
    "dated": 3,
    "processedMs": 1250
  },
  "meta": {
    "processedAt": "2024-01-21T12:00:00.000Z",
    "processingTimeMs": 1250,
    "method": "openai"
  }
}
```

### POST /api/new
Create a shareable task list.

**Request:**
```json
{
  "summary": "Weekend Tasks",
  "tasks": [
    {
      "title": "Clean the house",
      "priority": "medium",
      "due": "2024-01-22",
      "tags": ["home"],
      "confidence": 1.0
    }
  ]
}
```

**Response:**
```json
{
  "id": "abc123def456ghij",
  "url": "/shared/abc123def456ghij",
  "expiresAt": "2024-02-20T12:00:00.000Z"
}
```

### GET /shared/{id}
View a shared task list (returns HTML page).

**Response:** Beautiful HTML page with task list, statistics, and responsive design.

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-21T12:00:00.000Z",
  "version": "1.0.0",
  "environment": "production"
}
```

## Setup Instructions

### Prerequisites
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [OpenAI API key](https://platform.openai.com/api-keys)
- Node.js and npm installed

### 1. Install Wrangler CLI
```bash
npm install -g wrangler
```

### 2. Clone and Setup Project
```bash
git clone <your-repo>
cd tasksnap-api
npm install
```

### 3. Login to Cloudflare
```bash
wrangler login
```
This opens a browser window - click "Allow" to authenticate.

### 4. Create KV Storage
```bash
wrangler kv namespace create "TASKSNAP_KV"
```
Copy the returned ID and update `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "TASKSNAP_KV"
id = "your_kv_namespace_id_here"
```

### 5. Set OpenAI API Secret
```bash
wrangler secret put OPENAI_API_KEY
```
Paste your OpenAI API key when prompted.

### 6. Deploy
```bash
# Development deployment
wrangler deploy --env development

# Production deployment  
wrangler deploy --env production
```

## Development

### Local Development
```bash
npm run dev
# or
wrangler dev
```

### Environment Variables
- `ENVIRONMENT` - Set in wrangler.toml (development/production)
- `VERSION` - Application version
- `MAX_REQUEST_SIZE` - Maximum request size in bytes
- `OPENAI_API_KEY` - OpenAI API key (secret)

### Testing Endpoints
```bash
# Test AI extraction
curl -X POST https://tasksnap-api.your-account.workers.dev/api/ai-extract \
  -H "Content-Type: application/json" \
  -d '{"text": "Call mom tomorrow, buy milk friday"}'

# Test health check
curl https://tasksnap-api.your-account.workers.dev/health
```

## Task Extraction Features

### AI Extraction (OpenAI)
- Uses GPT-3.5-turbo for cost efficiency
- Extracts: title, priority, due dates, tags, confidence
- Intelligent priority detection from urgency keywords
- Automatic date parsing (tomorrow, friday, next week, etc.)
- Context-aware tag assignment

### Rule-Based Fallback
- Activates when OpenAI is unavailable
- Splits text by lines, commas, semicolons
- Removes bullet points and cleans formatting
- Priority detection: urgent → high, later → low
- Date detection: tomorrow, weekdays, next week
- Tag detection: communication, shopping, work

### Date Intelligence
Supports natural language dates:
- "tomorrow" → Next day
- "friday", "monday", etc. → Next occurrence
- "next week" → 7 days from now
- "end of week" → Next Friday

### Priority Detection
- **High**: urgent, asap, important, critical, emergency
- **Low**: later, someday, maybe, eventually  
- **Medium**: Everything else (default)

## Error Handling

### Input Validation
- Minimum text length: 3 characters
- Maximum text length: 5000 characters
- Request size limit: 10MB

### Error Responses
```json
{
  "error": "Text too short",
  "message": "Please provide at least 3 characters of text to analyze"
}
```

### Fallback Behavior
If OpenAI fails, the system automatically falls back to rule-based extraction:
```json
{
  "success": true,
  "data": {...},
  "fallback": true,
  "message": "AI service unavailable, used rule-based extraction"
}
```

## Sharing System

### Features
- 30-day automatic expiration
- View count tracking
- Beautiful HTML pages with dark theme
- Mobile-responsive design
- Priority color coding
- Statistics dashboard

### Security
- HTML escaping prevents XSS attacks
- No sensitive data stored
- Automatic cleanup after expiration

## Troubleshooting

### Common Issues

**OpenAI API Errors**
- Check your API key is set: `wrangler secret list`
- Verify account has credits
- Check rate limits

**KV Storage Issues**
- Verify KV namespace exists: `wrangler kv:namespace list`
- Check binding name matches `wrangler.toml`
- Ensure proper permissions

**Deployment Issues**
- Run `wrangler login` if authentication fails
- Check `wrangler.toml` syntax
- Verify account limits (free tier: 100k requests/day)

**CORS Issues**
- API includes proper CORS headers
- Check browser network tab for preflight requests

### Debug Mode
Enable detailed logging:
```bash
wrangler tail --env production
```

### Performance
- Average response time: 800ms (OpenAI), 50ms (rule-based)
- Request limit: 10MB
- KV storage: 30-day TTL for shares
- Global edge caching

## Limits (Free Tier)
- 100,000 requests per day
- 10GB KV storage
- 10ms CPU time per request
- ✅ More than enough for most use cases

## License
MIT License

## Support
For issues and questions, please check the troubleshooting section above or open an issue in the repository.


