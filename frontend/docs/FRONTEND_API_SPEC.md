# Frontend API Integration Specification
## Guide for Backend Developers

**Last Updated:** January 2025  
**Frontend Base URL:** Configured via `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3000/api/v1`)  
**Backend Base URL:** `https://tasksnap-v2-production.up.railway.app/api/v1`

---

## Table of Contents
1. [Authentication](#authentication)
2. [Response Format](#response-format)
3. [Pages & API Endpoints](#pages--api-endpoints)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)

---

## Authentication

**Current Status:** Frontend uses mock authentication. Backend should implement JWT-based auth.

**Required Headers for Authenticated Endpoints:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Auth Flow (To Be Implemented):**
- Login: `POST /api/v1/auth/login` → Returns JWT token
- Signup: `POST /api/v1/auth/signup` → Returns JWT token
- Token stored in frontend and sent with all authenticated requests

---

## Response Format

**All API responses MUST follow this structure:**

```json
{
  "success": true,
  "data": {
    // Resource-specific data
  },
  "message": "Optional success message",
  "count": 10  // Optional: for list endpoints
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "message": "Error description",
    "details": {}  // Optional additional error details
  }
}
```

---

## Pages & API Endpoints

### 1. Landing Page (`/`)
**Description:** Public marketing page. No API calls.

**API Endpoints Used:** None

---

### 2. Login Page (`/login`)
**Description:** User authentication form.

**API Endpoints Used:**
- **POST** `/api/v1/auth/login`
  - **Request Body:**
    ```json
    {
      "email": "user@example.com",
      "password": "password123"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "user": {
          "id": "uuid",
          "name": "User Name",
          "email": "user@example.com"
        },
        "token": "jwt_token_string"
      }
    }
    ```
  - **Status Codes:** 200 (success), 401 (invalid credentials), 400 (validation error)

---

### 3. Signup Page (`/signup`)
**Description:** New user registration form.

**API Endpoints Used:**
- **POST** `/api/v1/auth/signup`
  - **Request Body:**
    ```json
    {
      "name": "User Name",
      "email": "user@example.com",
      "password": "password123"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "user": {
          "id": "uuid",
          "name": "User Name",
          "email": "user@example.com"
        },
        "token": "jwt_token_string"
      }
    }
    ```
  - **Status Codes:** 201 (created), 400 (validation error), 409 (email exists)

---

### 4. Dashboard Page (`/dashboard`)
**Description:** Overview page showing statistics and recent activity.

**API Endpoints Used:**
- **GET** `/api/v1/clients` (to count total clients)
  - **Headers:** `Authorization: Bearer <token>`
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "clients": [ /* Client[] */ ]
      },
      "count": 10
    }
    ```

- **GET** `/api/v1/tasks` (to count active tasks)
  - **Headers:** `Authorization: Bearer <token>`
  - **Query Params:** `status=open&status=in_progress` (optional)
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "tasks": [ /* Task[] */ ]
      },
      "count": 5
    }
    ```

- **GET** `/api/v1/emails/inbound` (to count unread emails)
  - **Headers:** `Authorization: Bearer <token>`
  - **Query Params:** `status=unread` (optional)
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "emails": [ /* Email[] */ ]
      },
      "count": 3
    }
    ```

**Note:** Currently displays hardcoded zeros. Will fetch real data when endpoints are integrated.

---

### 5. Clients List Page (`/clients`)
**Description:** Displays all clients in a grid layout with filtering and search.

**API Endpoints Used:**
- **GET** `/api/v1/clients`
  - **Headers:** `Authorization: Bearer <token>`
  - **Query Params (all optional):**
    - `status`: `'active' | 'at_risk' | 'churned'`
    - `minHealthScore`: `number` (0-100)
    - `maxHealthScore`: `number` (0-100)
    - `searchQuery`: `string` (searches name, email, company)
    - `sortBy`: `'name' | 'last_contact' | 'health_score' | 'email_count'`
    - `sortOrder`: `'asc' | 'desc'`
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "clients": [
          {
            "id": "uuid",
            "name": "Client Name",
            "email": "client@example.com",
            "status": "active",
            "health_score": 85
          }
        ]
      },
      "count": 10
    }
    ```
  - **Status Codes:** 200 (success), 401 (unauthorized)

**Future Endpoints (UI buttons exist but not implemented):**
- **POST** `/api/v1/clients` - Create new client
  - **Request Body:**
    ```json
    {
      "email": "newclient@example.com",
      "name": "Client Name",
      "company": "Company Name",
      "phone": "+1234567890",
      "notes": "Notes"
    }
    ```

---

### 6. Client Detail Page (`/clients/[id]`)
**Description:** Shows detailed client information with tabs for overview, tasks, and emails.

**API Endpoints Used:**
- **GET** `/api/v1/clients/:id`
  - **Headers:** `Authorization: Bearer <token>`
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "client": {
          "id": "uuid",
          "userId": "uuid",
          "email": "client@example.com",
          "name": "Client Name",
          "company": "Company Name",
          "phone": "+1234567890",
          "emailCount": 25,
          "firstContactDate": "2025-01-01T00:00:00Z",
          "lastContactDate": "2025-01-06T00:00:00Z",
          "status": "active",
          "healthScore": 85,
          "healthUpdatedAt": "2025-01-06T00:00:00Z",
          "notes": "VIP client",
          "metadata": {},
          "createdAt": "2025-01-01T00:00:00Z",
          "updatedAt": "2025-01-06T00:00:00Z"
        }
      }
    }
    ```
  - **Status Codes:** 200 (success), 404 (not found), 401 (unauthorized)

**Future Endpoints (tabs not yet implemented):**
- **GET** `/api/v1/clients/:id/tasks` - Get client's tasks
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "tasks": [ /* Task[] */ ]
      }
    }
    ```

- **GET** `/api/v1/clients/:id/emails` - Get client's emails
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "emails": [ /* Email[] */ ]
      }
    }
    ```

- **GET** `/api/v1/clients/:id/stats` - Get client statistics
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "stats": {
          "overview": {
            "totalTasks": 50,
            "completedTasks": 30,
            "overdueTasks": 5,
            "pendingTasks": 15,
            "totalEmails": 100,
            "healthScore": 85
          }
        }
      }
    }
    ```

---

### 7. Emails List Page (`/emails`)
**Description:** Displays all emails with tabs for filtering (All, Unread, Read, Archived).

**API Endpoints Used:**
- **GET** `/api/v1/emails/inbound`
  - **Headers:** `Authorization: Bearer <token>`
  - **Query Params (optional):**
    - `client_id`: `string` (filter by client)
    - `status`: `'unread' | 'read' | 'archived'`
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "emails": [
          {
            "id": "uuid",
            "subject": "Email Subject",
            "body": "Email body text",
            "from": "sender@example.com",
            "to": "recipient@example.com",
            "date": "2025-01-06T12:00:00Z",
            "client_id": "uuid",
            "status": "unread",
            "created_at": "2025-01-06T12:00:00Z",
            "updated_at": "2025-01-06T12:00:00Z"
          }
        ]
      },
      "count": 20
    }
    ```
  - **Status Codes:** 200 (success), 401 (unauthorized)

**Frontend Behavior:**
- Filters emails client-side by status (unread/read/archived)
- Displays counts for each tab

**Future Endpoints:**
- **POST** `/api/v1/emails` - Manually add email (button exists but not implemented)

---

### 8. Email Detail Page (`/emails/[id]`)
**Description:** Shows full email content with AI task extraction and status management.

**API Endpoints Used:**
- **GET** `/api/v1/emails/inbound/:id`
  - **Headers:** `Authorization: Bearer <token>`
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "email": {
          "id": "uuid",
          "userId": "uuid",
          "from": "sender@example.com",
          "to": "recipient@example.com",
          "subject": "Email Subject",
          "body": "Full email body text",
          "receivedAt": "2025-01-06T12:00:00Z",
          "processedAt": null,
          "status": "unread",
          "client_id": "uuid"
        }
      }
    }
    ```
  - **Status Codes:** 200 (success), 404 (not found), 401 (unauthorized)

- **PATCH** `/api/v1/emails/inbound/:id` - Update email status
  - **Headers:** `Authorization: Bearer <token>`
  - **Request Body:**
    ```json
    {
      "status": "read" | "archived" | "unread"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "email": { /* Updated email object */ }
      }
    }
    ```
  - **Status Codes:** 200 (success), 400 (validation error), 404 (not found)

- **POST** `/api/v1/emails/:id/extract-tasks` - Extract tasks from email using AI
  - **Headers:** `Authorization: Bearer <token>`
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "suggestions": [
          {
            "id": "uuid",
            "title": "Follow up on email",
            "description": "Schedule a response to this email",
            "confidence": 0.85,
            "email_id": "uuid",
            "suggested_status": "open",
            "suggested_priority": "high",
            "suggested_due_date": "2025-01-08T12:00:00Z"
          }
        ]
      }
    }
    ```
  - **Status Codes:** 200 (success), 400 (error), 404 (email not found)

**Note:** AI extraction endpoint may take time. Frontend shows loading state during extraction.

---

### 9. Tasks Page (`/tasks`)
**Description:** Kanban board view with three columns: Open, In Progress, Completed.

**API Endpoints Used:**
- **GET** `/api/v1/tasks`
  - **Headers:** `Authorization: Bearer <token>`
  - **Query Params (optional):**
    - `client_id`: `string` (filter by client)
    - `status`: `'open' | 'in_progress' | 'completed'` (can pass multiple)
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "tasks": [
          {
            "id": "uuid",
            "title": "Task Title",
            "description": "Task description",
            "status": "open",
            "priority": "high",
            "client_id": "uuid",
            "due_date": "2025-01-10T12:00:00Z",
            "created_at": "2025-01-06T12:00:00Z",
            "updated_at": "2025-01-06T12:00:00Z",
            "source": "email",
            "email_id": "uuid"
          }
        ]
      },
      "count": 15
    }
    ```
  - **Status Codes:** 200 (success), 401 (unauthorized)

- **PATCH** `/api/v1/tasks/:id` - Update task status (when user moves task between columns)
  - **Headers:** `Authorization: Bearer <token>`
  - **Request Body:**
    ```json
    {
      "status": "open" | "in_progress" | "completed"
    }
    ```
  - **Response:**
    ```json
    {
      "success": true,
      "data": {
        "task": { /* Updated task object */ }
      }
    }
    ```
  - **Status Codes:** 200 (success), 400 (validation error), 404 (not found)

**Frontend Behavior:**
- Sorts tasks by priority (high > medium > low), then by due date
- Groups tasks into columns by status
- Updates task status when user clicks on task card

**Future Endpoints:**
- **POST** `/api/v1/tasks` - Create new task (button exists but not implemented)
  - **Request Body:**
    ```json
    {
      "title": "Task Title",
      "description": "Task description",
      "status": "open",
      "priority": "medium",
      "client_id": "uuid",
      "due_date": "2025-01-10T12:00:00Z"
    }
    ```

- **DELETE** `/api/v1/tasks/:id` - Delete task (not yet implemented in UI)

---

## Data Models

### Client
```typescript
{
  id: string;                    // UUID
  userId: string;                 // UUID
  email: string;
  name?: string;
  company?: string;
  phone?: string;
  emailCount: number;
  firstContactDate: string;       // ISO 8601
  lastContactDate: string;        // ISO 8601
  status: 'active' | 'at_risk' | 'churned';
  healthScore: number;            // 0-100
  healthUpdatedAt?: string;       // ISO 8601
  notes?: string;
  metadata?: object;
  createdAt: string;              // ISO 8601
  updatedAt: string;              // ISO 8601
}
```

### Task
```typescript
{
  id: string;                     // UUID
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  client_id?: string;             // UUID
  due_date?: string;              // ISO 8601
  created_at: string;             // ISO 8601
  updated_at: string;             // ISO 8601
  source?: 'email' | 'manual';
  email_id?: string;              // UUID (if created from email)
}
```

### Email (Inbound)
```typescript
{
  id: string;                     // UUID
  userId: string;                 // UUID
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt: string;             // ISO 8601
  processedAt?: string;           // ISO 8601
  status: 'unread' | 'read' | 'archived';
  client_id?: string;             // UUID
  created_at?: string;            // ISO 8601
  updated_at?: string;            // ISO 8601
}
```

### AI Task Suggestion
```typescript
{
  id: string;                     // UUID
  title: string;
  description: string;
  confidence: number;             // 0-1
  email_id: string;               // UUID
  suggested_status?: 'open' | 'in_progress' | 'completed';
  suggested_priority?: 'low' | 'medium' | 'high';
  suggested_due_date?: string;   // ISO 8601
}
```

---

## Error Handling

**HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (valid token but insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limit)
- `500` - Internal Server Error

**Frontend Error Handling:**
- All API errors are caught and displayed via toast notifications
- Loading states shown during API calls
- Error states displayed on pages when requests fail
- React Query handles retries and caching automatically

**Expected Error Response Format:**
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "details": {
      // Optional: field-specific errors
      "email": "Invalid email format"
    }
  }
}
```

---

## Implementation Notes

### Current Status
- ✅ Frontend UI is complete for all pages
- ⚠️ Currently using mock data (hardcoded in query hooks)
- ⚠️ Authentication is mocked (no real JWT flow)
- ⚠️ Some endpoints are stubs in backend (see Backend API Report)

### Integration Checklist
- [ ] Implement JWT authentication endpoints (`/auth/login`, `/auth/signup`)
- [ ] Ensure all endpoints return `{ success, data }` wrapper format
- [ ] Add CORS headers for frontend origin
- [ ] Implement task endpoints (currently stubs)
- [ ] Implement email extraction endpoint
- [ ] Add pagination support for list endpoints (optional)
- [ ] Implement rate limiting with proper error responses
- [ ] Add request/response logging for debugging

### Environment Variables
Frontend expects:
- `NEXT_PUBLIC_API_URL` - Backend API base URL (defaults to `http://localhost:3000/api/v1`)

### Testing Recommendations
1. Test all endpoints with Postman/Insomnia first
2. Verify response format matches specification
3. Test authentication flow end-to-end
4. Test error scenarios (invalid token, missing data, etc.)
5. Verify CORS works from frontend origin
6. Test rate limiting behavior

---

## Contact

For questions or clarifications, refer to:
- Backend API Report: `Backend_api_endpoint_report`
- Frontend API Client: `src/lib/api/client.ts`
- Frontend Query Hooks: `src/lib/api/queries/`

---

**End of Specification**

