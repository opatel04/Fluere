# API Integration Summary for Backend Team

## Base URL
- **Expected**: `http://localhost:3000/api/v1` (or value from `NEXT_PUBLIC_API_URL` env variable)
- **Current Frontend Config**: Defaults to `http://localhost:3000/api/v1` if env var not set

## Expected Response Format
All API responses must follow this structure:
```json
{
  "success": true,
  "data": {
    // Resource-specific data (see endpoints below)
  }
}
```

## Required Endpoints

### Clients
- **GET** `/api/v1/clients`
  - Response: `{ "success": true, "data": { "clients": Client[] } }`

- **GET** `/api/v1/clients/:id`
  - Response: `{ "success": true, "data": { "client": Client } }`

### Tasks
- **GET** `/api/v1/tasks` (optional query: `?client_id=xxx`)
  - Response: `{ "success": true, "data": { "tasks": Task[] } }`

- **GET** `/api/v1/tasks/:id`
  - Response: `{ "success": true, "data": { "task": Task } }`

- **POST** `/api/v1/tasks`
- **PATCH** `/api/v1/tasks/:id`
- **DELETE** `/api/v1/tasks/:id`

### Emails
- **GET** `/api/v1/emails` (optional query: `?client_id=xxx`)
  - Response: `{ "success": true, "data": { "emails": Email[] } }`

- **GET** `/api/v1/emails/:id`
  - Response: `{ "success": true, "data": { "email": Email } }`

- **PATCH** `/api/v1/emails/:id` (for status updates)

## Common Issues to Check
1. ✅ CORS headers configured for frontend origin
2. ✅ All endpoints return the `{ success, data }` wrapper format
3. ✅ Base URL matches `/api/v1` prefix
4. ✅ Content-Type header is `application/json`
5. ✅ Error responses follow consistent format

## Testing
Frontend expects data to load immediately on page navigation. If states aren't loading, check:
- Network tab for failed requests
- Response format matches expected structure
- CORS errors in browser console

