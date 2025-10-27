# TaskSnap Backend API Documentation

## MVP Backend - Task Sorting & Filtering

This document describes the new task sorting and filtering endpoints added to the TaskSnap backend.

---

## Base URL

```
http://localhost:3000/api
```

---

## New Endpoints

### 1. Get Available Sort/Filter Options

Get all available dropdown options for sorting and filtering tasks.

**Endpoint:** `GET /task-sort/options`

**Response:**

```json
{
  "success": true,
  "data": {
    "sortOptions": [
      {
        "value": "priority",
        "label": "By Priority",
        "description": "Sort by priority (urgent > high > medium > low)"
      },
      {
        "value": "name",
        "label": "By Name",
        "description": "Sort alphabetically by task name"
      },
      {
        "value": "date",
        "label": "By Date",
        "description": "Sort by due date (earliest first)"
      },
      {
        "value": "month",
        "label": "By Month",
        "description": "Group tasks by month"
      },
      {
        "value": "year",
        "label": "By Year",
        "description": "Group tasks by year"
      }
    ],
    "filterOptions": [
      {
        "value": "urgent",
        "label": "Urgent Only",
        "description": "Show only urgent priority tasks"
      },
      {
        "value": "high",
        "label": "High Priority",
        "description": "Show only high priority tasks"
      },
      {
        "value": "medium",
        "label": "Medium Priority",
        "description": "Show only medium priority tasks"
      },
      {
        "value": "low",
        "label": "Low Priority",
        "description": "Show only low priority tasks"
      },
      {
        "value": "overdue",
        "label": "Overdue",
        "description": "Show only overdue tasks"
      },
      {
        "value": "today",
        "label": "Due Today",
        "description": "Show tasks due today"
      },
      {
        "value": "this-week",
        "label": "This Week",
        "description": "Show tasks due this week"
      },
      {
        "value": "this-month",
        "label": "This Month",
        "description": "Show tasks due this month"
      }
    ]
  }
}
```

---

### 2. Sort Tasks (Dropdown-based)

Sort and filter tasks using dropdown selections.

**Endpoint:** `POST /task-sort/sort`

**Request Body:**

```json
{
  "tasks": [
    {
      "name": "Fix login bug",
      "description": "Users can't log in",
      "priority": "urgent",
      "dueDate": "2025-10-26T00:00:00.000Z",
      "category": "bug"
    },
    {
      "name": "Update documentation",
      "description": "Add API docs",
      "priority": "low",
      "dueDate": "2025-11-15T00:00:00.000Z",
      "category": "documentation"
    }
  ],
  "sortBy": "priority",
  "filters": ["urgent", "high"]
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "name": "Fix login bug",
        "description": "Users can't log in",
        "priority": "urgent",
        "dueDate": "2025-10-26T00:00:00.000Z",
        "category": "bug"
      }
    ],
    "count": 1,
    "originalCount": 2,
    "sortBy": "priority",
    "filters": ["urgent", "high"]
  }
}
```

---

### 3. Sort Tasks (Chat-based with AI)

Sort tasks using natural language prompts powered by AI.

**Endpoint:** `POST /task-sort/sort/chat`

**Request Body:**

```json
{
  "tasks": [
    {
      "name": "Fix login bug",
      "description": "Users can't log in",
      "priority": "urgent",
      "dueDate": "2025-10-26T00:00:00.000Z"
    },
    {
      "name": "Update documentation",
      "description": "Add API docs",
      "priority": "low",
      "dueDate": "2025-11-15T00:00:00.000Z"
    },
    {
      "name": "Deploy to production",
      "description": "Push latest changes",
      "priority": "high",
      "dueDate": "2025-10-28T00:00:00.000Z"
    }
  ],
  "prompt": "Show me the most urgent tasks first, then sort by date"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "name": "Fix login bug",
        "description": "Users can't log in",
        "priority": "urgent",
        "dueDate": "2025-10-26T00:00:00.000Z"
      },
      {
        "name": "Deploy to production",
        "description": "Push latest changes",
        "priority": "high",
        "dueDate": "2025-10-28T00:00:00.000Z"
      },
      {
        "name": "Update documentation",
        "description": "Add API docs",
        "priority": "low",
        "dueDate": "2025-11-15T00:00:00.000Z"
      }
    ],
    "count": 3,
    "originalCount": 3,
    "explanation": "Sorted tasks by priority (urgent first) and then by due date within each priority level",
    "sortCriteria": {
      "sortBy": "priority",
      "filters": [],
      "customLogic": "Secondary sort by date within priority levels"
    }
  }
}
```

---

## Enhanced Features

### Trello Integration Improvements

The backend now automatically:

1. **Uses Native Trello Labels**
   - Creates priority labels (red for urgent, orange for high, yellow for medium, green for low)
   - Creates category labels for task types (bug, meeting, documentation, etc.)
   - Creates custom labels from AI-extracted tags
   - Reuses existing labels when available

2. **Always Sets Due Dates**
   - Uses AI-extracted due dates when available
   - Falls back to smart defaults based on priority:
     - Urgent: Due today
     - High: Due in 3 days
     - Medium: Due in 1 week
     - Low: Due in 2 weeks

---

## Example Frontend Integration

### Dropdown-based Sorting

```javascript
// Fetch dropdown options
const optionsResponse = await fetch('http://localhost:3000/api/task-sort/options');
const options = await optionsResponse.json();

// Populate dropdowns with options.data.sortOptions and options.data.filterOptions

// Sort tasks based on user selection
const sortResponse = await fetch('http://localhost:3000/api/task-sort/sort', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tasks: myTasks,
    sortBy: 'priority',
    filters: ['urgent', 'high']
  })
});

const sortedData = await sortResponse.json();
// Display sortedData.data.tasks
```

### Chat-based Sorting

```javascript
// User enters a prompt like "Show me tasks due this week sorted by priority"
const chatResponse = await fetch('http://localhost:3000/api/task-sort/sort/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tasks: myTasks,
    prompt: userPrompt
  })
});

const sortedData = await chatResponse.json();
// Display sortedData.data.tasks
// Show explanation: sortedData.data.explanation
```

---

## Sample Frontend UI Components

### Dropdown Component

```jsx
<div>
  <select id="sortBy">
    <option value="">Sort By...</option>
    <option value="priority">By Priority</option>
    <option value="name">By Name</option>
    <option value="date">By Date</option>
    <option value="month">By Month</option>
    <option value="year">By Year</option>
  </select>

  <div id="filters">
    <label><input type="checkbox" value="urgent"> Urgent Only</label>
    <label><input type="checkbox" value="high"> High Priority</label>
    <label><input type="checkbox" value="overdue"> Overdue</label>
    <label><input type="checkbox" value="today"> Due Today</label>
    <label><input type="checkbox" value="this-week"> This Week</label>
    <label><input type="checkbox" value="this-month"> This Month</label>
  </div>

  <button id="applySort">Apply Sorting</button>
</div>
```

### Chat Component

```jsx
<div>
  <input
    type="text"
    id="chatPrompt"
    placeholder="e.g., Show me urgent tasks due this week"
  />
  <button id="chatSort">Sort with AI</button>
  <p id="explanation"></p>
</div>
```

---

## Testing with cURL

### Get Options

```bash
curl http://localhost:3000/api/task-sort/options
```

### Sort Tasks (Dropdown)

```bash
curl -X POST http://localhost:3000/api/task-sort/sort \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "name": "Fix bug",
        "priority": "urgent",
        "dueDate": "2025-10-26T00:00:00.000Z"
      },
      {
        "name": "Write docs",
        "priority": "low",
        "dueDate": "2025-11-15T00:00:00.000Z"
      }
    ],
    "sortBy": "priority"
  }'
```

### Sort Tasks (Chat)

```bash
curl -X POST http://localhost:3000/api/task-sort/sort/chat \
  -H "Content-Type: application/json" \
  -d '{
    "tasks": [
      {
        "name": "Fix bug",
        "priority": "urgent",
        "dueDate": "2025-10-26T00:00:00.000Z"
      },
      {
        "name": "Write docs",
        "priority": "low",
        "dueDate": "2025-11-15T00:00:00.000Z"
      }
    ],
    "prompt": "Show me the most important tasks"
  }'
```

---

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common error codes:
- `400`: Invalid request (missing tasks array or prompt)
- `500`: Server error (AI service failure, etc.)

---

## Next Steps for Frontend

1. **Create UI Components**
   - Dropdown for sort options
   - Checkboxes for filter options
   - Text input for chat-based sorting
   - Button to apply sorting

2. **Fetch Tasks**
   - Use `/api/process/test` to extract tasks from sample emails
   - Or use `/api/emails/fetch` and `/api/emails/process` for real emails

3. **Display Sorted Tasks**
   - Show task cards with priority labels
   - Display due dates
   - Show Trello labels

4. **Integration**
   - After sorting, send tasks to Trello via `/api/trello/cards`
   - Tasks will automatically get Trello labels and due dates

---

## Summary of Changes

✅ **New Features:**
- Dropdown-based task sorting (by priority, name, date, month, year)
- Filter options (urgent, high, overdue, today, this week, this month)
- AI-powered chat-based sorting with natural language
- Native Trello label integration (priority, category, custom)
- Smart default due dates based on priority

✅ **Files Created:**
- `src/services/task-sort.service.ts` - Sorting and filtering logic
- `src/controllers/task-sort.controller.ts` - API request handlers
- `src/routes/task-sort.routes.ts` - Route definitions

✅ **Files Modified:**
- `src/routes/index.ts` - Added task-sort routes
- `src/services/email-processor.service.ts` - Enhanced Trello integration

---

## Running the Backend

```bash
cd backend
npm install
npm run dev
```

The API will be available at `http://localhost:3000/api`
