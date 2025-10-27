# TaskSnap - AI-Powered Email to Trello Integration

Open-source alternative to expensive Trello Power-Ups that automatically transforms Gmail emails into organized Trello tasks using AI-powered extraction and smart prioritization.

## 🚀 Project Overview

**TaskSnap** helps you automatically convert emails into actionable Trello tasks using AI. It's a free, open-source alternative to expensive Trello Power-Ups that gives you complete control over your data and workflow.

### Key Features

- 🔐 **Gmail Integration** - Automatic email processing with OAuth2
- 🤖 **AI-Powered** - Smart task extraction using OpenAI
- 📋 **Trello Sync** - Bidirectional synchronization with Trello boards
- ⚡ **Real-time** - Webhook support for instant processing
- 🎯 **Smart Organization** - Auto-categorize by priority, timeline, person, or department
- 🔓 **Open Source** - Free forever, you control your data

## 📁 Project Structure

This repository is organized into two main parts:

```
tasksnap/
├── backend/              # Independent REST API (Node.js + TypeScript)
│   ├── src/
│   │   ├── config/      # Environment, database, Redis, logger
│   │   ├── routes/      # API endpoints (auth, emails, tasks, trello, ai, config)
│   │   ├── middleware/  # Error handling, rate limiting
│   │   ├── controllers/ # Business logic (to be implemented)
│   │   ├── services/    # External API integrations (to be implemented)
│   │   └── models/      # Database models (to be implemented)
│   ├── README.md        # Backend documentation
│   ├── QUICKSTART.md    # 5-minute setup guide
│   ├── ARCHITECTURE.md  # System design
│   ├── STATUS.md        # Current status & next steps
│   └── API_REFERENCE.md # Complete API documentation
│
├── landing-page/         # Landing page (HTML/CSS/JS)
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── README.md
│
├── TaskSnap_Project_Plan.md  # Complete project planning document
└── PROJECT_README.md          # This file
```

## 🏗️ Architecture

### Backend (Independent REST API)

The backend is a **standalone Node.js/Express API** that can be consumed by any frontend:

- **Tech Stack**: Node.js, Express, TypeScript, PostgreSQL, Redis
- **APIs**: Gmail API, Trello API, OpenAI API
- **Features**: OAuth authentication, background job processing, webhooks
- **Status**: ✅ Foundation complete, ready for feature implementation

**Location**: `/backend`

### Frontend (Flexible)

The current landing page is just a placeholder. You can:
- Use the existing HTML/CSS/JS landing page
- Build a React/Vue/Next.js frontend
- Create a mobile app
- Build a desktop application

The backend API is frontend-agnostic and serves JSON over HTTP.

**Location**: `/landing-page`

## 🚀 Quick Start

### Backend Setup

1. **Navigate to backend**:
```bash
cd backend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment**:
```bash
cp .env.example .env
# Edit .env with your API credentials
```

4. **Set up database**:
```bash
createdb tasksnap
psql -d tasksnap -f src/config/schema.sql
```

5. **Start server**:
```bash
npm run dev
```

Server runs on `http://localhost:3000`

**For detailed setup**: See `/backend/QUICKSTART.md`

### Frontend Setup

1. **Navigate to landing page**:
```bash
cd landing-page
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start local server**:
```bash
python -m http.server 8000
# or
npx http-server -p 8000
```

4. **Open browser**:
```
http://localhost:8000
```

## 📖 Documentation

### Backend Documentation

- **[Backend README](backend/README.md)** - Complete backend documentation
- **[Quick Start Guide](backend/QUICKSTART.md)** - Get running in 5 minutes
- **[Architecture](backend/ARCHITECTURE.md)** - System design and patterns
- **[API Reference](backend/API_REFERENCE.md)** - All API endpoints
- **[Status](backend/STATUS.md)** - Current progress and next steps

### Project Planning

- **[Project Plan](TaskSnap_Project_Plan.md)** - Complete 8-week development plan
  - Market analysis
  - Technical research
  - Feature specifications
  - Timeline and milestones

### Landing Page

- **[Landing Page README](landing-page/README.md)** - Frontend documentation

## 🔑 API Credentials Required

To run TaskSnap, you'll need API credentials from:

1. **Google Cloud Console** - for Gmail API
   - https://console.cloud.google.com/
   - Enable Gmail API
   - Create OAuth 2.0 credentials

2. **Trello** - for Trello API
   - https://trello.com/power-ups/admin
   - Get API Key and Secret

3. **OpenAI** - for AI task extraction
   - https://platform.openai.com/
   - Create API key

All credentials go in `backend/.env` file.

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL 14+
- **Cache**: Redis 6+
- **Queue**: Bull (Redis-based)
- **APIs**: Gmail, Trello, OpenAI
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate limiting

### Frontend (Flexible)
- Current: HTML/CSS/JavaScript
- Options: React, Vue, Next.js, Mobile, Desktop

## 📊 Current Status

**Backend**: ✅ Foundation Complete (October 21, 2024)
- ✅ Project structure and configuration
- ✅ Database schema (11 tables)
- ✅ API route structure (40+ endpoints)
- ✅ Middleware (error handling, rate limiting, security)
- ✅ Comprehensive documentation
- ⏳ Controllers, services, and models (next phase)

**Frontend**: ⏳ Landing page exists, ready for enhancement

See [backend/STATUS.md](backend/STATUS.md) for detailed status.

## 🗓️ Development Timeline

Based on the project plan:

- **Week 1-3**: MVP Core (Auth, Email Processing, Basic UI)
- **Week 4-6**: Enhanced Features (Real-time, Smart routing, Advanced AI)
- **Week 7-8**: Production Ready (Testing, Security, Docker, Launch)

See [TaskSnap_Project_Plan.md](TaskSnap_Project_Plan.md) for complete timeline.

## 🎯 Next Steps

### For Backend Development

1. Implement Gmail OAuth flow
2. Implement Trello OAuth flow
3. Build AI service for task extraction
4. Create email processing pipeline
5. Set up background job queue
6. Implement webhooks

See [backend/STATUS.md](backend/STATUS.md) for detailed roadmap.

### For Frontend Development

You can:
1. Use the current landing page as-is
2. Build a React/Vue/Next.js application
3. Create a mobile app
4. Build whatever interface you want!

The backend API serves JSON and works with any frontend.

## 🔌 How It Works

```
┌─────────────┐
│   Gmail     │─────┐
└─────────────┘     │
                    ▼
              ┌─────────────┐
              │  TaskSnap   │
              │   Backend   │◄────┐
              │     API     │     │
              └─────────────┘     │
                    │             │
                    ▼             │
              ┌─────────────┐     │
              │   OpenAI    │─────┘
              │ (Extract    │
              │   Tasks)    │
              └─────────────┘
                    │
                    ▼
              ┌─────────────┐
              │   Trello    │
              │   Boards    │
              └─────────────┘
```

1. **Email arrives** in Gmail
2. **Backend processes** email via Gmail API
3. **AI extracts** tasks using OpenAI
4. **Smart routing** applies user rules
5. **Trello sync** creates cards in the right boards

## 🔒 Security & Privacy

- OAuth2 for Gmail, OAuth 1.0a for Trello
- Encrypted token storage
- No permanent email storage (processed and discarded)
- User controls their own Trello data
- Open source = transparent and auditable

## 💰 Why Open Source?

### vs Expensive Trello Power-Ups ($50+/month)
- ✅ Free forever (self-hosted)
- ✅ Full customization
- ✅ No vendor lock-in
- ✅ Complete data ownership
- ✅ Transparent AI algorithms

## 🤝 Contributing

This project is in active development. Contributions welcome!

1. Check [backend/STATUS.md](backend/STATUS.md) for current needs
2. Pick a feature from the roadmap
3. Follow the architecture in [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md)
4. Submit a pull request

## 📄 License

MIT License - Free to use, modify, and distribute

## 📞 Support

- **Documentation**: Check the `/backend` folder for comprehensive docs
- **Issues**: Report bugs and feature requests on GitHub
- **Questions**: See documentation or open an issue

---

## 🎯 Quick Links

- **[Backend Setup](backend/QUICKSTART.md)** - Get the API running
- **[API Reference](backend/API_REFERENCE.md)** - All endpoints
- **[Project Plan](TaskSnap_Project_Plan.md)** - Full 8-week plan
- **[Architecture](backend/ARCHITECTURE.md)** - System design

---

**Last Updated**: October 21, 2024
**Current Phase**: Backend Foundation Complete ✅
**Next Phase**: Feature Implementation 🔄

---

Built with ❤️ as an open-source alternative to expensive Trello Power-Ups
