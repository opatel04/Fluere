# TaskSnap Project Structure

This document shows the complete organization of the TaskSnap project.

## 📁 Directory Tree

```
tasksnap/
│
├── 📄 PROJECT_README.md           # Main project documentation (START HERE)
├── 📄 README.md                    # Original README
├── 📄 TaskSnap_Project_Plan.md    # Complete 8-week development plan
├── 📄 STRUCTURE.md                 # This file - project organization
├── 📄 .gitignore                   # Git ignore rules
│
├── 📁 backend/                     # ✅ BACKEND API (Independent REST API)
│   │
│   ├── 📄 README.md               # Backend documentation
│   ├── 📄 QUICKSTART.md           # 5-minute setup guide
│   ├── 📄 ARCHITECTURE.md         # System architecture & design
│   ├── 📄 STATUS.md               # Current status & next steps
│   ├── 📄 API_REFERENCE.md        # Complete API documentation
│   │
│   ├── 📄 package.json            # Node.js dependencies
│   ├── 📄 tsconfig.json           # TypeScript configuration
│   ├── 📄 .env.example            # Environment variables template
│   ├── 📄 .env                    # Environment variables (ignored by git)
│   ├── 📄 .gitignore              # Backend-specific ignores
│   │
│   ├── 📁 src/                    # Source code
│   │   │
│   │   ├── 📁 config/             # ✅ Configuration
│   │   │   ├── env.ts            # Environment variable management
│   │   │   ├── logger.ts         # Winston logger setup
│   │   │   ├── database.ts       # PostgreSQL connection pool
│   │   │   ├── redis.ts          # Redis client & cache utilities
│   │   │   └── schema.sql        # Database schema (11 tables)
│   │   │
│   │   ├── 📁 middleware/         # ✅ Express middleware
│   │   │   ├── errorHandler.ts  # Global error handling
│   │   │   └── rateLimiter.ts   # Rate limiting configuration
│   │   │
│   │   ├── 📁 routes/             # ✅ API routes (40+ endpoints)
│   │   │   ├── index.ts          # Route aggregator
│   │   │   ├── auth.routes.ts    # Authentication (Gmail & Trello OAuth)
│   │   │   ├── email.routes.ts   # Email processing
│   │   │   ├── task.routes.ts    # Task management (CRUD)
│   │   │   ├── trello.routes.ts  # Trello integration
│   │   │   ├── ai.routes.ts      # AI services (task extraction)
│   │   │   └── config.routes.ts  # User configuration
│   │   │
│   │   ├── 📁 controllers/        # ⏳ Route handlers (to be implemented)
│   │   │   ├── auth.controller.ts
│   │   │   ├── email.controller.ts
│   │   │   ├── task.controller.ts
│   │   │   ├── trello.controller.ts
│   │   │   ├── ai.controller.ts
│   │   │   └── config.controller.ts
│   │   │
│   │   ├── 📁 services/           # ⏳ Business logic (to be implemented)
│   │   │   ├── gmail.service.ts
│   │   │   ├── trello.service.ts
│   │   │   ├── openai.service.ts
│   │   │   ├── auth.service.ts
│   │   │   └── queue.service.ts
│   │   │
│   │   ├── 📁 models/             # ⏳ Database models (to be implemented)
│   │   │   ├── user.model.ts
│   │   │   ├── email.model.ts
│   │   │   ├── task.model.ts
│   │   │   └── trello.model.ts
│   │   │
│   │   ├── 📁 types/              # ⏳ TypeScript type definitions
│   │   │   └── (to be added)
│   │   │
│   │   ├── 📁 utils/              # ⏳ Utility functions
│   │   │   └── (to be added)
│   │   │
│   │   ├── 📄 app.ts              # ✅ Express app configuration
│   │   └── 📄 index.ts            # ✅ Application entry point
│   │
│   ├── 📁 dist/                   # ✅ Compiled JavaScript (auto-generated)
│   ├── 📁 tests/                  # ⏳ Test files (to be implemented)
│   ├── 📁 logs/                   # 📝 Log files (auto-generated)
│   └── 📁 node_modules/           # Dependencies (ignored by git)
│
└── 📁 landing-page/                # ⚡ FRONTEND (Landing Page)
    │
    ├── 📄 README.md               # Landing page documentation
    ├── 📄 package.json            # Dependencies
    ├── 📄 wrangler.toml           # Cloudflare Workers config
    ├── 📄 .env.example            # Environment variables
    │
    ├── 📄 index.html              # Main landing page
    ├── 📄 styles.css              # CSS styles
    ├── 📄 script.js               # Main JavaScript
    ├── 📄 demo-script.js          # Demo functionality
    ├── 📄 test-api.html           # API testing page
    │
    ├── 📁 images/                 # Image assets
    ├── 📁 icons/                  # Icon files
    ├── 📁 videos/                 # Video assets
    ├── 📁 libs/                   # Third-party libraries
    ├── 📁 docs/                   # Additional documentation
    ├── 📁 src/                    # Source files
    ├── 📁 .wrangler/              # Wrangler cache (ignored)
    └── 📁 node_modules/           # Dependencies (ignored)
```

## 🎯 Key Components

### Backend (`/backend`)

**Status**: ✅ Foundation Complete

The backend is a fully independent REST API that can be consumed by any frontend.

**What's Complete:**
- ✅ Full project structure
- ✅ TypeScript configuration
- ✅ Express server setup
- ✅ Database schema (11 tables)
- ✅ API routes (40+ endpoints)
- ✅ Middleware (error handling, rate limiting)
- ✅ Configuration management
- ✅ Comprehensive documentation

**What's Next:**
- ⏳ Implement controllers
- ⏳ Build services (Gmail, Trello, OpenAI)
- ⏳ Create database models
- ⏳ Add background job processing
- ⏳ Implement webhooks

**Port**: 3000 (default)
**API Base**: `http://localhost:3000/api/v1`

### Landing Page (`/landing-page`)

**Status**: ⚡ Existing Landing Page

This is the current HTML/CSS/JS landing page. You can:
- Keep and enhance it
- Replace it with React/Vue/Next.js
- Build a mobile app
- Create any frontend you want

The backend is completely independent and serves JSON over HTTP.

**Port**: 8000 (when running locally)

## 📋 Database Schema

Located at: `backend/src/config/schema.sql`

**11 Tables:**
1. `users` - User accounts and OAuth tokens
2. `user_preferences` - User settings
3. `emails` - Processed emails
4. `email_tasks` - Tasks extracted from emails
5. `tasks` - All tasks (email + manual)
6. `task_rules` - Custom routing rules
7. `trello_boards` - Synced Trello boards
8. `trello_lists` - Board lists
9. `trello_cards` - Card sync status
10. `ai_analysis` - AI processing metadata
11. `processing_jobs` - Background job tracking

## 🚀 API Endpoints

All endpoints are under `/api/v1/`

### Categories:
- **Authentication** (7 endpoints) - Gmail & Trello OAuth
- **Email Processing** (4 endpoints) - Email handling & webhooks
- **Task Management** (6 endpoints) - CRUD operations
- **Trello Integration** (6 endpoints) - Board/card sync
- **AI Services** (5 endpoints) - Task extraction & analysis
- **Configuration** (10 endpoints) - User preferences & rules

**Total**: 40+ endpoints

See `backend/API_REFERENCE.md` for complete documentation.

## 📚 Documentation Files

### Root Level
- `PROJECT_README.md` - **Start here!** Main project overview
- `TaskSnap_Project_Plan.md` - Complete 8-week development plan
- `STRUCTURE.md` - This file (project organization)
- `README.md` - Original README

### Backend Documentation
- `backend/README.md` - Backend overview
- `backend/QUICKSTART.md` - 5-minute setup guide
- `backend/ARCHITECTURE.md` - System architecture
- `backend/STATUS.md` - Current status & roadmap
- `backend/API_REFERENCE.md` - API documentation

### Frontend Documentation
- `landing-page/README.md` - Landing page docs

## 🔧 Quick Commands

### Backend

```bash
cd backend

# Install
npm install

# Development
npm run dev

# Build
npm run build

# Production
npm start
```

### Landing Page

```bash
cd landing-page

# Install
npm install

# Run local server
python -m http.server 8000
# or
npx http-server -p 8000
```

## 🎯 Getting Started

1. **Read**: `PROJECT_README.md` for overview
2. **Backend Setup**: Follow `backend/QUICKSTART.md`
3. **Understand API**: Read `backend/API_REFERENCE.md`
4. **Start Building**: Check `backend/STATUS.md` for next steps

## ✅ Completed vs ⏳ To Do

### Backend
- ✅ Project structure
- ✅ Configuration setup
- ✅ Database schema
- ✅ API routes
- ✅ Middleware
- ✅ Documentation
- ⏳ Controllers implementation
- ⏳ Services implementation
- ⏳ Models implementation
- ⏳ Tests
- ⏳ Webhooks

### Overall Project
- ✅ Backend foundation
- ✅ Database design
- ✅ API structure
- ✅ Documentation
- ⏳ Feature implementation
- ⏳ Frontend enhancement
- ⏳ Testing
- ⏳ Deployment

## 🎨 Frontend Options

The backend is **frontend-agnostic**. You can build:

1. **Keep HTML/CSS/JS** - Enhance the current landing page
2. **React** - Build a React SPA
3. **Next.js** - Full-stack React framework
4. **Vue** - Vue.js application
5. **Mobile** - React Native, Flutter
6. **Desktop** - Electron app

The backend serves JSON via REST API - use any client you want!

## 🔗 Connecting Frontend to Backend

Your frontend will make HTTP requests:

```javascript
// Example: Fetch tasks
fetch('http://localhost:3000/api/v1/tasks')
  .then(res => res.json())
  .then(data => console.log(data))

// Example: Create task
fetch('http://localhost:3000/api/v1/tasks/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'My task' })
})
```

## 📊 Current Status

**Date**: October 21, 2024

**Backend**: ✅ Foundation Complete (Ready for feature implementation)
**Frontend**: ⚡ Landing page exists (Can be replaced/enhanced)
**Database**: ✅ Schema designed (Ready to deploy)
**Documentation**: ✅ Comprehensive (40+ pages)

**Next Phase**: Start implementing features (OAuth, Email Processing, AI Integration)

---

**Note**: This is a clean, organized project structure with backend and frontend separated. The backend is production-ready infrastructure waiting for feature implementation!
