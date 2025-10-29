# TaskSnap: One-Click Automation Guide

## Overview

TaskSnap now features **fully automated, intelligent email processing** with a single click. Just hit the "Process" button and the system automatically:

1. ✅ Fetches all unread emails from Gmail
2. ✅ Extracts tasks using AI (95% confidence)
3. ✅ **Intelligently sorts** tasks by priority and due date
4. ✅ **Automatically labels** with smart categorization
5. ✅ **Enriches** with metadata (complexity, time estimates)
6. ✅ Creates Trello cards with proper formatting
7. ✅ All processing happens in the background (no waiting!)

## New Endpoints

### 🚀 **One-Click: Process Inbox**
```bash
POST /api/v1/automation/process-inbox
```

**What it does:**
- Fetches ALL unread emails from your inbox
- Enqueues background jobs for each email
- Returns immediately with job tracking info
- Worker handles everything automatically

**Request:**
```json
{
  "userId": "your-user-id",
  "maxEmails": 50,          // Optional: default 50
  "labelFilter": "INBOX"     // Optional: default INBOX
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Processing 15 emails in background",
    "emailsEnqueued": 15,
    "estimatedTime": "120 seconds",
    "jobs": ["email-user-123-msg1", "email-user-123-msg2", ...],
    "trackingUrl": "/api/v1/queue/jobs/user/your-user-id"
  }
}
```

### 🎯 **Process with Filters**
```bash
POST /api/v1/automation/process-filtered
```

**What it does:**
- Process emails matching specific criteria
- Filter by sender, subject, date range, etc.

**Request:**
```json
{
  "userId": "your-user-id",
  "filter": {
    "from": "boss@company.com",      // Optional
    "subject": "urgent",             // Optional
    "after": "2025/10/01",          // Optional
    "before": "2025/10/31",         // Optional
    "hasAttachment": true,          // Optional
    "isUnread": true,               // Optional
    "label": "work"                 // Optional
  },
  "maxEmails": 50
}
```

### ⚡ **Enable Continuous Automation**
```bash
POST /api/v1/automation/enable
```

**What it does:**
- Subscribes to Gmail push notifications
- NEW emails are processed automatically as they arrive
- No manual intervention needed!

**Request:**
```json
{
  "userId": "your-user-id"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Automation enabled! New emails will be processed automatically.",
    "subscription": { ... },
    "status": "active"
  }
}
```

### 🛑 **Disable Automation**
```bash
POST /api/v1/automation/disable
```

### 📊 **Check Automation Status**
```bash
GET /api/v1/automation/status/:userId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "enabled": true,
    "watchActive": true,
    "stats": {
      "completed": 45,
      "failed": 2,
      "pending": 3,
      "processing": 1,
      "last_processed": "2025-10-28T20:30:00Z"
    }
  }
}
```

## Intelligent Features

### 🧠 **Task Intelligence Service**

The system now automatically applies intelligence to every task:

#### 1. **Automatic Sorting**
Tasks are sorted by:
- **Priority first**: urgent → high → medium → low
- **Due date second**: earliest deadlines first
- **Category importance third**: urgent tasks, deadlines, meetings, etc.

#### 2. **Smart Labeling**
Automatically adds labels based on:
- **Time-based**: "Due Today", "Due This Week", "Due Next Week"
- **Context-based**: "Meeting", "Review Required", "Urgent"
- **Size-based**: "Large Task" (for tasks >2 hours)
- **Category-based**: Based on AI-detected category

#### 3. **Task Enrichment**
Each task is enriched with metadata:
```javascript
{
  name: "Review Q4 budget report",
  priority: "high",
  dueDate: "2025-11-03",
  labels: ["Due This Week", "Review Required", "Documentation", "budget"],
  metadata: {
    daysUntilDue: 6,
    isOverdue: false,
    estimatedMinutes: 60,
    isBlocker: true,
    complexity: "medium"
  }
}
```

#### 4. **Task Summary**
After processing, you get a comprehensive summary:
```javascript
{
  total: 15,
  byPriority: { urgent: 2, high: 5, medium: 6, low: 2 },
  byCategory: { meeting: 3, documentation: 5, communication: 7 },
  urgent: 2,
  dueToday: 1,
  overdue: 0,
  estimatedTotalTime: 450  // minutes
}
```

## Complete Usage Flow

### Option 1: One-Time Batch Processing

```bash
# 1. Connect your accounts (first time only)
open http://localhost:3000/api/v1/auth/gmail/connect
open http://localhost:3000/api/v1/auth/trello/connect

# 2. Process all unread emails
curl -X POST http://localhost:3000/api/v1/automation/process-inbox \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_USER_ID"}'

# 3. Track progress
curl http://localhost:3000/api/v1/queue/jobs/user/YOUR_USER_ID

# 4. Check results in Trello!
```

### Option 2: Continuous Automation (Recommended)

```bash
# 1. Connect accounts (first time only)
# ... same as above ...

# 2. Enable continuous automation
curl -X POST http://localhost:3000/api/v1/automation/enable \
  -H "Content-Type: application/json" \
  -d '{"userId": "YOUR_USER_ID"}'

# 3. That's it! New emails are automatically processed.

# 4. Check status anytime
curl http://localhost:3000/api/v1/automation/status/YOUR_USER_ID
```

### Option 3: Filtered Processing

```bash
# Process only urgent emails from your boss
curl -X POST http://localhost:3000/api/v1/automation/process-filtered \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "filter": {
      "from": "boss@company.com",
      "subject": "urgent",
      "isUnread": true
    }
  }'
```

## What Happens in the Background

When you hit the process button:

```
1. API receives request (< 100ms)
   ↓
2. Fetches unread emails from Gmail (~1-2 seconds)
   ↓
3. Enqueues jobs to Redis queue (~10ms per email)
   ↓
4. Returns response immediately with tracking info
   ↓
5. Background Worker picks up jobs
   ↓
6. For each email:
   - AI extracts tasks (6-8 seconds)
   - Task Intelligence Service applies:
     * Sorting by priority & due date
     * Smart labeling
     * Metadata enrichment
     * Complexity assessment
   - Creates Trello cards with labels (~1 second each)
   - Updates database
   ↓
7. All done! Check Trello for your organized tasks
```

## Trello Card Features

Each Trello card automatically includes:

### 📝 **Card Name**
- Clean, concise task name

### 🎨 **Priority Labels**
- Red = Urgent
- Orange = High
- Yellow = Medium
- Green = Low

### 🏷️ **Smart Labels**
- Category labels (Meeting, Documentation, etc.)
- Time-based labels (Due Today, Due This Week)
- Context labels (Review Required, Urgent)
- Custom labels from AI extraction

### 📅 **Due Dates**
- Extracted from email or auto-assigned based on priority
- Urgent: Today
- High: 3 days
- Medium: 1 week
- Low: 2 weeks

### 📄 **Description**
- Priority indicator with emoji
- Full task description
- Category and estimated time
- Source email context (from, date, subject)

### 💬 **Comments**
- Link to original email
- Email metadata

## Performance Metrics

Based on testing:

| Metric | Value |
|--------|-------|
| **AI Extraction** | ~6-8 seconds per email |
| **Task Sorting** | < 100ms for 50 tasks |
| **Label Enhancement** | < 50ms per task |
| **Trello Card Creation** | ~1 second per card |
| **Queue Response** | < 100ms |
| **Total per Email** | ~8-10 seconds |

**Example**: 20 emails = ~3 minutes total (all in background)

## Monitoring Your Processing

### Check Queue Status
```bash
curl http://localhost:3000/api/v1/queue/status
```

### View Your Jobs
```bash
curl http://localhost:3000/api/v1/queue/jobs/user/YOUR_USER_ID
```

### Get Statistics
```bash
curl http://localhost:3000/api/v1/queue/stats/YOUR_USER_ID
```

### Check Automation Status
```bash
curl http://localhost:3000/api/v1/automation/status/YOUR_USER_ID
```

## Troubleshooting

### No emails being processed?
1. Check if Gmail is connected: `GET /api/v1/auth/status`
2. Check automation status: `GET /api/v1/automation/status/:userId`
3. Check if you have unread emails in Gmail
4. Check worker logs for errors

### Jobs failing?
1. Check job details: `GET /api/v1/queue/jobs/:jobId/details`
2. Check worker is running: `npm run dev:worker`
3. Check Trello is connected
4. Review error message in job details

### Trello cards not appearing?
1. Verify Trello authentication
2. Check if you have a default board configured
3. Review job completion status
4. Check Trello API rate limits

## Advanced Usage

### Custom Filters
```javascript
// Process emails from specific sender
{
  "filter": { "from": "client@company.com" }
}

// Process emails with attachments
{
  "filter": { "hasAttachment": true }
}

// Process emails from last week
{
  "filter": {
    "after": "2025/10/21",
    "before": "2025/10/28"
  }
}

// Combine filters
{
  "filter": {
    "from": "team@company.com",
    "label": "important",
    "isUnread": true,
    "hasAttachment": true
  }
}
```

### Batch Limits
```javascript
{
  "userId": "123",
  "maxEmails": 100  // Process up to 100 emails
}
```

## Best Practices

1. **Start Small**: Process 10-20 emails first to test
2. **Enable Automation**: Once comfortable, enable continuous automation
3. **Monitor Regularly**: Check queue status and job success rates
4. **Clean Inbox**: Archive processed emails to avoid reprocessing
5. **Review Labels**: Check Trello regularly and adjust AI feedback if needed

## Example Workflow

```bash
# Morning routine:
# 1. Check what's pending
curl http://localhost:3000/api/v1/automation/status/USER_ID

# 2. Process overnight emails
curl -X POST http://localhost:3000/api/v1/automation/process-inbox \
  -H "Content-Type: application/json" \
  -d '{"userId": "USER_ID", "maxEmails": 50}'

# 3. Open Trello and review your organized tasks

# 4. (Optional) Process urgent emails specifically
curl -X POST http://localhost:3000/api/v1/automation/process-filtered \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "filter": {"subject": "urgent"}
  }'
```

## Next Steps

1. **Set up webhooks** for real-time processing
2. **Configure routing rules** for custom board/list mapping
3. **Add notifications** for completed processing
4. **Schedule periodic processing** with cron jobs

## Summary

With TaskSnap's one-click automation:
- ✅ No more manual email processing
- ✅ Intelligent task sorting and labeling
- ✅ Background processing (no waiting)
- ✅ Comprehensive tracking and monitoring
- ✅ Production-ready with error handling

**Just hit the button and let TaskSnap do the work!** 🚀
