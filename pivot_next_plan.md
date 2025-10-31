# 🎯 TaskSnap Pivot Plan: Backend-First Strategy

## Executive Summary

**Current State:** Production-ready Trello automation backend with Gmail integration
**Pivot Goal:** Transform into freelancer-focused email-native client management tool
**Strategy:** Complete all backend features first, then build frontend dashboard

**Timeline:** 10-12 days (backend only)

---

## 🔍 Gap Analysis: What You Have vs What You Need

### ✅ What's Already Built (Your Foundation)

| Component | Status | Files |
|-----------|--------|-------|
| Gmail OAuth + API | ✅ Complete | `gmail.service.ts`, `gmail.controller.ts` |
| Trello OAuth + API | ✅ Complete | `trello.service.ts`, `trello.controller.ts` |
| AI Task Extraction | ✅ Complete | `ai.service.ts` |
| Email Processing Pipeline | ✅ Complete | `email-processor.service.ts`, `email-processor.controller.ts` |
| JWT Authentication | ✅ Complete | `auth.middleware.ts` |
| Database Schema | ✅ Complete | PostgreSQL with 11 tables |
| Job Queue (Bull) | ✅ Complete | `queue.ts`, Bull + Redis |
| Email Notifications | ✅ Complete | `notification.service.ts` (6 templates) |
| Webhook Security | ✅ Complete | `webhookVerification.ts` |
| Activity Logging | ✅ Complete | `activity-log.service.ts` |
| Board Automation | ✅ Complete | `board-automation.service.ts` |

### ❌ What's Missing for Freelancer Pivot

| Feature | Priority | Estimated Time |
|---------|----------|----------------|
| Inbound Email Forwarding | 🔴 CRITICAL | 1.5 days |
| Client Auto-Detection & Creation | 🔴 CRITICAL | 1 day |
| Follow-Up Detection Logic | 🔴 CRITICAL | 2 days |
| Daily AI Summary Generator | 🟡 HIGH | 1.5 days |
| Client-Centric Data Models | 🟡 HIGH | 1 day |
| Email Thread Tracking | 🟡 HIGH | 1.5 days |
| Smart Client Insights | 🟢 MEDIUM | 2 days |
| Sentiment Analysis | 🟢 MEDIUM | 1.5 days |
| Client Risk Scoring | ⚪ LOW (V2) | - |
| Invoice Tracking | ⚪ LOW (V2) | - |

---

## 📋 Backend Implementation Roadmap

### **Phase 1: Email-Native Foundation (Days 1-3)**

#### 🎯 Goal: Make "forward email → create task" work perfectly

#### **Task 1.1: Inbound Email Receiving (Day 1 - 4 hours)**

**What to build:**
- Set up Resend/SendGrid for inbound email handling
- Create webhook endpoint to receive forwarded emails
- Parse email metadata (from, to, subject, body)
- Extract attachments if needed

**Files to create:**
```
backend/src/services/inbound-email.service.ts
backend/src/controllers/inbound-email.controller.ts
backend/src/routes/inbound-email.routes.ts
```

**Implementation details:**

**`inbound-email.service.ts`:**
```typescript
class InboundEmailService {
  async processInboundEmail(emailData: InboundEmail) {
    // 1. Parse email (from, subject, body, html)
    // 2. Identify user (by forwarding address or special tag)
    // 3. Extract client email from original sender
    // 4. Call AI service to extract task details
    // 5. Create/update client record
    // 6. Create task
    // 7. Create Trello card (if connected)
    // 8. Send confirmation email to user
    // 9. Log activity
  }

  async handleForwardedEmail(rawEmail: string) {
    // Parse forwarded email format
    // Extract original sender vs forwarder
  }
}
```

**API Endpoint:**
```
POST /api/v1/email/inbound
- Receives webhook from Resend/SendGrid
- Processes email asynchronously via Bull queue
- Returns 200 immediately
```

**Integration points:**
- ✅ Use existing `ai.service.ts` for task extraction
- ✅ Use existing `trello.service.ts` for card creation
- ✅ Use existing `notification.service.ts` for confirmation
- ✅ Use existing Bull queue for async processing

---

#### **Task 1.2: Client Auto-Detection (Day 1 - 4 hours)**

**What to build:**
- Detect if client exists by email
- Auto-create client if new
- Link email to client
- Update client metadata (last contact, email count)

**Files to modify:**
```
backend/src/services/client.service.ts (NEW)
backend/src/controllers/client.controller.ts (NEW)
backend/src/routes/client.routes.ts (NEW)
```

**Database changes needed:**
```sql
-- Add to existing schema or create migration
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email_count INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS first_contact_date TIMESTAMP;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; -- active, at_risk, churned
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
```

**`client.service.ts`:**
```typescript
class ClientService {
  async findOrCreateClient(userId: string, clientEmail: string, clientName?: string) {
    // 1. Check if client exists by email + userId
    // 2. If exists, update last_contact_date and email_count
    // 3. If not, create new client with extracted name
    // 4. Return client record
  }

  async getClientByEmail(userId: string, email: string) {}

  async updateClientActivity(clientId: string) {
    // Update last_contact_date, increment email_count
  }

  async listClients(userId: string, filters?: ClientFilters) {
    // Get all clients for dashboard
    // Include: task count, last email date, upcoming deadlines
  }

  async getClientDetails(clientId: string) {
    // Get client + all tasks + all emails + activity log
  }
}
```

**API Endpoints:**
```
GET    /api/v1/clients               - List all clients for user
GET    /api/v1/clients/:id           - Get client details
POST   /api/v1/clients               - Manually create client
PUT    /api/v1/clients/:id           - Update client info
DELETE /api/v1/clients/:id           - Archive client
GET    /api/v1/clients/:id/tasks     - Get all tasks for client
GET    /api/v1/clients/:id/emails    - Get all emails for client
GET    /api/v1/clients/:id/timeline  - Get activity timeline
```

---

#### **Task 1.3: Email Thread Tracking (Day 2 - 6 hours)**

**What to build:**
- Track email threads (conversation history)
- Identify replies vs new threads
- Store thread metadata

**Files to modify:**
```
backend/src/services/email-thread.service.ts (NEW)
```

**Database changes:**
```sql
-- Add thread tracking to emails table
ALTER TABLE emails ADD COLUMN IF NOT EXISTS thread_id TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS in_reply_to TEXT;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS references TEXT[];
ALTER TABLE emails ADD COLUMN IF NOT EXISTS is_reply BOOLEAN DEFAULT false;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON emails(thread_id);
```

**`email-thread.service.ts`:**
```typescript
class EmailThreadService {
  async createThread(emailData: EmailData) {
    // Extract thread_id from email headers
    // Create or update thread record
  }

  async getThreadHistory(threadId: string) {
    // Get all emails in thread, ordered by date
  }

  async isUserLastResponder(threadId: string, userId: string) {
    // Check if last message in thread was from user (not client)
    // Used for follow-up detection
  }
}
```

---

#### **Task 1.4: Integration Testing (Day 3 - 8 hours)**

**What to test:**
1. Forward email → task created → Trello card created
2. New client auto-detected and created
3. Existing client linked to new task
4. Confirmation email sent
5. Activity logged
6. Error handling (bad email format, AI failure, Trello API down)

**Create test suite:**
```
backend/src/__tests__/integration/email-to-task.test.ts
backend/src/__tests__/integration/client-detection.test.ts
```

**Test with 10+ real email scenarios:**
- Simple task: "Can you design a logo by Friday?"
- Complex task: Long email with multiple deliverables
- Forwarded email with quoted text
- Email with attachments
- Email with no clear deadline
- Email from existing client
- Email from new client
- Email with urgent language
- Email with questions (not tasks)
- Email thread (reply chain)

---

### **Phase 2: Follow-Up Intelligence (Days 4-6)**

#### 🎯 Goal: Detect when freelancer hasn't responded to client

#### **Task 2.1: Follow-Up Detection Service (Day 4 - 6 hours)**

**What to build:**
- Scan Gmail for threads where client sent last message
- Flag threads older than X days (configurable)
- Calculate urgency score
- Store follow-up records

**Files to create:**
```
backend/src/services/follow-up.service.ts
backend/src/controllers/follow-up.controller.ts
backend/src/routes/follow-up.routes.ts
```

**Database changes:**
```sql
CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  client_id UUID REFERENCES clients(id),
  email_id UUID REFERENCES emails(id),
  thread_id TEXT NOT NULL,
  days_since_client_message INTEGER NOT NULL,
  urgency_score INTEGER DEFAULT 5, -- 1-10 scale
  client_message_snippet TEXT,
  suggested_response TEXT, -- AI-generated draft
  status TEXT DEFAULT 'pending', -- pending, dismissed, responded
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP
);

CREATE INDEX idx_follow_ups_user_id ON follow_ups(user_id);
CREATE INDEX idx_follow_ups_status ON follow_ups(status);
```

**`follow-up.service.ts`:**
```typescript
class FollowUpService {
  async scanForFollowUps(userId: string) {
    // 1. Fetch user's Gmail threads (last 30 days)
    // 2. For each thread:
    //    - Get last message
    //    - Check if from client (not user)
    //    - Calculate days since
    // 3. Filter threads older than threshold (2+ days)
    // 4. Calculate urgency score
    // 5. Create follow_up records
    // 6. Return list of follow-ups
  }

  async calculateUrgencyScore(thread: EmailThread) {
    // Factors:
    // - Days since last message (more days = higher urgency)
    // - Email sentiment (frustrated client = higher urgency)
    // - Pending task deadline (deadline approaching = higher urgency)
    // - Client value (high-paying client = higher urgency)
    // Return score 1-10
  }

  async generateSuggestedResponse(followUp: FollowUp) {
    // Use OpenAI to draft response based on:
    // - Client's last message
    // - Conversation history
    // - Task status
    // Return draft text
  }

  async getFollowUps(userId: string, status?: string) {
    // Get all follow-ups for dashboard
    // Filter by status if provided
  }

  async dismissFollowUp(followUpId: string) {
    // Mark as dismissed
  }

  async markAsResponded(followUpId: string) {
    // Mark as responded, set responded_at timestamp
  }
}
```

**API Endpoints:**
```
POST   /api/v1/follow-ups/scan       - Trigger scan for follow-ups
GET    /api/v1/follow-ups             - Get all pending follow-ups
GET    /api/v1/follow-ups/:id         - Get follow-up details
POST   /api/v1/follow-ups/:id/dismiss - Dismiss follow-up
POST   /api/v1/follow-ups/:id/respond - Mark as responded
GET    /api/v1/follow-ups/:id/draft   - Get AI-suggested response
```

---

#### **Task 2.2: Scheduled Follow-Up Scanning (Day 5 - 4 hours)**

**What to build:**
- Cron job to scan for follow-ups every 6 hours
- Background job processing
- Error handling and retry logic

**Files to create:**
```
backend/src/jobs/follow-up-scanner.job.ts
```

**`follow-up-scanner.job.ts`:**
```typescript
import { Queue } from 'bull';
import { FollowUpService } from '../services/follow-up.service';

// Add to queue configuration
export const setupFollowUpScanner = (queue: Queue) => {
  // Run every 6 hours
  queue.add('scan-follow-ups', {}, {
    repeat: { cron: '0 */6 * * *' } // Every 6 hours
  });

  queue.process('scan-follow-ups', async (job) => {
    const users = await getAllActiveUsers();

    for (const user of users) {
      try {
        await followUpService.scanForFollowUps(user.id);
        await activityLogService.log({
          userId: user.id,
          action: 'follow_up_scan_completed',
          metadata: { scannedAt: new Date() }
        });
      } catch (error) {
        logger.error(`Follow-up scan failed for user ${user.id}:`, error);
        // Continue with next user
      }
    }
  });
};
```

**Integration:**
- Add to `src/config/queue.ts`
- Run on app startup

---

#### **Task 2.3: Follow-Up Notifications (Day 5 - 2 hours)**

**What to build:**
- Email notification when new follow-ups detected
- Push notification (if frontend supports it later)
- Configurable notification preferences

**Files to modify:**
```
backend/src/services/notification.service.ts (ADD new template)
```

**Add new email template:**
```typescript
// In notification.service.ts
async sendFollowUpAlert(user: User, followUps: FollowUp[]) {
  const emailContent = `
    <h2>You have ${followUps.length} client(s) waiting for your response</h2>

    ${followUps.map(f => `
      <div style="border-left: 3px solid #ff6b6b; padding-left: 15px; margin: 20px 0;">
        <h3>${f.client_name}</h3>
        <p><strong>${f.days_since_client_message} days</strong> since their last message</p>
        <p>"${f.client_message_snippet}"</p>
        <a href="${process.env.APP_URL}/dashboard/follow-ups/${f.id}">View & Respond</a>
      </div>
    `).join('')}
  `;

  await this.sendEmail({
    to: user.email,
    subject: `⚠️ ${followUps.length} client(s) need your response`,
    html: emailContent
  });
}
```

**Database changes:**
```sql
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS follow_up_notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS follow_up_threshold_days INTEGER DEFAULT 2;
```

---

#### **Task 2.4: Testing Follow-Up Detection (Day 6 - 4 hours)**

**Test scenarios:**
1. Client sent message 3 days ago → should be flagged
2. User responded yesterday → should NOT be flagged
3. Client sent multiple messages → should show urgency
4. Old thread (30+ days) → should still be flagged if unanswered
5. Email marked as spam/archived → should be ignored
6. Dismiss follow-up → should not reappear

**Create test data:**
```
backend/src/__tests__/integration/follow-up-detection.test.ts
```

---

### **Phase 3: AI-Powered Daily Summary (Days 7-8)**

#### 🎯 Goal: Send daily email with "what's happening today"

#### **Task 3.1: Summary Generation Service (Day 7 - 6 hours)**

**What to build:**
- Aggregate user's tasks, emails, deadlines for the day
- Use OpenAI to generate human-readable summary
- Group by client
- Highlight urgent items

**Files to create:**
```
backend/src/services/daily-summary.service.ts
backend/src/jobs/daily-summary.job.ts
```

**`daily-summary.service.ts`:**
```typescript
class DailySummaryService {
  async generateSummary(userId: string) {
    // 1. Fetch today's data:
    const tasksToday = await getTasksDueToday(userId);
    const tasksTomorrow = await getTasksDueTomorrow(userId);
    const followUps = await getFollowUps(userId, 'pending');
    const recentEmails = await getEmailsLast24Hours(userId);

    // 2. Group by client
    const clientSummaries = groupByClient({
      tasksToday,
      tasksTomorrow,
      followUps,
      recentEmails
    });

    // 3. Use OpenAI to generate natural language summary
    const aiSummary = await this.generateAISummary(clientSummaries);

    // 4. Return formatted summary
    return {
      summary: aiSummary,
      stats: {
        tasksDueToday: tasksToday.length,
        tasksDueTomorrow: tasksTomorrow.length,
        pendingFollowUps: followUps.length,
        totalClients: Object.keys(clientSummaries).length
      }
    };
  }

  async generateAISummary(clientData: ClientSummaryData) {
    const prompt = `
      You are a personal assistant for a freelancer.
      Generate a brief daily summary (3-5 bullet points per client) based on this data:

      ${JSON.stringify(clientData)}

      Focus on:
      - Tasks due today or tomorrow
      - Clients waiting for responses
      - Any urgent items

      Keep it concise and actionable. Use friendly tone.
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });

    return completion.choices[0].message.content;
  }
}
```

**API Endpoint:**
```
GET /api/v1/summary/daily - Get today's summary (for dashboard)
```

---

#### **Task 3.2: Daily Summary Cron Job (Day 7 - 2 hours)**

**What to build:**
- Scheduled job to send summary every morning
- Configurable time per user (default 8 AM)
- Only send if user has activity

**`daily-summary.job.ts`:**
```typescript
export const setupDailySummaryJob = (queue: Queue) => {
  // Run every day at 8 AM
  queue.add('daily-summary', {}, {
    repeat: { cron: '0 8 * * *' }
  });

  queue.process('daily-summary', async (job) => {
    const users = await getActiveUsersWithPreference('daily_summary_enabled', true);

    for (const user of users) {
      try {
        // Check if user has any activity worth summarizing
        const summary = await dailySummaryService.generateSummary(user.id);

        if (summary.stats.tasksDueToday > 0 || summary.stats.pendingFollowUps > 0) {
          await notificationService.sendDailySummary(user, summary);
        }

        logger.info(`Daily summary sent to user ${user.email}`);
      } catch (error) {
        logger.error(`Failed to send daily summary to ${user.email}:`, error);
      }
    }
  });
};
```

---

#### **Task 3.3: Email Template for Daily Summary (Day 8 - 2 hours)**

**Add to `notification.service.ts`:**
```typescript
async sendDailySummary(user: User, summary: DailySummary) {
  const emailContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .summary-container { font-family: Arial, sans-serif; max-width: 600px; }
        .client-section { margin: 20px 0; padding: 15px; background: #f7f7f7; border-radius: 8px; }
        .urgent { color: #ff6b6b; font-weight: bold; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat-card { padding: 15px; background: white; border-radius: 6px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="summary-container">
        <h1>☀️ Good morning! Here's your day at a glance</h1>

        <div class="stats">
          <div class="stat-card">
            <h3>${summary.stats.tasksDueToday}</h3>
            <p>Tasks due today</p>
          </div>
          <div class="stat-card">
            <h3>${summary.stats.pendingFollowUps}</h3>
            <p>Clients waiting</p>
          </div>
          <div class="stat-card">
            <h3>${summary.stats.totalClients}</h3>
            <p>Active clients</p>
          </div>
        </div>

        <div class="ai-summary">
          ${summary.summary}
        </div>

        <a href="${process.env.APP_URL}/dashboard" style="display: block; margin: 30px 0; padding: 15px; background: #4CAF50; color: white; text-align: center; text-decoration: none; border-radius: 6px;">
          Open Dashboard
        </a>

        <p style="color: #888; font-size: 12px;">
          Don't want daily summaries?
          <a href="${process.env.APP_URL}/settings">Update your preferences</a>
        </p>
      </div>
    </body>
    </html>
  `;

  await this.sendEmail({
    to: user.email,
    subject: `📋 Your daily TaskSnap summary - ${new Date().toLocaleDateString()}`,
    html: emailContent
  });
}
```

---

#### **Task 3.4: User Preferences for Daily Summary (Day 8 - 2 hours)**

**Database changes:**
```sql
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS daily_summary_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS daily_summary_time TIME DEFAULT '08:00:00';
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS daily_summary_timezone TEXT DEFAULT 'UTC';
```

**API Endpoints:**
```
GET    /api/v1/preferences           - Get user preferences
PUT    /api/v1/preferences           - Update preferences
POST   /api/v1/preferences/summary   - Toggle daily summary on/off
```

---

### **Phase 4: Client Insights & Intelligence (Days 9-10)**

#### 🎯 Goal: Give freelancer actionable insights about their clients

#### **Task 4.1: Client Health Score (Day 9 - 4 hours)**

**What to build:**
- Calculate "health score" for each client (1-100)
- Based on: response time, task completion rate, communication frequency
- Flag at-risk clients

**Add to `client.service.ts`:**
```typescript
async calculateClientHealth(clientId: string): Promise<number> {
  const client = await getClient(clientId);

  let score = 100;

  // Factor 1: Response time (30 points)
  const avgResponseTime = await getAverageResponseTime(clientId);
  if (avgResponseTime > 48) score -= 30; // >2 days = bad
  else if (avgResponseTime > 24) score -= 15; // >1 day = ok

  // Factor 2: Overdue tasks (40 points)
  const overdueTasks = await getOverdueTaskCount(clientId);
  score -= Math.min(overdueTasks * 10, 40);

  // Factor 3: Last contact (30 points)
  const daysSinceContact = await getDaysSinceLastContact(clientId);
  if (daysSinceContact > 14) score -= 30;
  else if (daysSinceContact > 7) score -= 15;

  return Math.max(score, 0);
}

async flagAtRiskClients(userId: string) {
  const clients = await listClients(userId);
  const atRisk = [];

  for (const client of clients) {
    const health = await this.calculateClientHealth(client.id);
    if (health < 50) {
      atRisk.push({ ...client, healthScore: health });
    }
  }

  return atRisk;
}
```

**Database changes:**
```sql
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS health_updated_at TIMESTAMP;
```

---

#### **Task 4.2: Email Sentiment Analysis (Day 9 - 4 hours)**

**What to build:**
- Analyze client email sentiment (positive, neutral, negative)
- Track sentiment over time
- Alert if sentiment drops

**Add to `ai.service.ts`:**
```typescript
async analyzeSentiment(emailText: string): Promise<SentimentResult> {
  const prompt = `
    Analyze the sentiment of this client email.
    Return JSON: { "sentiment": "positive|neutral|negative", "score": 0-10, "reason": "brief explanation" }

    Email: ${emailText}
  `;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" }
  });

  return JSON.parse(completion.choices[0].message.content);
}
```

**Database changes:**
```sql
ALTER TABLE emails ADD COLUMN IF NOT EXISTS sentiment TEXT; -- positive, neutral, negative
ALTER TABLE emails ADD COLUMN IF NOT EXISTS sentiment_score INTEGER; -- 0-10
ALTER TABLE emails ADD COLUMN IF NOT EXISTS sentiment_reason TEXT;

CREATE TABLE IF NOT EXISTS client_sentiment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  date DATE NOT NULL,
  avg_sentiment_score DECIMAL(3,2),
  positive_count INTEGER DEFAULT 0,
  neutral_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Process sentiment on email receive:**
- When new email arrives, analyze sentiment
- Store in `emails.sentiment`
- Update `client_sentiment_history` daily

---

#### **Task 4.3: Client Stats & Analytics (Day 10 - 4 hours)**

**What to build:**
- Client dashboard data endpoint
- Aggregate stats per client
- Trends over time

**Add to `client.service.ts`:**
```typescript
async getClientStats(clientId: string) {
  return {
    overview: {
      totalTasks: await countTasks(clientId),
      completedTasks: await countTasks(clientId, 'completed'),
      overdueTasks: await countTasks(clientId, 'overdue'),
      totalEmails: await countEmails(clientId),
      healthScore: await calculateClientHealth(clientId)
    },
    communication: {
      avgResponseTime: await getAverageResponseTime(clientId),
      lastContactDate: await getLastContactDate(clientId),
      emailFrequency: await getEmailFrequency(clientId), // per week
      sentimentTrend: await getSentimentTrend(clientId, 30) // last 30 days
    },
    tasks: {
      upcomingDeadlines: await getUpcomingDeadlines(clientId, 7), // next 7 days
      tasksByStatus: await getTaskCountByStatus(clientId),
      completionRate: await getCompletionRate(clientId)
    },
    financial: {
      // For V2: invoice tracking
      totalInvoiced: 0,
      totalPaid: 0,
      outstanding: 0
    }
  };
}
```

**API Endpoint:**
```
GET /api/v1/clients/:id/stats - Get comprehensive client stats
```

---

#### **Task 4.4: Weekly Client Report (Day 10 - 4 hours)**

**What to build:**
- Weekly email with client insights
- Which clients are at risk
- Which clients are happy
- Summary of week's activity

**Add to `notification.service.ts`:**
```typescript
async sendWeeklyClientReport(user: User, weeklyData: WeeklyReport) {
  const emailContent = `
    <h1>📊 Your Weekly Client Report</h1>

    <h2>⚠️ Clients Needing Attention (${weeklyData.atRiskClients.length})</h2>
    ${weeklyData.atRiskClients.map(c => `
      <div style="border-left: 3px solid #ff6b6b;">
        <h3>${c.name}</h3>
        <p>Health Score: ${c.healthScore}/100</p>
        <p>Issue: ${c.healthReason}</p>
      </div>
    `).join('')}

    <h2>✅ Happy Clients (${weeklyData.happyClients.length})</h2>
    <p>These clients are doing great! Keep up the good work.</p>

    <h2>📈 This Week's Activity</h2>
    <ul>
      <li>${weeklyData.stats.tasksCompleted} tasks completed</li>
      <li>${weeklyData.stats.emailsProcessed} emails processed</li>
      <li>${weeklyData.stats.avgResponseTime} hours avg response time</li>
    </ul>
  `;

  await this.sendEmail({
    to: user.email,
    subject: `📊 Weekly Client Report - ${getWeekDateRange()}`,
    html: emailContent
  });
}
```

**Cron job:**
```typescript
// Run every Monday at 9 AM
queue.add('weekly-report', {}, {
  repeat: { cron: '0 9 * * 1' }
});
```

---

## 🗄️ Database Schema Updates Summary

### New Tables Needed:

```sql
-- Follow-ups table
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) NOT NULL,
  client_id UUID REFERENCES clients(id),
  email_id UUID REFERENCES emails(id),
  thread_id TEXT NOT NULL,
  days_since_client_message INTEGER NOT NULL,
  urgency_score INTEGER DEFAULT 5,
  client_message_snippet TEXT,
  suggested_response TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP
);

-- Client sentiment history
CREATE TABLE client_sentiment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id),
  date DATE NOT NULL,
  avg_sentiment_score DECIMAL(3,2),
  positive_count INTEGER DEFAULT 0,
  neutral_count INTEGER DEFAULT 0,
  negative_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Column Additions:

```sql
-- Clients table
ALTER TABLE clients ADD COLUMN email_count INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN last_contact_date TIMESTAMP;
ALTER TABLE clients ADD COLUMN first_contact_date TIMESTAMP;
ALTER TABLE clients ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE clients ADD COLUMN notes TEXT;
ALTER TABLE clients ADD COLUMN health_score INTEGER DEFAULT 100;
ALTER TABLE clients ADD COLUMN health_updated_at TIMESTAMP;

-- Emails table
ALTER TABLE emails ADD COLUMN thread_id TEXT;
ALTER TABLE emails ADD COLUMN in_reply_to TEXT;
ALTER TABLE emails ADD COLUMN references TEXT[];
ALTER TABLE emails ADD COLUMN is_reply BOOLEAN DEFAULT false;
ALTER TABLE emails ADD COLUMN reply_count INTEGER DEFAULT 0;
ALTER TABLE emails ADD COLUMN sentiment TEXT;
ALTER TABLE emails ADD COLUMN sentiment_score INTEGER;
ALTER TABLE emails ADD COLUMN sentiment_reason TEXT;

-- User preferences
ALTER TABLE user_preferences ADD COLUMN follow_up_notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_preferences ADD COLUMN follow_up_threshold_days INTEGER DEFAULT 2;
ALTER TABLE user_preferences ADD COLUMN daily_summary_enabled BOOLEAN DEFAULT true;
ALTER TABLE user_preferences ADD COLUMN daily_summary_time TIME DEFAULT '08:00:00';
ALTER TABLE user_preferences ADD COLUMN daily_summary_timezone TEXT DEFAULT 'UTC';
```

### Create Migration File:

```
backend/src/config/migrations/004_freelancer_pivot.sql
```

---

## 📦 New Dependencies Needed

```bash
cd backend
npm install resend          # For inbound email (or use sendgrid)
npm install mailparser      # For parsing raw email
npm install @supabase/supabase-js  # If switching from raw pg
npm install date-fns        # For date manipulation in reports
```

---

## 🔄 Modified Files Summary

### New Files to Create (19 files):

```
backend/src/services/inbound-email.service.ts
backend/src/services/client.service.ts
backend/src/services/email-thread.service.ts
backend/src/services/follow-up.service.ts
backend/src/services/daily-summary.service.ts

backend/src/controllers/inbound-email.controller.ts
backend/src/controllers/client.controller.ts
backend/src/controllers/follow-up.controller.ts

backend/src/routes/inbound-email.routes.ts
backend/src/routes/client.routes.ts
backend/src/routes/follow-up.routes.ts

backend/src/jobs/follow-up-scanner.job.ts
backend/src/jobs/daily-summary.job.ts
backend/src/jobs/weekly-report.job.ts

backend/src/config/migrations/004_freelancer_pivot.sql

backend/src/__tests__/integration/email-to-task.test.ts
backend/src/__tests__/integration/client-detection.test.ts
backend/src/__tests__/integration/follow-up-detection.test.ts

backend/.env.example (update with new vars)
```

### Files to Modify (6 files):

```
backend/src/services/notification.service.ts    (add 3 new email templates)
backend/src/services/ai.service.ts              (add sentiment analysis)
backend/src/routes/index.ts                     (register new routes)
backend/src/config/queue.ts                     (add new cron jobs)
backend/src/config/env.ts                       (add Resend API key)
backend/package.json                            (add new dependencies)
```

---

## 🚀 Environment Variables to Add

```bash
# Add to backend/.env

# Inbound Email (choose one)
RESEND_API_KEY=re_xxx
# OR
SENDGRID_API_KEY=SG.xxx
SENDGRID_INBOUND_EMAIL_DOMAIN=tasksnap.com

# Email sending (if not using Resend for both)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply@tasksnap.com
EMAIL_PASSWORD=your-app-password

# App URL (for email links)
APP_URL=https://app.tasksnap.com

# Feature flags
ENABLE_DAILY_SUMMARY=true
ENABLE_FOLLOW_UP_DETECTION=true
ENABLE_SENTIMENT_ANALYSIS=true

# Timing configs
FOLLOW_UP_SCAN_INTERVAL_HOURS=6
DAILY_SUMMARY_TIME=08:00
WEEKLY_REPORT_DAY=monday
```

---

## ✅ Testing Checklist

### Phase 1 Tests:
- [ ] Forward email to task@tasksnap.com → task created
- [ ] New client auto-created from email
- [ ] Existing client linked to new email
- [ ] AI correctly extracts task + deadline
- [ ] Trello card created (if connected)
- [ ] Confirmation email sent
- [ ] Activity logged
- [ ] Error handling (malformed email, AI failure)

### Phase 2 Tests:
- [ ] Follow-up scan detects unanswered emails
- [ ] Urgency score calculated correctly
- [ ] Follow-up notifications sent
- [ ] Dismiss follow-up works
- [ ] Mark as responded works
- [ ] Scan runs every 6 hours

### Phase 3 Tests:
- [ ] Daily summary generated correctly
- [ ] Summary sent at correct time (8 AM)
- [ ] Summary only sent if user has activity
- [ ] User can disable daily summary
- [ ] Summary includes correct client data

### Phase 4 Tests:
- [ ] Client health score accurate
- [ ] At-risk clients flagged correctly
- [ ] Sentiment analysis works
- [ ] Client stats endpoint returns correct data
- [ ] Weekly report sent on Monday

---

## 📊 Success Metrics (Backend Complete)

After completing all 4 phases, you should have:

✅ **API Endpoints:** 40+ RESTful endpoints
✅ **Database Tables:** 13+ tables with proper indexes
✅ **Background Jobs:** 4 cron jobs running
✅ **Email Templates:** 9+ notification templates
✅ **Services:** 15+ modular services
✅ **AI Features:** Task extraction, sentiment analysis, summaries
✅ **Integrations:** Gmail, Trello, OpenAI all working

**Backend should be 100% feature-complete** for the MVP.

---

## 🎨 Frontend Requirements (For Later)

Once backend is done, you'll need these frontend pages:

1. **Dashboard** - Client cards with stats
2. **Client Detail** - Tasks, emails, timeline for one client
3. **Follow-Ups** - List of clients needing response
4. **Settings** - Preferences, integrations, notifications
5. **Onboarding** - Connect Gmail/Trello, explain email forwarding

**Estimated Frontend Time:** 6-8 days (but you said you can do your magic here)

---

## 🚦 Go/No-Go Decision Points

### After Phase 1 (Day 3):
**Question:** Does email → task → Trello work end-to-end?
- ✅ YES → Continue to Phase 2
- ❌ NO → Fix Phase 1 before moving on

### After Phase 2 (Day 6):
**Question:** Are follow-ups detected accurately?
- ✅ YES → Continue to Phase 3
- ❌ NO → Refine detection logic

### After Phase 3 (Day 8):
**Question:** Is daily summary useful/accurate?
- ✅ YES → Continue to Phase 4
- ❌ NO → Improve AI prompts or skip to frontend

### After Phase 4 (Day 10):
**Question:** Is backend feature-complete?
- ✅ YES → Start frontend build
- ❌ NO → Identify critical gaps and fix

---

## 💡 Pro Tips for Fast Execution

1. **Reuse Existing Code**
   - Your AI, Trello, Gmail, and notification services are gold
   - Don't rewrite what works
   - Just add thin layers on top

2. **Use AI for Boilerplate**
   - Let Cursor/Claude generate CRUD controllers
   - Focus your time on business logic

3. **Test As You Go**
   - Don't wait until end to test
   - Test each phase before moving to next

4. **Skip Perfectionism**
   - MVP doesn't need perfect error messages
   - MVP doesn't need 100% test coverage
   - Get it working, polish later

5. **Deploy Early**
   - Deploy backend to production after Phase 1
   - Test with real emails, not just localhost

---

## 🎯 Next Immediate Steps

### Today (Next 2 Hours):

1. **Create migration file:**
   ```bash
   touch backend/src/config/migrations/004_freelancer_pivot.sql
   ```

2. **Set up Resend account:**
   - Go to resend.com
   - Create account
   - Get API key
   - Configure inbound email domain

3. **Install dependencies:**
   ```bash
   cd backend
   npm install resend mailparser date-fns
   ```

4. **Create first new file:**
   ```bash
   touch backend/src/services/inbound-email.service.ts
   ```

5. **Start coding Phase 1, Task 1.1** (Email receiving)

---

## 📝 Daily Standup Template

Each day, track progress:

```
### Day X Progress

**Completed:**
- [ ] Task X.X: Description
- [ ] Task Y.Y: Description

**Blocked:**
- Issue: Description
- Resolution: Description

**Tomorrow:**
- [ ] Task Z.Z: Description

**Time spent:** X hours
```

---

## 🏁 Final Checklist (Before Frontend)

- [ ] All 4 phases complete
- [ ] Database migrations run successfully
- [ ] All tests passing
- [ ] Backend deployed to production
- [ ] API documentation updated
- [ ] Environment variables configured
- [ ] Cron jobs running
- [ ] Error monitoring set up (Sentry?)
- [ ] API rate limiting tested
- [ ] Security audit passed (JWT, webhooks, SQL injection)

**When all checked → Backend is DONE. Start frontend.**

---

## 🚀 Let's Build This

You have an incredible foundation. Now execute on these 4 phases and you'll have a production-ready backend in 10-12 days.

**The hard part is done. You just need to connect the dots.**

Ready to start? Begin with Phase 1, Task 1.1 (Email receiving).

Good luck! 🔥
