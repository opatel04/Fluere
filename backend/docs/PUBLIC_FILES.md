# Public Files

This directory contains the frontend HTML pages for the TaskSnap application.

## Files

### 🔐 oauth-dashboard.html
**Purpose**: Production-level OAuth management dashboard
**URL**: `http://localhost:3000/oauth-dashboard.html`
**Features**:
- Connect/disconnect Gmail account
- Connect/disconnect Trello account
- Real-time connection status
- Automatic OAuth flow handling
- User-friendly success/error messages

**How it works**:
1. User clicks "Connect Gmail" or "Connect Trello"
2. Redirects to OAuth provider (Google/Trello)
3. After authorization, returns to dashboard
4. Automatically saves tokens and updates status

---

### 📋 task-sort-demo.html
**Purpose**: Interactive demo for task sorting API
**URL**: `http://localhost:3000/task-sort-demo.html`
**Features**:
- Manual task sorting via dropdowns (priority, date, filters)
- AI-powered natural language sorting
- Real-time timezone detection
- Sample tasks for testing
- Collapsible example prompts

**Example queries**:
- "Show me urgent tasks first"
- "Tasks due this week"
- "Give me tasks due in November"

---

### 🔄 trello-callback.html
**Purpose**: OAuth callback handler for Trello
**URL**: `http://localhost:3000/trello-callback.html`
**Features**:
- Handles Trello's fragment-based OAuth (#token=xxx)
- Extracts token from URL fragment
- Sends token to backend for storage
- Redirects back to oauth-dashboard.html
- Shows loading/success/error states

**Note**: This page is automatically used during Trello OAuth flow - users don't visit it directly.

---

## File Organization

All HTML files are served statically via Express:
```typescript
app.use(express.static(path.join(__dirname, '../public')));
```

Files are accessible directly by their filename at the root URL.
