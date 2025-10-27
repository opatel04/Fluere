# TaskSnap Backend API Reference

**Base URL**: `http://localhost:3000/api/v1`

**Version**: v1

---

## Authentication

All protected endpoints require authentication (to be implemented).

---

## Health & Status

### Check Server Health
```http
GET /health
```

**Response**:
```json
{
  "success": true,
  "message": "TaskSnap API is running",
  "timestamp": "2024-10-21T12:00:00.000Z",
  "environment": "development"
}
```

---

## Authentication Endpoints

### Gmail Authentication

#### Initiate Gmail OAuth
```http
GET /api/v1/auth/gmail/connect
```

**Description**: Redirects user to Google OAuth consent screen

**Rate Limit**: 5 requests per 15 minutes

---

#### Gmail OAuth Callback
```http
GET /api/v1/auth/gmail/callback?code={auth_code}
```

**Description**: Handles OAuth callback from Google

**Query Parameters**:
- `code` (string, required): OAuth authorization code

---

#### Disconnect Gmail
```http
POST /api/v1/auth/gmail/disconnect
```

**Description**: Revokes Gmail access and removes tokens

---

### Trello Authentication

#### Initiate Trello OAuth
```http
GET /api/v1/auth/trello/connect
```

**Description**: Redirects user to Trello authorization page

**Rate Limit**: 5 requests per 15 minutes

---

#### Trello OAuth Callback
```http
GET /api/v1/auth/trello/callback?oauth_token={token}&oauth_verifier={verifier}
```

**Description**: Handles OAuth callback from Trello

---

#### Disconnect Trello
```http
POST /api/v1/auth/trello/disconnect
```

**Description**: Revokes Trello access and removes tokens

---

### Check Auth Status
```http
GET /api/v1/auth/status
```

**Response**:
```json
{
  "success": true,
  "data": {
    "gmail": {
      "connected": true,
      "email": "user@gmail.com"
    },
    "trello": {
      "connected": true,
      "username": "username"
    }
  }
}
```

---

## Email Processing

### Process Emails Manually
```http
POST /api/v1/emails/process
```

**Description**: Manually trigger email processing

**Request Body**:
```json
{
  "since": "2024-10-20T00:00:00Z",
  "maxResults": 50
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "abc123",
    "status": "queued",
    "message": "Email processing job started"
  }
}
```

---

### Check Processing Status
```http
GET /api/v1/emails/status/:jobId?
```

**Description**: Check status of email processing job

**Path Parameters**:
- `jobId` (string, optional): Specific job ID. If omitted, returns all jobs.

**Response**:
```json
{
  "success": true,
  "data": {
    "jobId": "abc123",
    "status": "completed",
    "processedEmails": 25,
    "extractedTasks": 42,
    "errors": 0
  }
}
```

---

### Gmail Webhook
```http
POST /api/v1/emails/webhook
```

**Description**: Receives push notifications from Gmail

**Headers**:
- `Content-Type: application/json`

---

### List Processed Emails
```http
GET /api/v1/emails/list?page=1&limit=50
```

**Query Parameters**:
- `page` (number, optional): Page number (default: 1)
- `limit` (number, optional): Items per page (default: 50)
- `status` (string, optional): Filter by status (pending, processing, completed, failed)

**Response**:
```json
{
  "success": true,
  "data": {
    "emails": [
      {
        "id": "uuid",
        "subject": "Meeting tomorrow",
        "sender": "boss@company.com",
        "receivedAt": "2024-10-21T10:00:00Z",
        "processedAt": "2024-10-21T10:01:00Z",
        "tasksExtracted": 2,
        "status": "completed"
      }
    ],
    "pagination": {
      "total": 100,
      "page": 1,
      "pages": 2
    }
  }
}
```

---

## Task Management

### Create Task from Chat
```http
POST /api/v1/tasks/create
```

**Description**: Create task from chat box input

**Request Body**:
```json
{
  "content": "Schedule meeting with John next Tuesday at 2pm",
  "source": "chat"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "task": {
      "id": "uuid",
      "title": "Schedule meeting with John",
      "priority": "medium",
      "dueDate": "2024-10-29T14:00:00Z",
      "status": "pending"
    }
  }
}
```

---

### List Tasks
```http
GET /api/v1/tasks?status=pending&priority=high
```

**Query Parameters**:
- `status` (string, optional): Filter by status
- `priority` (string, optional): Filter by priority
- `page` (number, optional): Page number
- `limit` (number, optional): Items per page

**Response**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "title": "Important task",
        "priority": "high",
        "status": "pending",
        "createdAt": "2024-10-21T10:00:00Z"
      }
    ]
  }
}
```

---

### Get Single Task
```http
GET /api/v1/tasks/:id
```

**Path Parameters**:
- `id` (string, required): Task UUID

---

### Update Task
```http
PUT /api/v1/tasks/:id
```

**Request Body**:
```json
{
  "title": "Updated title",
  "priority": "critical",
  "status": "in_progress"
}
```

---

### Delete Task
```http
DELETE /api/v1/tasks/:id
```

**Response**:
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

---

### Bulk Create Tasks
```http
POST /api/v1/tasks/bulk/create
```

**Request Body**:
```json
{
  "tasks": [
    { "content": "Task 1" },
    { "content": "Task 2" },
    { "content": "Task 3" }
  ]
}
```

---

## Trello Integration

### Get Trello Boards
```http
GET /api/v1/trello/boards
```

**Response**:
```json
{
  "success": true,
  "data": {
    "boards": [
      {
        "id": "board123",
        "name": "Work Tasks",
        "url": "https://trello.com/b/board123",
        "syncEnabled": true
      }
    ]
  }
}
```

---

### Get Board Lists
```http
GET /api/v1/trello/boards/:boardId/lists
```

**Response**:
```json
{
  "success": true,
  "data": {
    "lists": [
      {
        "id": "list123",
        "name": "To Do",
        "position": 1
      },
      {
        "id": "list456",
        "name": "In Progress",
        "position": 2
      }
    ]
  }
}
```

---

### Force Sync
```http
POST /api/v1/trello/sync
```

**Description**: Manually trigger sync with Trello

**Request Body**:
```json
{
  "boardId": "board123",
  "syncDirection": "both"
}
```

---

### Get Synced Cards
```http
GET /api/v1/trello/cards
```

**Response**:
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "id": "card123",
        "taskId": "uuid",
        "name": "Task name",
        "boardId": "board123",
        "listId": "list123",
        "syncStatus": "synced",
        "lastSyncedAt": "2024-10-21T10:00:00Z"
      }
    ]
  }
}
```

---

### Get Card Status
```http
GET /api/v1/trello/cards/:cardId
```

---

### Trello Webhook
```http
POST /api/v1/trello/webhook
```

**Description**: Receives webhook events from Trello

---

## AI Services

### Analyze Text
```http
POST /api/v1/ai/analyze-text
```

**Description**: Analyze text from chat box and extract task information

**Rate Limit**: 10 requests per minute

**Request Body**:
```json
{
  "text": "Can you send me the Q4 report by Friday? Also schedule a meeting with Sarah for next Monday."
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "text": "Send Q4 report",
        "priority": "high",
        "dueDate": "2024-10-25",
        "confidence": 0.92
      },
      {
        "text": "Schedule meeting with Sarah",
        "priority": "medium",
        "dueDate": "2024-10-28",
        "confidence": 0.87
      }
    ]
  }
}
```

---

### Extract Tasks from Email
```http
POST /api/v1/ai/extract-tasks
```

**Request Body**:
```json
{
  "emailId": "uuid",
  "emailContent": {
    "subject": "Project update",
    "body": "Email content here..."
  }
}
```

---

### Prioritize Task
```http
POST /api/v1/ai/prioritize
```

**Request Body**:
```json
{
  "taskId": "uuid",
  "context": {
    "sender": "boss@company.com",
    "urgentKeywords": ["urgent", "asap"],
    "dueDate": "2024-10-22"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "priority": "critical",
    "priorityScore": 95,
    "reasoning": "Email from manager with urgent keyword and nearby deadline"
  }
}
```

---

### Categorize Task
```http
POST /api/v1/ai/categorize
```

**Request Body**:
```json
{
  "taskText": "Review marketing materials for Q4 campaign"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "category": "Marketing",
    "department": "Marketing",
    "assignedTo": "team",
    "confidence": 0.89
  }
}
```

---

### Suggest Board
```http
POST /api/v1/ai/suggest-board
```

**Request Body**:
```json
{
  "task": {
    "text": "Review design mockups",
    "category": "Design",
    "priority": "high"
  },
  "availableBoards": [
    { "id": "board1", "name": "Work" },
    { "id": "board2", "name": "Personal" },
    { "id": "board3", "name": "Design Projects" }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "suggestedBoard": "board3",
    "suggestedList": "In Progress",
    "confidence": 0.94
  }
}
```

---

## Configuration

### Get User Preferences
```http
GET /api/v1/config/preferences
```

**Response**:
```json
{
  "success": true,
  "data": {
    "organizationStyle": "priority",
    "boardStrategy": "single",
    "defaultGrouping": "priority",
    "autoProcessEmails": false,
    "notificationEnabled": true
  }
}
```

---

### Update Preferences
```http
PUT /api/v1/config/preferences
```

**Request Body**:
```json
{
  "organizationStyle": "timeline",
  "autoProcessEmails": true
}
```

---

### Get Routing Rules
```http
GET /api/v1/config/rules
```

**Response**:
```json
{
  "success": true,
  "data": {
    "rules": [
      {
        "id": "rule123",
        "name": "Boss emails to urgent",
        "type": "sender",
        "pattern": "boss@company.com",
        "targetBoard": "board123",
        "targetList": "urgent",
        "priorityModifier": 25,
        "isActive": true
      }
    ]
  }
}
```

---

### Create Routing Rule
```http
POST /api/v1/config/rules
```

**Request Body**:
```json
{
  "name": "Marketing emails",
  "type": "keyword",
  "pattern": "marketing|campaign|social media",
  "targetBoard": "board456",
  "priorityModifier": 0
}
```

---

### Update Rule
```http
PUT /api/v1/config/rules/:id
```

---

### Delete Rule
```http
DELETE /api/v1/config/rules/:id
```

---

### Get Board Mappings
```http
GET /api/v1/config/boards
```

---

### Create Board Mapping
```http
POST /api/v1/config/boards
```

**Request Body**:
```json
{
  "boardId": "board123",
  "organizationType": "priority",
  "listMappings": {
    "critical": "list1",
    "high": "list2",
    "medium": "list3",
    "low": "list4"
  }
}
```

---

### Update Board Mapping
```http
PUT /api/v1/config/boards/:id
```

---

### Delete Board Mapping
```http
DELETE /api/v1/config/boards/:id
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

### Common Error Codes

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing or invalid authentication |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error |

---

## Rate Limits

| Endpoint Type | Limit |
|---------------|-------|
| General API | 100 requests per 15 minutes |
| Authentication | 5 requests per 15 minutes |
| AI Services | 10 requests per minute |

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50, max: 100)

**Response Format**:
```json
{
  "data": [...],
  "pagination": {
    "total": 250,
    "page": 1,
    "pages": 5,
    "limit": 50
  }
}
```

---

## Webhooks

### Gmail Push Notifications

Configure in Google Cloud Console to receive real-time email notifications.

**Endpoint**: `POST /api/v1/emails/webhook`

### Trello Webhooks

Configure in Trello to receive card/board updates.

**Endpoint**: `POST /api/v1/trello/webhook`

---

## Testing with cURL

### Example: Get Health Status
```bash
curl http://localhost:3000/health
```

### Example: List Tasks
```bash
curl http://localhost:3000/api/v1/tasks?status=pending
```

### Example: Create Task
```bash
curl -X POST http://localhost:3000/api/v1/tasks/create \
  -H "Content-Type: application/json" \
  -d '{"content": "Test task", "source": "chat"}'
```

---

## Status

**Current Status**: All endpoints return placeholder "to be implemented" messages.

Implementation is in progress. Check `STATUS.md` for current implementation status.

---

**Last Updated**: October 21, 2024
