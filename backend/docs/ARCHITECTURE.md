# TaskSnap Backend Architecture

## Overview

This document describes the architecture and design decisions for the TaskSnap backend API.

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│          (Any frontend: React, Vue, Mobile, etc.)           │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Express.js API Server                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Middleware Layer                                     │  │
│  │  - CORS, Helmet, Rate Limiting, Error Handling       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Routes Layer                                         │  │
│  │  - /auth   - /emails  - /tasks                       │  │
│  │  - /trello - /ai      - /config                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Controllers Layer                                    │  │
│  │  - Business logic orchestration                      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Services Layer                                       │  │
│  │  - Gmail Service   - Trello Service                  │  │
│  │  - OpenAI Service  - Auth Service                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────┬───────────────┬───────────────┬──────────────┘
              │               │               │
              ▼               ▼               ▼
      ┌──────────────┐ ┌────────────┐ ┌────────────┐
      │  PostgreSQL  │ │   Redis    │ │ Bull Queue │
      │   Database   │ │   Cache    │ │  Workers   │
      └──────────────┘ └────────────┘ └────────────┘
              │               │               │
              └───────────────┴───────────────┘
                          │
                          ▼
              ┌──────────────────────────┐
              │    External Services     │
              │  - Gmail API             │
              │  - Trello API            │
              │  - OpenAI API            │
              └──────────────────────────┘
```

## Directory Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── env.ts          # Environment variables management
│   │   ├── logger.ts       # Winston logger configuration
│   │   ├── database.ts     # PostgreSQL connection pool
│   │   ├── redis.ts        # Redis client and cache helpers
│   │   └── schema.sql      # Database schema definition
│   │
│   ├── middleware/          # Express middleware
│   │   ├── errorHandler.ts # Global error handling
│   │   └── rateLimiter.ts  # Rate limiting configuration
│   │
│   ├── routes/              # API route definitions
│   │   ├── index.ts        # Route aggregator
│   │   ├── auth.routes.ts  # Authentication endpoints
│   │   ├── email.routes.ts # Email processing endpoints
│   │   ├── task.routes.ts  # Task management endpoints
│   │   ├── trello.routes.ts # Trello integration endpoints
│   │   ├── ai.routes.ts    # AI service endpoints
│   │   └── config.routes.ts # Configuration endpoints
│   │
│   ├── controllers/         # Route handlers (to be implemented)
│   │   ├── auth.controller.ts
│   │   ├── email.controller.ts
│   │   ├── task.controller.ts
│   │   ├── trello.controller.ts
│   │   ├── ai.controller.ts
│   │   └── config.controller.ts
│   │
│   ├── services/            # Business logic (to be implemented)
│   │   ├── gmail.service.ts
│   │   ├── trello.service.ts
│   │   ├── openai.service.ts
│   │   ├── auth.service.ts
│   │   └── queue.service.ts
│   │
│   ├── models/              # Database models (to be implemented)
│   │   ├── user.model.ts
│   │   ├── email.model.ts
│   │   ├── task.model.ts
│   │   └── trello.model.ts
│   │
│   ├── types/               # TypeScript type definitions
│   │   └── (custom types to be added)
│   │
│   ├── utils/               # Utility functions
│   │   └── (helpers to be added)
│   │
│   ├── app.ts              # Express app configuration
│   └── index.ts            # Application entry point
│
├── tests/                   # Test files (to be implemented)
├── logs/                    # Log files (auto-generated)
├── dist/                    # Compiled JavaScript (auto-generated)
├── .env                     # Environment variables
├── .env.example            # Example environment variables
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── README.md               # Main documentation
├── QUICKSTART.md           # Quick start guide
└── ARCHITECTURE.md         # This file
```

## Design Patterns

### Layered Architecture

1. **Routes Layer**: HTTP endpoint definitions
2. **Controllers Layer**: Request/response handling
3. **Services Layer**: Business logic
4. **Models Layer**: Data access

### Dependency Injection

- Services are injected into controllers
- Database connections are injected into models
- Configuration is centralized in `config/`

### Error Handling

- Custom `AppError` class for operational errors
- Global error handler middleware
- Async error wrapper for route handlers
- Structured logging for debugging

## API Design

### RESTful Principles

- Resource-based URLs
- HTTP methods (GET, POST, PUT, DELETE)
- Standard status codes
- JSON request/response format

### Versioning

- URL-based versioning: `/api/v1/`
- Allows for backward compatibility

### Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

## Security

### Authentication

- OAuth2 for Gmail (googleapis)
- OAuth 1.0a for Trello
- JWT for session management

### Security Measures

- Helmet.js for HTTP headers
- CORS configuration
- Rate limiting (per endpoint)
- Input validation
- SQL injection prevention (parameterized queries)
- XSS protection

## Database Design

### Key Tables

1. **users** - User accounts and OAuth tokens
2. **user_preferences** - Organization style and settings
3. **emails** - Processed emails
4. **tasks** - All tasks (from emails and manual)
5. **trello_boards** - Synced Trello boards
6. **trello_cards** - Card sync status
7. **task_rules** - Routing rules
8. **ai_analysis** - AI processing metadata

### Relationships

- One user has many tasks
- One email can have many tasks
- One task can sync to one Trello card
- One user has many Trello boards

### Indexes

- User ID on all user-related tables
- Processing status for querying
- Timestamps for time-based queries
- Unique constraints on external IDs

## Caching Strategy

### Redis Usage

1. **Session Storage**: User sessions and tokens
2. **API Response Cache**: Frequently accessed data
3. **Rate Limiting**: Request tracking
4. **Queue Management**: Job queue with Bull

### Cache Invalidation

- Time-based expiration (TTL)
- Event-based invalidation
- Manual flush for critical updates

## Background Processing

### Job Types

1. **Email Processing**: Parse and extract tasks
2. **AI Analysis**: Task extraction and prioritization
3. **Trello Sync**: Bidirectional synchronization
4. **Webhook Handling**: Real-time updates

### Queue Management

- Bull Queue with Redis backend
- Job priority levels
- Retry logic with exponential backoff
- Job status tracking

## Logging

### Log Levels

- **error**: Critical issues
- **warn**: Warning messages
- **info**: General information
- **debug**: Detailed debugging

### Log Storage

- Console (development)
- File system (production)
- Structured logging (JSON format)

## Scalability Considerations

### Horizontal Scaling

- Stateless API servers
- Shared Redis cache
- Connection pooling for database

### Performance Optimization

- Database query optimization
- Response caching
- Lazy loading
- Pagination for large datasets

### Rate Limiting

- Per-user limits
- Per-endpoint limits
- Stricter limits for expensive operations (AI)

## External Service Integration

### Gmail API

- OAuth2 authentication
- Push notifications (Pub/Sub)
- Email fetching and parsing
- Automatic token refresh

### Trello API

- OAuth 1.0a authentication
- CRUD operations on boards/lists/cards
- Webhook subscriptions
- Bidirectional sync

### OpenAI API

- GPT-4o-mini for task extraction
- Prompt engineering for accuracy
- Token usage monitoring
- Error handling and retries

## Development Workflow

### Local Development

1. Install dependencies: `npm install`
2. Set up environment: Copy `.env.example` to `.env`
3. Start database: PostgreSQL and Redis
4. Run migrations: `psql -d tasksnap -f src/config/schema.sql`
5. Start server: `npm run dev`

### Testing

- Unit tests for services
- Integration tests for API endpoints
- E2E tests for critical flows
- Mock external API calls

### Deployment

1. Build: `npm run build`
2. Set environment variables
3. Run migrations
4. Start server: `npm start`
5. Monitor logs and metrics

## Future Enhancements

### Phase 2 Features

- [ ] Real-time webhooks implementation
- [ ] Advanced AI features (sentiment analysis)
- [ ] Multiple board support
- [ ] Smart routing rules engine
- [ ] Analytics and insights

### Phase 3 Features

- [ ] GraphQL API option
- [ ] WebSocket support for real-time updates
- [ ] Multi-tenant support
- [ ] Advanced monitoring and alerting
- [ ] API documentation (Swagger/OpenAPI)

## Configuration Management

### Environment Variables

All configuration is managed through environment variables:
- Database credentials
- API keys and secrets
- Feature flags
- Rate limits

### Secrets Management

- Never commit secrets to git
- Use `.env` file locally
- Use environment variables in production
- Consider using secret management services

## Monitoring and Observability

### Health Checks

- `/health` endpoint for liveness
- Database connection check
- Redis connection check
- External API connectivity

### Metrics (Future)

- Request rate and latency
- Error rates
- Queue depth
- Database query performance

### Alerting (Future)

- Error threshold alerts
- Performance degradation alerts
- Service unavailability alerts

## Contributing

When adding new features:

1. Follow the layered architecture
2. Add appropriate error handling
3. Include logging
4. Write tests
5. Update documentation

## Notes

This backend is designed to be **frontend-agnostic**. Any client (web, mobile, desktop) can consume this API by making HTTP requests to the endpoints.

The architecture supports both **synchronous** (REST API) and **asynchronous** (webhooks, background jobs) processing patterns.
