# Board Automation API Documentation

## Overview

The Board Automation API allows users to configure their Trello boards with custom lists and intelligent card routing rules. When emails are processed, tasks are automatically routed to the appropriate lists based on priority, category, keywords, due dates, and more.

## Base URL

```
/api/v1/board-automation
```

---

## Endpoints

### 1. Get Configuration Templates

Get pre-built configuration templates for quick setup.

**GET** `/templates`

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "name": "Priority-Based",
        "description": "Organize tasks by priority level",
        "lists": [...],
        "routingRules": [...]
      },
      {
        "name": "Category-Based",
        "description": "Organize tasks by category",
        "lists": [...],
        "routingRules": [...]
      },
      {
        "name": "Time-Based",
        "description": "Organize tasks by due date",
        "lists": [...],
        "routingRules": [...]
      }
    ],
    "count": 3
  }
}
```

---

### 2. Get Board Configuration

Retrieve the automation configuration for a specific board.

**GET** `/:boardId`

**Body:**
```json
{
  "userId": "user-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "config-uuid",
    "userId": "user-uuid",
    "boardId": "trello-board-id",
    "lists": [
      {
        "name": "Urgent",
        "position": 0,
        "autoCreate": true
      },
      {
        "name": "High Priority",
        "position": 1,
        "autoCreate": true
      }
    ],
    "routingRules": [
      {
        "id": "rule-uuid",
        "name": "Urgent tasks to Urgent",
        "condition": {
          "type": "priority",
          "operator": "equals",
          "value": "urgent"
        },
        "targetList": "Urgent",
        "priority": 100,
        "enabled": true
      }
    ],
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  }
}
```

---

### 3. Save Board Configuration

Create or update a board's automation configuration.

**POST** `/:boardId`

**Body:**
```json
{
  "userId": "user-uuid-here",
  "lists": [
    {
      "name": "To Do",
      "position": 0,
      "autoCreate": true
    },
    {
      "name": "In Progress",
      "position": 1,
      "autoCreate": true
    },
    {
      "name": "Done",
      "position": 2,
      "autoCreate": true
    }
  ],
  "routingRules": [
    {
      "name": "Urgent tasks",
      "condition": {
        "type": "priority",
        "operator": "equals",
        "value": "urgent"
      },
      "targetList": "To Do",
      "priority": 100,
      "enabled": true
    },
    {
      "name": "Meeting tasks",
      "condition": {
        "type": "keyword",
        "operator": "contains",
        "value": ["meeting", "call", "zoom"]
      },
      "targetList": "Meetings",
      "priority": 90,
      "enabled": true
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* board config object */ },
  "message": "Board configuration saved successfully"
}
```

---

### 4. Initialize Board

Create all configured lists that don't exist yet on the board.

**POST** `/:boardId/initialize`

**Body:**
```json
{
  "userId": "user-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "listsCreated": ["Urgent", "High Priority"],
    "listsExisting": ["To Do", "Done"]
  },
  "message": "Created 2 new lists, 2 lists already existed"
}
```

---

### 5. Test Routing

Test which list a task would be routed to based on current rules.

**POST** `/:boardId/test-routing`

**Body:**
```json
{
  "userId": "user-uuid-here",
  "task": {
    "name": "Complete project documentation",
    "priority": "high",
    "category": "documentation",
    "dueDate": "2025-01-20T00:00:00.000Z",
    "labels": ["project", "docs"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "listName": "High Priority",
    "listId": "trello-list-id",
    "matchedRule": "High priority tasks"
  }
}
```

---

### 6. Create List

Create a new list on a board.

**POST** `/:boardId/lists`

**Body:**
```json
{
  "userId": "user-uuid-here",
  "name": "Backlog",
  "position": "bottom"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "list-id",
    "name": "Backlog",
    "closed": false,
    "idBoard": "board-id",
    "pos": 10000
  },
  "message": "List \"Backlog\" created successfully"
}
```

---

### 7. Move Card

Move a card to a different list.

**POST** `/cards/:cardId/move`

**Body:**
```json
{
  "userId": "user-uuid-here",
  "targetListId": "target-list-id",
  "position": "top"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "card-id",
    "name": "Task name",
    "idList": "target-list-id",
    /* other card properties */
  },
  "message": "Card moved successfully"
}
```

---

### 8. Get User Board Configs

Get all board configurations for a user.

**GET** `/user/:userId`

**Response:**
```json
{
  "success": true,
  "data": {
    "configs": [
      { /* board config 1 */ },
      { /* board config 2 */ }
    ],
    "count": 2
  }
}
```

---

### 9. Delete Board Configuration

Delete a board's automation configuration.

**DELETE** `/:boardId`

**Body:**
```json
{
  "userId": "user-uuid-here"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Board configuration deleted successfully"
}
```

---

## Routing Condition Types

### Priority Condition
Routes tasks based on priority level.

```json
{
  "type": "priority",
  "operator": "equals",
  "value": "urgent"
}
```

**Operators:** `equals`, `in`
**Values:** `"urgent"`, `"high"`, `"medium"`, `"low"`

---

### Category Condition
Routes tasks based on category.

```json
{
  "type": "category",
  "operator": "equals",
  "value": "meeting"
}
```

**Operators:** `equals`, `contains`, `in`
**Values:** string or array of strings

---

### Keyword Condition
Routes tasks based on keywords in name or description.

```json
{
  "type": "keyword",
  "operator": "contains",
  "value": ["urgent", "asap", "important"]
}
```

**Operators:** `contains`, `equals`
**Values:** string or array of strings

---

### Due Date Condition
Routes tasks based on days until due date.

```json
{
  "type": "dueDate",
  "operator": "lessThan",
  "value": 3
}
```

**Operators:** `lessThan`, `greaterThan`, `equals`
**Values:** number (days until due)

---

### Label Condition
Routes tasks based on labels.

```json
{
  "type": "label",
  "operator": "contains",
  "value": ["urgent", "customer"]
}
```

**Operators:** `contains`, `in`
**Values:** string or array of strings

---

## Usage Example

### 1. Setup Board with Priority-Based Organization

```bash
# Get a template
curl -X GET http://localhost:3000/api/v1/board-automation/templates

# Apply template to your board
curl -X POST http://localhost:3000/api/v1/board-automation/YOUR_BOARD_ID \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "lists": [
      { "name": "Urgent", "position": 0, "autoCreate": true },
      { "name": "High Priority", "position": 1, "autoCreate": true },
      { "name": "Medium Priority", "position": 2, "autoCreate": true },
      { "name": "Done", "position": 3, "autoCreate": true }
    ],
    "routingRules": [
      {
        "name": "Urgent tasks",
        "condition": { "type": "priority", "operator": "equals", "value": "urgent" },
        "targetList": "Urgent",
        "priority": 100,
        "enabled": true
      },
      {
        "name": "High priority tasks",
        "condition": { "type": "priority", "operator": "equals", "value": "high" },
        "targetList": "High Priority",
        "priority": 90,
        "enabled": true
      }
    ]
  }'

# Initialize board (creates missing lists)
curl -X POST http://localhost:3000/api/v1/board-automation/YOUR_BOARD_ID/initialize \
  -H "Content-Type: application/json" \
  -d '{ "userId": "YOUR_USER_ID" }'
```

### 2. Process Emails with Automation

Once configured, emails will automatically:
1. Extract tasks using AI
2. Initialize board with configured lists (if needed)
3. Route each task to appropriate list based on rules
4. Create cards in the correct list

```bash
# Process your inbox
curl -X POST http://localhost:3000/api/v1/automation/process-inbox \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "maxEmails": 50
  }'
```

### 3. Move Card Between Lists

```bash
# Move a card to "In Progress"
curl -X POST http://localhost:3000/api/v1/board-automation/cards/CARD_ID/move \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "targetListId": "IN_PROGRESS_LIST_ID",
    "position": "top"
  }'
```

---

## Integration with Email Processing

Board automation is automatically integrated into the email processing workflow:

1. **Email arrives** → Webhook/polling detects new email
2. **AI extracts tasks** → GPT-4o extracts task details
3. **Board initialization** → Creates configured lists if they don't exist
4. **Task routing** → Evaluates routing rules in priority order
5. **Card creation** → Creates card in the appropriate list
6. **Labeling & metadata** → Adds labels, due dates, descriptions

The system falls back gracefully if:
- No board config exists (uses default "To Do" list)
- Target list doesn't exist (creates it automatically)
- Routing rules fail (uses first list on board)

---

## Best Practices

1. **Use high priority numbers** for more specific rules (100, 90, 80...)
2. **Order matters** - Rules are evaluated from highest to lowest priority
3. **Test routing** before processing emails with `/test-routing` endpoint
4. **Initialize boards** after configuration changes
5. **Use templates** as starting points, customize to your workflow
6. **Keep list names consistent** with routing rule target lists
7. **Enable autoCreate** for all lists you want to exist

---

## Error Handling

All endpoints return error responses in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common error codes:
- `400` - Bad request (missing parameters)
- `403` - Forbidden (no access to board)
- `404` - Not found (config doesn't exist)
- `500` - Server error
