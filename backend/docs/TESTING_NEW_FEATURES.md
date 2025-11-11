# Testing New Features

This guide will help you test all the new features added to TaskSnap.

## Features to Test

1. ✅ **Scheduled jobs** - Every 4 hours + Daily 8 AM
2. ✅ **Follow-up detection** - Intelligent urgency scoring
3. ✅ **Daily AI summaries** - OpenAI-powered briefings
4. ✅ **Chatbot API** - Manual task extraction
5. ✅ **Task acceptance flow** - Preview → Edit → Accept/Reject

## Prerequisites

### 1. Environment Setup

Make sure you have all required environment variables:

```bash
# OpenAI (required for summaries and chatbot)
OPENAI_API_KEY=your_openai_key

# Redis (required for scheduled jobs)
REDIS_HOST=localhost
REDIS_PORT=6379

# Email notifications
RESEND_API_KEY=your_resend_key
NOTIFICATION_EMAIL_FROM=noreply@yourdomain.com

# Database
DATABASE_URL=your_database_url
```

### 2. Start the Services

You need to run THREE separate processes:

#### Terminal 1: Main API Server
```bash
cd backend
npm run dev
```

#### Terminal 2: Worker Process (for scheduled jobs)
```bash
cd backend
npm run dev:worker
```

#### Terminal 3: Redis (if not already running)
```bash
redis-server
```

## Running Tests

### Quick Test (All Features)

```bash
cd backend
npx ts-node scripts/test-new-features.ts
```

This will test:
- ✅ Scheduled job configuration
- ✅ Follow-up detection and urgency scoring
- ✅ Manual task extraction from text
- ✅ Task acceptance/rejection/editing flow

### Manual Testing

#### 1. Test Scheduled Jobs

**Check logs when server starts:**
```
✅ Should see: "Follow-up scanner scheduled: every 4 hours"
✅ Should see: "Daily summary generator scheduled: every day at 8:00 AM UTC"
✅ Should see: "All scheduled jobs initialized successfully"
```

**Check worker logs:**
```
✅ Should see: "Scheduled worker started and listening for jobs"
```

#### 2. Test Follow-up Detection

**Trigger manual detection:**
```bash
curl -X POST http://localhost:5014/api/v1/follow-ups/detect \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -d '{"thresholdDays": 2}'
```

**Get all follow-ups:**
```bash
curl http://localhost:5014/api/v1/follow-ups?status=pending \
  -H "x-user-id: YOUR_USER_ID"
```

**Get urgent follow-ups (urgency >= 7):**
```bash
curl http://localhost:5014/api/v1/follow-ups/urgent \
  -H "x-user-id: YOUR_USER_ID"
```

**Get statistics:**
```bash
curl http://localhost:5014/api/v1/follow-ups/stats \
  -H "x-user-id: YOUR_USER_ID"
```

**Dismiss a follow-up:**
```bash
curl -X POST http://localhost:5014/api/v1/follow-ups/FOLLOW_UP_ID/dismiss \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -d '{"reason": "Already handled"}'
```

**Expected Results:**
- ✅ Should detect emails that haven't been responded to in 2+ days
- ✅ Each follow-up should have an urgency score (1-10)
- ✅ Should show client name, email, and snippet
- ✅ Urgent follow-ups (score >= 7) should appear in urgent list

#### 3. Test Daily AI Summaries

**Note:** This is automatically triggered at 8 AM UTC by the scheduler.

**To test manually, you can:**
1. Check if `user_preferences` table exists and has `daily_summary_enabled = true`
2. Wait for 8 AM UTC or modify the cron schedule to test sooner
3. Check email inbox for daily briefing

**What the summary includes:**
- Tasks due today/tomorrow/this week
- Overdue tasks count
- Pending and urgent follow-ups
- Active clients and at-risk clients
- AI-generated personalized briefing
- Recent tasks list
- Urgent follow-ups to action
- At-risk clients to check on

#### 4. Test Chatbot/Manual Task Extraction

**Extract tasks from text:**
```bash
curl -X POST http://localhost:5014/api/v1/ai/extract-manual \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -d '{
    "text": "I need to finish the website redesign by Friday. Also review the client feedback and schedule a meeting next week.",
    "context": "general_notes"
  }'
```

**Expected Results:**
- ✅ Should extract multiple tasks from the text
- ✅ Each task should have title, description, priority
- ✅ Should suggest Trello boards and lists
- ✅ Should return available boards/lists for user to choose
- ✅ Tasks are NOT created yet - just suggestions

**Valid contexts:** `email`, `meeting_notes`, `general_notes`, `chat`

#### 5. Test Task Acceptance Flow

**Step 1: Extract tasks (see above)**

**Step 2: Edit a suggestion:**
```bash
curl -X PUT http://localhost:5014/api/v1/ai/edit-suggestion/TEMP_ID \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -d '{
    "title": "Updated title",
    "description": "Updated description",
    "priority": "high",
    "boardId": "BOARD_ID",
    "listId": "LIST_ID"
  }'
```

**Step 3: Accept tasks:**
```bash
curl -X POST http://localhost:5014/api/v1/ai/accept-tasks \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -d '{
    "tasks": [
      {
        "title": "Task 1",
        "description": "Description",
        "priority": "high",
        "boardId": "BOARD_ID",
        "listId": "LIST_ID",
        "clientId": "CLIENT_ID"
      }
    ]
  }'
```

**Step 4: Reject tasks:**
```bash
curl -X POST http://localhost:5014/api/v1/ai/reject-tasks \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID" \
  -d '{
    "taskIds": ["temp-123", "temp-456"],
    "reason": "Not relevant"
  }'
```

**Expected Flow:**
1. User pastes text → API extracts task suggestions
2. User sees preview with suggested board/list
3. User can edit title, description, priority, board, list
4. User clicks accept → Tasks saved to database
5. User clicks reject → Tasks dismissed (logged for analytics)

## Verification Checklist

### Scheduled Jobs
- [ ] Server logs show "Scheduled jobs initialized successfully"
- [ ] Worker logs show "Scheduled worker started"
- [ ] Follow-up scanner runs every 4 hours
- [ ] Daily summary runs every day at 8 AM UTC

### Follow-up Detection
- [ ] Can manually trigger detection
- [ ] Creates follow-ups for unanswered emails (2+ days)
- [ ] Calculates urgency scores (1-10)
- [ ] Shows urgent follow-ups (score >= 7)
- [ ] Can dismiss follow-ups
- [ ] Can mark as responded
- [ ] Statistics endpoint works

### Daily AI Summaries
- [ ] Summary generated once per day
- [ ] Includes all required metrics
- [ ] AI generates personalized briefing
- [ ] Email sent to user
- [ ] Respects user preferences (can disable)

### Chatbot/Manual Extraction
- [ ] Extracts tasks from various text formats
- [ ] Suggests appropriate boards/lists
- [ ] Returns confidence score
- [ ] Supports different contexts (email, notes, chat, meetings)
- [ ] Does NOT auto-create tasks (just suggestions)

### Task Acceptance Flow
- [ ] Can edit suggestions before accepting
- [ ] Accept creates tasks in database
- [ ] Reject dismisses tasks
- [ ] Tasks include all metadata (priority, due date, etc.)
- [ ] Tasks can be assigned to clients

## Troubleshooting

### "Redis connection failed"
- Make sure Redis is running: `redis-server`
- Check Redis connection in `.env`

### "Scheduled jobs not running"
- Make sure worker process is running: `npm run dev:worker`
- Check worker logs for errors

### "OpenAI API error"
- Verify `OPENAI_API_KEY` is set correctly
- Check OpenAI account has credits

### "Follow-ups not detected"
- Make sure you have emails in the database
- Check that emails have `thread_id` populated
- Verify `thresholdDays` parameter (default: 2)

### "Daily summary not sent"
- Check `user_preferences.daily_summary_enabled = true`
- Verify email service (Resend) is configured
- Check worker logs for errors at 8 AM UTC

## Database Tables Used

These features use the following tables:

- `follow_ups` - Stores detected follow-ups
- `daily_summaries` - Stores generated summaries
- `tasks` - Stores accepted tasks
- `user_preferences` - User settings for summaries
- `emails` - Source data for follow-up detection
- `clients` - Client relationship data

## API Endpoints

### Follow-ups
- `GET /api/v1/follow-ups` - Get all follow-ups
- `GET /api/v1/follow-ups/urgent` - Get urgent follow-ups
- `GET /api/v1/follow-ups/stats` - Get statistics
- `GET /api/v1/follow-ups/:id` - Get specific follow-up
- `POST /api/v1/follow-ups/detect` - Trigger manual detection
- `POST /api/v1/follow-ups/:id/dismiss` - Dismiss follow-up
- `POST /api/v1/follow-ups/:id/respond` - Mark as responded

### AI/Chatbot
- `POST /api/v1/ai/extract-manual` - Extract tasks from text
- `PUT /api/v1/ai/edit-suggestion/:tempId` - Edit task suggestion
- `POST /api/v1/ai/accept-tasks` - Accept and create tasks
- `POST /api/v1/ai/reject-tasks` - Reject task suggestions

## Next Steps

After testing, you can:

1. **Integrate with frontend** - Build UI for these features
2. **Add notifications** - SMS/Push for urgent follow-ups
3. **Customize schedules** - Allow users to set their own times
4. **Improve urgency scoring** - Add sentiment analysis
5. **Add AI suggestions** - Generate draft responses for follow-ups

## Questions?

- Check logs: `backend/logs/`
- Review service files: `backend/src/services/`
- Check controller logic: `backend/src/controllers/`
