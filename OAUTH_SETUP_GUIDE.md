# OAuth Integration Setup Guide

## Overview

The OAuth integration is now **fully connected** between the frontend and backend. This guide will help you configure Gmail and Trello OAuth credentials to enable the full functionality.

---

## Current Status

### ✅ **Backend OAuth Implementation**
- Gmail OAuth 2.0 endpoints (connect, callback, disconnect, status)
- Trello OAuth 1.0a endpoints (connect, callback, disconnect, status)
- Token storage in PostgreSQL (`gmail_tokens`, `trello_tokens` tables)
- Automatic token refresh for Gmail
- API endpoints ready for email fetching and Trello sync

### ✅ **Frontend OAuth Integration**
- Settings page created at `/settings`
- Gmail integration component with connection UI
- Trello integration component with connection UI
- OAuth status display and management
- Connection/disconnection workflows
- Toast notifications for user feedback
- OAuth callback handling

### ⚠️ **What Needs Configuration**
- Gmail OAuth credentials (Google Cloud Console)
- Trello OAuth credentials (Trello Developer Portal)

---

## How to Get OAuth Credentials

### 1. Gmail OAuth Setup (Google Cloud Console)

#### Step 1: Create a Google Cloud Project
1. Go to https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Name it "TaskSnap" (or your preferred name)

#### Step 2: Enable Gmail API
1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Gmail API"
3. Click on it and click "Enable"

#### Step 3: Configure OAuth Consent Screen
1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" user type (unless you have a Google Workspace)
3. Fill in the required fields:
   - App name: TaskSnap
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. Add test users (your email addresses for testing)
6. Save and continue

#### Step 4: Create OAuth Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Name: TaskSnap Backend
5. Add Authorized redirect URIs:
   - `http://localhost:3000/api/v1/auth/gmail/callback`
   - For production: `https://your-domain.com/api/v1/auth/gmail/callback`
6. Click "Create"
7. **Save the Client ID and Client Secret**

#### Step 5: Update Backend Environment Variables
Edit `/backend/.env`:
```env
GMAIL_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your_google_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3000/api/v1/auth/gmail/callback
```

---

### 2. Trello OAuth Setup (Trello Developer Portal)

#### Step 1: Get Trello API Key
1. Go to https://trello.com/power-ups/admin
2. Log in with your Trello account
3. Click "New" to create a new Power-Up
4. Fill in the details:
   - Name: TaskSnap
   - Workspace: Select your workspace
   - Email: Your email
   - Support contact: Your email
   - Author: Your name
5. Click "Create"
6. **Save the API Key shown on the page**

#### Step 2: Get API Secret (Token)
1. On the same page, find "OAuth" section
2. Click "Generate a new API Secret"
3. **Save the API Secret**

#### Step 3: Configure Allowed Origins
1. In the "Allowed Origins" section, add:
   - `http://localhost:3001`
   - `http://localhost:3000`
2. Save changes

#### Step 4: Update Backend Environment Variables
Edit `/backend/.env`:
```env
TRELLO_API_KEY=your_trello_api_key_here
TRELLO_API_SECRET=your_trello_api_secret_here
TRELLO_CALLBACK_URL=http://localhost:3000/api/v1/auth/trello/callback
```

---

## Testing the OAuth Integration

### Prerequisites
Ensure both servers are running:
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Test Gmail OAuth

1. **Navigate to Settings:**
   - Open browser: http://localhost:3001
   - Login with any email/password (test tokens used in dev)
   - Click "Settings" in the sidebar (gear icon)

2. **Connect Gmail:**
   - Click "Connect Gmail" button
   - You'll be redirected to Google's OAuth consent screen
   - Sign in with your Google account
   - Grant permissions (read emails, profile)
   - You'll be redirected back to the settings page
   - Should see "Connected as [your-email@gmail.com]"

3. **Verify Connection:**
   - Backend logs should show: "Gmail tokens saved for user"
   - Database check:
     ```sql
     SELECT * FROM gmail_tokens;
     ```
   - Status should show connected with your email

4. **Test Disconnect:**
   - Click "Disconnect" button
   - Confirm the action
   - Connection status should update to disconnected
   - Tokens removed from database

### Test Trello OAuth

1. **Navigate to Settings:**
   - Same as above, go to http://localhost:3001/settings

2. **Connect Trello:**
   - Scroll to Trello section
   - Click "Connect Trello" button
   - You'll be redirected to Trello's OAuth authorization page
   - Click "Allow" to grant permissions
   - You'll be redirected back to settings with token in URL fragment
   - Frontend extracts token and sends to backend
   - Should see "Connected as [Your Trello Name]"

3. **Verify Connection:**
   - Backend logs should show: "Trello token saved for user"
   - Database check:
     ```sql
     SELECT * FROM trello_tokens;
     ```
   - Status should show connected with your username

4. **Test Disconnect:**
   - Click "Disconnect" button
   - Confirm the action
   - Connection status should update to disconnected
   - Token removed from database

---

## Using the OAuth Integrations

### Gmail Integration Features

Once Gmail is connected, you can:

1. **Fetch Emails:**
   - API: `GET /api/v1/emails/fetch?userId={userId}&maxResults=10`
   - Frontend can call this to fetch recent emails

2. **Subscribe to Push Notifications:**
   - API: `POST /api/v1/emails/subscribe`
   - Receives real-time notifications when new emails arrive

3. **Process Emails with AI:**
   - Backend automatically processes emails
   - Extracts tasks using OpenAI/Gemini
   - Creates tasks in database

4. **View Inbound Emails:**
   - Navigate to `/emails` page in frontend
   - See all processed emails

### Trello Integration Features

Once Trello is connected, you can:

1. **View Boards:**
   - API: `GET /api/v1/trello/boards?userId={userId}`
   - Frontend can display your Trello boards

2. **Create Cards:**
   - API: `POST /api/v1/trello/cards`
   - Automatically create Trello cards from email tasks

3. **Sync Tasks:**
   - Tasks extracted from emails automatically create Trello cards
   - Configure board automation rules

4. **Board Automation:**
   - Navigate to `/automation` page
   - Configure which board/list to use for automated tasks

---

## OAuth Flow Diagrams

### Gmail OAuth Flow
```
User clicks "Connect Gmail"
    ↓
Frontend calls: GET /api/v1/auth/gmail/connect?userId={userId}
    ↓
Backend generates OAuth URL with scopes
    ↓
Browser redirects to Google OAuth consent screen
    ↓
User grants permissions
    ↓
Google redirects to: /api/v1/auth/gmail/callback?code={code}&state={userId}
    ↓
Backend exchanges code for tokens (access_token, refresh_token)
    ↓
Backend saves tokens to gmail_tokens table
    ↓
Backend redirects to: /settings?gmail=success
    ↓
Frontend shows success toast and updates status
```

### Trello OAuth Flow (Fragment-based)
```
User clicks "Connect Trello"
    ↓
Frontend calls: GET /api/v1/auth/trello/connect?userId={userId}&returnUrl={url}
    ↓
Backend generates Trello OAuth URL
    ↓
Browser redirects to Trello authorization page
    ↓
User clicks "Allow"
    ↓
Trello redirects to: /settings?trello=callback#token={token}
    ↓
Frontend JavaScript extracts token from URL fragment
    ↓
Frontend sends: GET /api/v1/auth/trello/callback?token={token}&state={userId}
    ↓
Backend saves token to trello_tokens table
    ↓
Frontend shows success toast and updates status
```

---

## Database Schema

### gmail_tokens Table
```sql
CREATE TABLE gmail_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP NOT NULL,
    email VARCHAR(255) NOT NULL,
    scopes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### trello_tokens Table
```sql
CREATE TABLE trello_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    token TEXT NOT NULL,
    username VARCHAR(255),
    full_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Troubleshooting

### Gmail Connection Issues

**Error: "Invalid redirect_uri"**
- Check `GMAIL_REDIRECT_URI` matches exactly what's in Google Cloud Console
- Must include protocol (http://) and full path

**Error: "Access denied"**
- Make sure your email is added as a test user in OAuth consent screen
- App must be in "Testing" mode for external users

**Error: "Token expired"**
- Backend automatically refreshes tokens
- Check if `refresh_token` exists in database
- May need to reconnect if refresh_token is missing

### Trello Connection Issues

**Error: "Token not found in callback"**
- Trello uses URL fragment (#token=xxx)
- Check browser console for JavaScript errors
- Ensure frontend JavaScript is extracting token correctly

**Error: "Invalid API key"**
- Verify `TRELLO_API_KEY` in backend .env
- Make sure Power-Up is active in Trello

**Error: "Token authentication failed"**
- Token might have been revoked
- Disconnect and reconnect

### General Issues

**CORS Errors:**
- Ensure backend `ALLOWED_ORIGINS` includes `http://localhost:3001`
- Check browser network tab for preflight requests

**Database Errors:**
- Ensure tables exist: `\dt` in psql
- Check foreign key constraint on `user_id`

**Frontend Not Updating:**
- Clear React Query cache
- Reload page
- Check browser console for errors

---

## Security Notes

### Production Deployment

1. **Use HTTPS:**
   - All OAuth redirects must use HTTPS in production
   - Update redirect URIs in Google/Trello consoles

2. **Environment Variables:**
   - Never commit `.env` files to git
   - Use environment variable management (Railway, Vercel, etc.)
   - Use strong `JWT_SECRET` and `SESSION_SECRET`

3. **OAuth Scopes:**
   - Gmail: Currently read-only (`gmail.readonly`)
   - To send emails, add `gmail.send` scope
   - Request minimum scopes needed

4. **Token Storage:**
   - Tokens encrypted at rest in PostgreSQL
   - Access tokens refreshed automatically
   - Tokens removed on disconnect

5. **User Privacy:**
   - Only fetch user's own emails
   - Don't share tokens between users
   - Implement proper session management

---

## Next Steps

1. **Get OAuth Credentials:**
   - Follow steps above for Gmail and Trello
   - Update backend `.env` file

2. **Restart Backend:**
   ```bash
   cd backend
   npm run dev
   ```

3. **Test Integration:**
   - Visit http://localhost:3001/settings
   - Connect Gmail
   - Connect Trello
   - Test email fetching and task creation

4. **Configure Automation:**
   - Set up board automation rules
   - Configure which Trello board to use
   - Enable email processing

5. **Production Setup:**
   - Update OAuth redirect URIs for production domain
   - Use environment variables for credentials
   - Enable HTTPS
   - Monitor logs for errors

---

## Summary

✅ OAuth integration is **fully built** and ready to use
✅ Frontend Settings page at `/settings`
✅ Backend OAuth endpoints operational
✅ Database tables created
✅ Token management and refresh logic implemented
✅ UI components for connection management

**All you need now is:**
1. Gmail OAuth credentials from Google Cloud Console
2. Trello OAuth credentials from Trello Developer Portal
3. Update the backend `.env` file
4. Restart the backend server
5. Test the connection flow!

The integration is production-ready once you add the OAuth credentials.
