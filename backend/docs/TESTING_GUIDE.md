# TaskSnap Freelancer Pivot - Testing Guide

## ✅ Step 1: Run Database Migration

First, let's apply all the new database changes:

```bash
# Connect to your PostgreSQL database
psql -U your_username -d your_database_name

# Or if you have DATABASE_URL env var:
psql $DATABASE_URL

# Then run the migration:
\i src/config/migrations/004_freelancer_pivot.sql

# Verify tables were created:
\dt

# You should see these NEW tables:
# - clients
# - follow_ups
# - client_sentiment_history
# - daily_summaries
# - inbound_emails

# Exit psql:
\q
```

## ✅ Step 2: Start the Server

```bash
# In the backend directory
npm run dev

# You should see:
# - Database connection successful
# - Email notification service initialized
# - Server running on port 3000
```

## ✅ Step 3: Test Manual Email Processing

### A. First, Get a JWT Token

You need to authenticate first. If you don't have a token, you can create one or login through your existing auth endpoint.

### B. Test the Inbound Email Endpoint

Use Postman, Thunder Client, or curl:

```bash
POST http://localhost:3000/api/v1/email/inbound/process
Authorization: Bearer YOUR_JWT_TOKEN_HERE
Content-Type: application/json

{
  "email": {
    "from": "john.doe@example.com",
    "to": "you@yourdomain.com",
    "subject": "Need website design by Friday",
    "text": "Hi! Can you design a website for my startup? We need it done by this Friday. Our budget is $500. Let me know if you can do it. Thanks, John"
  }
}
```

### Expected Result:

```json
{
  "success": true,
  "data": {
    "success": true,
    "inboundEmailId": "uuid-here",
    "clientId": "uuid-here",
    "taskId": "uuid-here",
    "trelloCardId": "trello-card-id" // If you have Trello connected
  }
}
```

### C. Verify Client Was Created

```bash
GET http://localhost:3000/api/v1/clients
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

You should see:
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "uuid",
        "email": "john.doe@example.com",
        "name": "John Doe",
        "status": "active",
        "health_score": 100,
        "email_count": 1,
        "task_count": "1",
        "completed_task_count": "0"
      }
    ],
    "total": 1
  }
}
```

### D. Verify Task Was Created

```bash
GET http://localhost:3000/api/v1/tasks
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

You should see a task with:
- Title: "Need website design by Friday" (or AI-extracted title)
- Due date: This Friday
- Client linked
- Status: pending

### E. Check Client Details

```bash
GET http://localhost:3000/api/v1/clients/{clientId}
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

You should see:
- Client info
- Tasks array with 1 task
- Emails array with 1 email
- Stats (tasks, emails, health score)

## ✅ Step 4: Test Multiple Emails from Same Client

Send another email from the same client:

```bash
POST http://localhost:3000/api/v1/email/inbound/process
Authorization: Bearer YOUR_JWT_TOKEN_HERE

{
  "email": {
    "from": "john.doe@example.com",
    "to": "you@yourdomain.com",
    "subject": "Also need logo design",
    "text": "Hi again! I also need a logo designed. Can you do that too?"
  }
}
```

Then check the client:

```bash
GET http://localhost:3000/api/v1/clients
```

You should see:
- Same client (not a duplicate!)
- `email_count`: 2
- `task_count`: 2

## ✅ Step 5: Test Client Statistics

```bash
GET http://localhost:3000/api/v1/clients/{clientId}/stats
Authorization: Bearer YOUR_JWT_TOKEN_HERE
```

Should return:
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalTasks": 2,
      "completedTasks": 0,
      "overdueTasks": 0,
      "pendingTasks": 2,
      "totalEmails": 2,
      "healthScore": 100
    },
    "communication": {
      "avgResponseTime": 0,
      "lastContactDate": "2024-10-30T...",
      "emailFrequency": 0,
      "sentimentTrend": []
    },
    "tasks": {
      "upcomingDeadlines": [...],
      "tasksByStatus": {
        "pending": 2,
        "completed": 0,
        "overdue": 0
      },
      "completionRate": 0
    }
  }
}
```

## ✅ Step 6: Test Forwarded Email Detection

Test with a forwarded email:

```bash
POST http://localhost:3000/api/v1/email/inbound/process

{
  "email": {
    "from": "you@yourdomain.com",
    "to": "you@yourdomain.com",
    "subject": "Fwd: Urgent project",
    "text": "---------- Forwarded message ---------\nFrom: jane@clientco.com\nDate: Oct 30, 2024\nSubject: Urgent project\n\nHi, we need help with an urgent project. Can you start tomorrow?"
  }
}
```

Expected: Client should be created for `jane@clientco.com`, not `you@yourdomain.com`

## ✅ Step 7: Test Client Health Score

Health score is calculated based on:
- Response time (30 points)
- Overdue tasks (40 points)
- Days since last contact (30 points)

To test this:

1. **Create an overdue task** (manually update due_date to yesterday in database)
2. **Update health score:**
```bash
POST http://localhost:3000/api/v1/clients/{clientId}/health
```

3. **Check the score decreased**

## ✅ Step 8: Test At-Risk Clients

```bash
GET http://localhost:3000/api/v1/clients/at-risk
```

Should return clients with health_score < 50

## ✅ Step 9: Test Client Timeline

```bash
GET http://localhost:3000/api/v1/clients/{clientId}/timeline
```

Should return chronological list of:
- Emails received
- Tasks created
- Activities logged

## ✅ Step 10: Test Error Handling

### A. Invalid Email Format
```bash
POST http://localhost:3000/api/v1/email/inbound/process

{
  "email": {
    "from": "invalid-email",
    "to": "you@yourdomain.com",
    "subject": "Test"
  }
}
```

Should handle gracefully without crashing.

### B. Missing AI API Key

If OpenAI key is invalid, it should:
- Return error
- Store inbound email with status "failed"
- Log the error

### C. Retry Failed Email

```bash
POST http://localhost:3000/api/v1/email/inbound/{inboundEmailId}/retry
```

## 🎯 Success Checklist

- [ ] Migration ran successfully
- [ ] Server starts without errors
- [ ] Can process inbound email
- [ ] Client auto-created from email
- [ ] Task extracted by AI
- [ ] Trello card created (if connected)
- [ ] Multiple emails from same client don't duplicate
- [ ] Client statistics calculate correctly
- [ ] Health score updates
- [ ] At-risk clients detected
- [ ] Timeline shows activity
- [ ] Error handling works

## 🐛 Troubleshooting

### "Database connection failed"
- Check DATABASE_URL in .env
- Make sure PostgreSQL is running
- Verify migration ran successfully

### "AI service failed"
- Check OPENAI_API_KEY in .env
- Make sure you have credits in OpenAI account
- Check logs for specific error

### "Trello card not created"
- This is expected if you haven't connected Trello
- Check `trello_boards` table has entries
- Verify Trello token is valid

### "Client not found"
- Check user authentication
- Make sure client belongs to authenticated user
- Check `clients` table in database

## 📊 Check Database Directly

```sql
-- Check clients
SELECT * FROM clients;

-- Check inbound emails
SELECT * FROM inbound_emails ORDER BY created_at DESC LIMIT 10;

-- Check tasks linked to clients
SELECT t.*, c.email as client_email
FROM tasks t
JOIN clients c ON t.client_id = c.id;

-- Check activity logs
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 10;
```

## ✅ Next Steps After Testing

Once all tests pass:

1. ✅ **Phase 1 is complete!**
2. 🚀 **Ready for Phase 2: Follow-Up Detection**
3. 📝 Document any issues found
4. 🎨 Start thinking about frontend needs

---

**Testing complete? Let me know the results and we'll continue to Phase 2!** 🚀
