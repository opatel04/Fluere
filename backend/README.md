# TaskSnap Backend API

AI-powered email to Trello integration backend service.

## Features

- 🔐 OAuth2 authentication for Gmail and Trello
- 🤖 AI-powered task extraction using OpenAI
- 📧 Automated email processing
- 📋 Smart task organization and prioritization
- 🔄 Real-time bidirectional sync with Trello
- 🚀 Background job processing with Bull Queue
- 💾 PostgreSQL for data persistence
- ⚡ Redis for caching and session management

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis
- **Queue**: Bull (Redis-based)
- **APIs**: Gmail API, Trello API, OpenAI API

## Prerequisites

Before you begin, ensure you have installed:

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+

## Installation

1. **Clone the repository** (if not already done)

2. **Install dependencies**:
```bash
cd backend
npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env
```

Then edit `.env` with your configuration:
- Database credentials
- Redis connection
- Gmail API credentials (from Google Cloud Console)
- Trello API credentials (from Trello Power-Up admin)
- OpenAI API key

4. **Set up the database**:
```bash
# Create the database
createdb tasksnap

# Run the schema
psql -d tasksnap -f src/config/schema.sql
```

5. **Start Redis** (if not already running):
```bash
redis-server
```

## Development

Start the development server with hot reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

## Building for Production

```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Authentication
- `GET /api/v1/auth/gmail/connect` - Initiate Gmail OAuth
- `GET /api/v1/auth/gmail/callback` - Gmail OAuth callback
- `GET /api/v1/auth/trello/connect` - Initiate Trello OAuth
- `GET /api/v1/auth/trello/callback` - Trello OAuth callback
- `GET /api/v1/auth/status` - Check authentication status

### Email Processing
- `POST /api/v1/emails/process` - Manually process emails
- `GET /api/v1/emails/status/:jobId?` - Check processing status
- `POST /api/v1/emails/webhook` - Gmail webhook endpoint
- `GET /api/v1/emails/list` - List processed emails

### Task Management
- `POST /api/v1/tasks/create` - Create task from chat input
- `GET /api/v1/tasks` - List all tasks
- `GET /api/v1/tasks/:id` - Get specific task
- `PUT /api/v1/tasks/:id` - Update task
- `DELETE /api/v1/tasks/:id` - Delete task
- `POST /api/v1/tasks/bulk/create` - Bulk create tasks

### Task Sorting
- `GET /api/v1/task-sort/sort/options` - Get available sort/filter options
- `POST /api/v1/task-sort/sort` - Sort and filter tasks with dropdowns
- `POST /api/v1/task-sort/sort/chat` - Sort tasks using natural language

### Trello Integration
- `GET /api/v1/trello/boards` - Get user's Trello boards
- `GET /api/v1/trello/boards/:boardId/lists` - Get board lists
- `POST /api/v1/trello/sync` - Force sync with Trello
- `GET /api/v1/trello/cards` - Get synced cards
- `POST /api/v1/trello/webhook` - Trello webhook endpoint

### AI Services
- `POST /api/v1/ai/analyze-text` - Analyze text for tasks
- `POST /api/v1/ai/extract-tasks` - Extract tasks from email
- `POST /api/v1/ai/prioritize` - Prioritize tasks
- `POST /api/v1/ai/categorize` - Categorize task
- `POST /api/v1/ai/suggest-board` - Suggest board for task

### Configuration
- `GET /api/v1/config/preferences` - Get user preferences
- `PUT /api/v1/config/preferences` - Update preferences
- `GET /api/v1/config/rules` - Get routing rules
- `POST /api/v1/config/rules` - Create routing rule
- `GET /api/v1/config/boards` - Get board mappings
- `POST /api/v1/config/boards` - Create board mapping

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   │   ├── env.ts       # Environment variables
│   │   ├── logger.ts    # Winston logger setup
│   │   ├── database.ts  # PostgreSQL connection
│   │   ├── redis.ts     # Redis connection
│   │   └── schema.sql   # Database schema
│   ├── controllers/     # Route controllers
│   │   ├── gmail.controller.ts
│   │   ├── trello.controller.ts
│   │   ├── ai.controller.ts
│   │   └── task-sort.controller.ts
│   ├── routes/          # API routes
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── email.routes.ts
│   │   ├── task.routes.ts
│   │   ├── trello.routes.ts
│   │   ├── ai.routes.ts
│   │   └── config.routes.ts
│   ├── services/        # Business logic
│   │   ├── gmail.service.ts
│   │   ├── trello.service.ts
│   │   ├── ai.service.ts
│   │   └── task-sort.service.ts
│   ├── middleware/      # Express middleware
│   │   ├── errorHandler.ts
│   │   └── rateLimiter.ts
│   ├── types/           # TypeScript type definitions
│   │   ├── ai.types.ts
│   │   └── task.types.ts
│   ├── app.ts           # Express app setup
│   └── index.ts         # Entry point
├── public/              # Static HTML files
│   ├── oauth-dashboard.html    # OAuth management UI
│   ├── task-sort-demo.html     # Task sorting demo
│   ├── trello-callback.html    # Trello OAuth callback
│   └── README.md               # Public files documentation
├── tests/               # Test files (TBD)
├── logs/                # Log files (auto-generated)
├── dist/                # Compiled JavaScript (auto-generated)
├── .env.example         # Example environment variables
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

Key environment variables (see `.env.example` for all):

```bash
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/tasksnap

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Gmail API
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_secret

# Trello API
TRELLO_API_KEY=your_api_key
TRELLO_API_SECRET=your_secret

# OpenAI
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4o-mini
```

## API Credentials Setup

### Gmail API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Gmail API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs
6. Copy Client ID and Client Secret to `.env`

### Trello API

1. Go to [Trello Power-Ups Admin](https://trello.com/power-ups/admin)
2. Create a new Power-Up
3. Get your API Key and Secret
4. Copy to `.env`

### OpenAI API

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Copy to `.env`

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm test` - Run tests (to be implemented)

## Rate Limiting

- General API: 100 requests per 15 minutes
- Auth endpoints: 5 requests per 15 minutes
- AI endpoints: 10 requests per minute

## Logging

Logs are stored in the `logs/` directory:
- `combined.log` - All logs
- `error.log` - Error logs only
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

## Security Features

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation
- Secure OAuth token storage
- Environment variable protection

## Development Tips

1. **Testing endpoints**: Use tools like Postman or Thunder Client
2. **Database migrations**: Run schema changes via `psql -d tasksnap -f migration.sql`
3. **Monitoring Redis**: Use `redis-cli` to inspect cached data
4. **Checking logs**: Tail logs with `tail -f logs/combined.log`

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running: `pg_isready`
- Check credentials in `.env`
- Verify database exists: `psql -l`

### Redis Connection Issues
- Ensure Redis is running: `redis-cli ping`
- Check Redis host/port in `.env`

### API Authentication Errors
- Verify API credentials are correct
- Check OAuth redirect URIs match
- Ensure tokens haven't expired

## Next Steps

1. ✅ Basic backend structure
2. ✅ Gmail OAuth flow
3. ✅ Trello OAuth flow
4. ✅ AI service for task extraction
5. ✅ AI-powered task sorting
6. ✅ OAuth management dashboard UI
7. 🔄 Set up background job processing
8. 🔄 Implement webhook handlers
9. 🔄 Add unit and integration tests
10. 🔄 Add API documentation (Swagger)

## Contributing

This is part of the TaskSnap open-source project. Contributions are welcome!

## License

MIT

---

**Note**: This is an independent backend API. Any frontend (React, Vue, mobile app, etc.) can consume this API.
