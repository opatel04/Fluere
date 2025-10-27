# TaskSnap Backend - Codebase Structure

**Last Updated:** October 25, 2025  
**Status:** Organized and Production-Ready

---

## 📁 Directory Structure

```
backend/
├── src/                        # Source code (TypeScript)
│   ├── config/                 # Configuration & setup
│   │   ├── database.ts         # PostgreSQL connection pool
│   │   ├── env.ts              # Environment variable validation
│   │   ├── logger.ts           # Winston logger configuration
│   │   ├── redis.ts            # Redis client setup
│   │   └── schema.sql          # Database schema definition
│   │
│   ├── controllers/            # Request handlers
│   │   ├── email-processor.controller.ts
│   │   ├── gmail.controller.ts
│   │   ├── task-sort.controller.ts
│   │   └── trello.controller.ts
│   │
│   ├── services/               # Business logic
│   │   ├── ai.service.ts       # OpenAI task extraction
│   │   ├── email-processor.service.ts
│   │   ├── gmail.service.ts    # Gmail API integration
│   │   ├── task-sort.service.ts # AI-powered task sorting
│   │   └── trello.service.ts   # Trello API integration
│   │
│   ├── routes/                 # API route definitions
│   │   ├── ai.routes.ts
│   │   ├── auth.routes.ts
│   │   ├── config.routes.ts
│   │   ├── email.routes.ts
│   │   ├── index.ts            # Route aggregator
│   │   ├── process.routes.ts
│   │   ├── task-sort.routes.ts
│   │   ├── task.routes.ts
│   │   └── trello.routes.ts
│   │
│   ├── middleware/             # Express middleware
│   │   ├── errorHandler.ts     # Global error handling
│   │   └── rateLimiter.ts      # API rate limiting
│   │
│   ├── types/                  # TypeScript definitions
│   │   ├── ai.types.ts
│   │   ├── gmail.types.ts
│   │   └── trello.types.ts
│   │
│   ├── app.ts                  # Express app configuration
│   └── index.ts                # Server entry point
│
├── public/                     # Static HTML files
│   ├── oauth-dashboard.html    # OAuth management UI
│   ├── task-sort-demo.html     # Task sorting demo
│   ├── trello-callback.html    # Trello OAuth callback
│   └── README.md               # Public files documentation
│
├── tests/                      # Test files (TBD)
├── logs/                       # Application logs (auto-generated)
├── dist/                       # Compiled JavaScript (auto-generated)
│
├── .env.example                # Environment template
├── .gitignore                  # Git ignore rules
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript configuration
│
├── README.md                   # Main documentation
├── API_DOCUMENTATION.md        # API endpoint documentation
├── API_REFERENCE.md            # Detailed API reference
└── ARCHITECTURE.md             # System architecture docs
```

---

## 🎯 Key Design Principles

### 1. **Separation of Concerns**
- **Controllers**: Handle HTTP requests/responses
- **Services**: Contain business logic
- **Routes**: Define API endpoints
- **Types**: Share TypeScript interfaces

### 2. **Configuration First**
All sensitive data and environment-specific settings in `.env`:
- API keys (Gmail, Trello, OpenAI)
- Database credentials
- Service URLs
- Feature flags

### 3. **Production-Ready Features**
- ✅ Proper error handling and logging
- ✅ Rate limiting on all endpoints
- ✅ TypeScript for type safety
- ✅ Environment-based configuration
- ✅ OAuth token management
- ✅ CORS configuration

---

## 📊 File Count by Type

```
TypeScript Files:
- Controllers:  4
- Services:     5
- Routes:       9
- Types:        3
- Middleware:   2
- Config:       4
- Entry:        2
Total:         29 files

HTML Files:     3
Documentation:  5
Config:         3
```

---

## 🔄 Request Flow

```
HTTP Request
    ↓
Express App (app.ts)
    ↓
Middleware (rate limiter, CORS, helmet)
    ↓
Routes (routes/*.routes.ts)
    ↓
Controllers (controllers/*.controller.ts)
    ↓
Services (services/*.service.ts)
    ↓
External APIs / Database
    ↓
Response to Client
```

---

## 🗂️ Module Responsibilities

### **Config Module** (`src/config/`)
- Environment variable validation
- Database connection pooling
- Redis client setup
- Logger configuration
- Database schema management

### **Controllers Module** (`src/controllers/`)
- Request validation
- Response formatting
- Error handling
- HTTP status codes
- Session management

### **Services Module** (`src/services/`)
- Business logic implementation
- External API calls (Gmail, Trello, OpenAI)
- Data transformation
- Token management
- Task extraction and sorting

### **Routes Module** (`src/routes/`)
- Endpoint definitions
- HTTP method mapping
- Middleware application
- Route grouping
- Version management

### **Middleware Module** (`src/middleware/`)
- Error handling
- Rate limiting
- Authentication checks
- Request logging
- CORS policies

### **Types Module** (`src/types/`)
- TypeScript interfaces
- Type definitions
- Shared types across modules

### **Public Module** (`public/`)
- OAuth management dashboard
- Task sorting demo UI
- OAuth callback handlers

---

## 🚀 Recent Improvements

### October 25, 2025
- ✅ Moved `demo.html` → `public/task-sort-demo.html`
- ✅ Removed empty `models/` and `utils/` directories
- ✅ Removed redundant `gmail-auth.html`
- ✅ Removed duplicate documentation files
- ✅ Updated README with current structure
- ✅ Added `public/README.md` for UI documentation
- ✅ Cleaned up root directory (removed progress logs)

---

## 📝 Documentation Files

| File | Purpose |
|------|---------|
| `README.md` | Main project documentation, setup guide, API overview |
| `API_DOCUMENTATION.md` | Detailed endpoint documentation |
| `API_REFERENCE.md` | Complete API reference guide |
| `ARCHITECTURE.md` | System architecture and design decisions |
| `public/README.md` | Frontend HTML files documentation |
| `STRUCTURE.md` | This file - codebase organization |

---

## 🎨 Code Style

- **TypeScript**: Strict mode enabled
- **Naming**: camelCase for functions/variables, PascalCase for classes
- **Imports**: Absolute imports from `src/`
- **Error Handling**: Try-catch with proper logging
- **Async/Await**: Preferred over promises
- **Comments**: JSDoc for public APIs

---

## 🔐 Security

- Environment variables for all secrets
- OAuth tokens encrypted in database
- CORS configured for allowed origins
- Helmet.js for security headers
- Rate limiting on all endpoints
- Input validation on all routes

---

This structure is designed for scalability, maintainability, and production deployment.
