# TaskSnap Automation Guide

This guide explains how to set up and use the automated email processing workflow in TaskSnap.

## Overview

TaskSnap now supports **fully automated** email processing using background job queues. When you receive a new email, the system automatically:

1. Receives a webhook notification from Gmail
2. Enqueues a background job
3. Processes the email using AI (GPT-4o/Gemini)
4. Extracts tasks with validation
5. Creates Trello cards automatically
6. Updates the database with results

## Architecture

```
Gmail Push Notification
    ↓
Webhook Handler (POST /api/v1/emails/webhook)
    ↓
Bull Job Queue (Redis-backed)
    ↓
Background Worker Process
    ↓
AI Extraction → Validation → Trello Card Creation
    ↓
Database Updates & Logging
```

## Components

### 1. Bull Job Queue
- **Technology**: Bull (Redis-based job queue)
- **Location**: `src/config/queue.ts`
- **Features**:
  - Automatic retries (3 attempts with exponential backoff)
  - Job status tracking (pending, processing, completed, failed)
  - Job prioritization
  - Keeps last 100 completed jobs and 200 failed jobs

### 2. Background Worker
- **Location**: `src/workers/index.ts`
- **Purpose**: Processes jobs from the queue
- **Features**:
  - Graceful shutdown handling
  - Error handling and retry logic
  - Database status updates
  - Comprehensive logging

### 3. Gmail Webhook Handler
- **Location**: `src/controllers/gmail.controller.ts` (handleWebhook function)
- **Endpoint**: `POST /api/v1/emails/webhook`
- **Purpose**: Receives Gmail push notifications and enqueues jobs

### 4. Queue Monitoring API
- **Location**: `src/routes/queue.routes.ts`
- **Endpoints**:
  - `GET /api/v1/queue/status` - Overall queue status
  - `GET /api/v1/queue/jobs/user/:userId` - User's jobs
  - `GET /api/v1/queue/jobs/:jobId/details` - Job details
  - `GET /api/v1/queue/stats/:userId` - User statistics

## Setup Instructions

### Prerequisites

1. **Redis** must be running:
   ```bash
   # Install Redis (macOS)
   brew install redis
   brew services start redis

   # Or use Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Environment Variables** in `.env`:
   ```env
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_PASSWORD=  # Optional
   ```

### Step 1: Install Dependencies

Dependencies are already installed (Bull is in package.json), but if needed:

```bash
npm install
```

### Step 2: Start the Services

You need to run **TWO processes**:

#### Terminal 1: Main API Server
```bash
npm run dev
```

#### Terminal 2: Background Worker
```bash
npm run dev:worker
```

**Important**: Both processes must be running for automation to work!

### Step 3: Enable Gmail Push Notifications

For each user, you need to subscribe to Gmail push notifications:

```bash
# Use the API endpoint
POST /api/v1/emails/subscribe
```

This will:
- Set up Gmail Watch API
- Register webhook endpoint
- Store subscription details in database

### Step 4: Configure Webhook Endpoint (Production)

For production, you need a publicly accessible webhook URL:

1. **Set up HTTPS endpoint** (required by Google):
   - Use a reverse proxy (nginx, Caddy)
   - Or deploy to a cloud provider
   - Or use ngrok for testing

2. **Configure Google Cloud Pub/Sub**:
   - Create a Pub/Sub topic
   - Grant Gmail API publish permissions
   - Configure push subscription to your webhook URL

## How It Works

### Automatic Email Processing

1. **User receives email** → Gmail sends push notification
2. **Webhook receives notification** → Decodes Pub/Sub message
3. **Get email history** → Fetches new messages since last historyId
4. **Enqueue jobs** → Creates background jobs for each new email
5. **Worker processes jobs** → Runs AI extraction and Trello creation
6. **Update database** → Stores results and job status

### Manual Processing (Still Available)

You can still trigger processing manually:

```bash
# Process single email
POST /api/v1/process/email/:messageId

# Process batch of emails
POST /api/v1/process/batch
```

## Monitoring

### Check Queue Status

```bash
GET /api/v1/queue/status
```

Response:
```json
{
  "success": true,
  "data": {
    "queues": {
      "email": {
        "waiting": 5,
        "active": 2,
        "completed": 100,
        "failed": 3,
        "delayed": 0,
        "paused": 0
      },
      "batch": { ... }
    },
    "timestamp": "2025-10-28T12:00:00.000Z"
  }
}
```

### Check User's Jobs

```bash
GET /api/v1/queue/jobs/user/:userId?status=completed&limit=50
```

### Get Job Details

```bash
GET /api/v1/queue/jobs/:jobId/details
```

### Get User Statistics

```bash
GET /api/v1/queue/stats/:userId
```

## Configuration

### Job Queue Settings

Edit `src/config/queue.ts`:

```typescript
defaultJobOptions: {
  attempts: 3,              // Number of retry attempts
  backoff: {
    type: 'exponential',    // Backoff strategy
    delay: 2000,            // Initial delay (ms)
  },
  removeOnComplete: 100,    // Keep completed jobs
  removeOnFail: 200,        // Keep failed jobs
}
```

### Job Priorities

Higher priority = processed first (lower number = higher priority):

- **Priority 1**: Critical/urgent emails
- **Priority 3**: Webhook-triggered emails (default)
- **Priority 5**: Manual processing (default)
- **Priority 7**: Batch processing
- **Priority 10**: Low-priority background tasks

### Worker Concurrency

Edit `src/workers/email.worker.ts`:

```typescript
// Process up to 5 jobs concurrently
emailQueue.process(5, async (job) => {
  // Processing logic
});
```

## Production Deployment

### Option 1: PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Create ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'tasksnap-api',
      script: 'dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
    },
    {
      name: 'tasksnap-worker',
      script: 'dist/workers/index.js',
      instances: 2,
      exec_mode: 'cluster',
    }
  ]
};

# Start services
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Option 2: Docker Compose

```yaml
version: '3.8'
services:
  api:
    build: .
    command: npm start
    ports:
      - "3000:3000"
    depends_on:
      - redis
      - postgres

  worker:
    build: .
    command: npm run start:worker
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: tasksnap
      POSTGRES_PASSWORD: yourpassword
```

### Option 3: Kubernetes

See `k8s/` directory for deployment manifests (coming soon).

## Troubleshooting

### Worker Not Processing Jobs

1. **Check Redis connection**:
   ```bash
   redis-cli ping
   # Should respond: PONG
   ```

2. **Check worker logs**:
   ```bash
   npm run dev:worker
   # Look for: "Email worker started and listening for jobs"
   ```

3. **Check queue status**:
   ```bash
   curl http://localhost:3000/api/v1/queue/status
   ```

### Jobs Failing

1. **Check job details**:
   ```bash
   GET /api/v1/queue/jobs/:jobId/details
   ```

2. **Check logs** in `logs/` directory

3. **Common issues**:
   - Invalid Gmail tokens (re-authenticate)
   - No Trello board configured
   - AI API rate limits
   - Network connectivity

### Webhook Not Receiving Notifications

1. **Check Gmail watch subscription**:
   - Subscriptions expire after 7 days
   - Re-subscribe: `POST /api/v1/emails/subscribe`

2. **Check webhook endpoint**:
   - Must be HTTPS in production
   - Must return 200 status quickly

3. **Check Pub/Sub configuration**:
   - Topic exists
   - Permissions granted
   - Push subscription configured

## Performance Tuning

### Redis Optimization

```env
# Increase memory
redis-server --maxmemory 2gb --maxmemory-policy allkeys-lru
```

### Worker Concurrency

Adjust based on your server resources:

```typescript
// Low traffic: 1-2 concurrent jobs
emailQueue.process(2, handler);

// High traffic: 5-10 concurrent jobs
emailQueue.process(10, handler);
```

### Database Connection Pool

Edit `src/config/database.ts`:

```typescript
const pool = new Pool({
  max: 20,  // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## API Reference

### Queue Endpoints

#### Get Queue Status
```
GET /api/v1/queue/status
```

#### Get User Jobs
```
GET /api/v1/queue/jobs/user/:userId
Query params:
  - status: pending|processing|completed|failed
  - limit: number (default: 50)
```

#### Get Job Details
```
GET /api/v1/queue/jobs/:jobId/details
```

#### Get User Statistics
```
GET /api/v1/queue/stats/:userId
```

### Processing Endpoints

#### Subscribe to Gmail Notifications
```
POST /api/v1/emails/subscribe
Body: { userId: string }
```

#### Webhook Handler (Internal)
```
POST /api/v1/emails/webhook
Body: Pub/Sub message (handled automatically)
```

#### Manual Email Processing
```
POST /api/v1/process/email/:messageId
Body: { userId: string }
```

#### Batch Processing
```
POST /api/v1/process/batch
Body: {
  userId: string,
  maxResults?: number,
  query?: string
}
```

## Best Practices

1. **Monitor queue size**: Keep waiting jobs < 100
2. **Scale workers** based on traffic
3. **Set up alerts** for failed jobs
4. **Regular cleanup**: Remove old completed jobs
5. **Log analysis**: Review logs for patterns
6. **Health checks**: Monitor Redis and worker uptime

## Next Steps

- [ ] Set up monitoring dashboard (Grafana + Prometheus)
- [ ] Add scheduled jobs for periodic tasks
- [ ] Implement rate limiting per user
- [ ] Add job retry strategies based on error type
- [ ] Create admin dashboard for queue management

## Support

For issues or questions:
- Check logs in `logs/` directory
- Review error messages in job details
- Contact support with job ID and user ID
