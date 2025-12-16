# Spec Sheet to Trello Card Linking Guide

## Overview
This document explains how spec sheets are now linked to Trello cards created from the task page. The linking is **bidirectional** and **automatic**, ensuring everything is connected properly.

## Architecture

### Data Flow
```
1. Email arrives → Gmail
2. Task extracted → pending_tasks table
3. User generates spec from task → project_specs table + spec_id stored in pending_tasks
4. User approves task → Trello card created + trello_card_id stored in both pending_tasks and project_specs
5. User locks spec → Trello card receives comment notification
```

### Database Schema

#### `pending_tasks` table
- **`spec_id`** (NEW): Links to `project_specs.id` when a spec is generated from this task
- **`trello_card_id`**: Links to Trello card ID when task is approved
- **`email_id`**: Links to source email

#### `project_specs` table
- **`trello_card_id`**: Direct link to the Trello card (populated on task approval)
- **`trello_board_id`**: Board ID for the Trello card
- **`client_id`**: Links to client
- **`user_id`**: Owner of the spec

## How the Linking Works

### Step 1: Generate Spec from Task Email
**Location**: `backend/src/services/scope-management.service.ts:22-64`

When you click "Generate Spec" on a task:
1. Spec is created in `project_specs` table
2. System automatically finds the `pending_tasks` record with matching `email_id`
3. Updates `pending_tasks.spec_id = spec.id`

**Code**:
```typescript
// After creating spec
await db.query(
  'UPDATE pending_tasks SET spec_id = $1 WHERE email_id = $2 AND user_id = $3',
  [result.spec.id, emailId, userId]
);
```

### Step 2: Approve Task (Create Trello Card)
**Location**: `backend/src/controllers/pending-task.controller.ts:232-361`

When you click "Approve" on a task:
1. Trello card is created via API
2. `pending_tasks` record is updated with `trello_card_id`, `board_id`, `list_id`
3. `emails` table is updated with `trello_card_id` (for legacy compatibility)
4. **NEW**: If task has a `spec_id`, the `project_specs` table is also updated with the card info

**Code**:
```typescript
// After creating Trello card
if (task.spec_id) {
  await db.query(
    `UPDATE project_specs SET
      trello_card_id = $1,
      trello_board_id = $2,
      updated_at = NOW()
    WHERE id = $3`,
    [card.id, boardId || null, task.spec_id]
  );
}
```

### Step 3: Lock Spec (Sync to Trello)
**Location**: `backend/src/services/spec.service.ts:150-194`

When you lock a spec:
1. System looks for `trello_card_id` directly on the spec (fast path)
2. If not found, searches `pending_tasks` table for linked card
3. If found via task, stores the card ID on the spec for future use
4. Adds a comment to the Trello card: "🔒 Project Specification Locked"

**Code**:
```typescript
// Method 1: Direct link (populated on task approval)
let cardId = spec.trello_card_id;

// Method 2: Via linked pending task
if (!cardId) {
  const taskResult = await db.query(
    'SELECT trello_card_id FROM pending_tasks WHERE spec_id = $1 LIMIT 1',
    [specId]
  );
  if (taskResult.rows.length > 0) {
    cardId = taskResult.rows[0].trello_card_id;
    // Store for future use
    await db.query('UPDATE project_specs SET trello_card_id = $1 WHERE id = $2', [cardId, specId]);
  }
}
```

## Usage Scenarios

### Scenario A: Standard Flow (Spec → Approve → Lock)
1. ✉️ Email arrives → Task created
2. 📝 Click "Generate Spec" → Spec created, `pending_tasks.spec_id` set
3. ✅ Click "Approve" → Trello card created, `project_specs.trello_card_id` set
4. 🔒 Lock spec → Comment added to Trello card

**Result**: Everything is linked! Spec knows its card, task knows its spec.

### Scenario B: Approve First, Generate Spec Later
1. ✉️ Email arrives → Task created
2. ✅ Click "Approve" → Trello card created, `pending_tasks.trello_card_id` set
3. 📝 Click "Generate Spec" → Spec created, `pending_tasks.spec_id` set
4. **Gap**: Spec doesn't have `trello_card_id` yet!
5. 🔒 Lock spec → System finds card via `pending_tasks` lookup, stores it on spec

**Result**: Linking works via fallback mechanism.

### Scenario C: Multiple Tasks for Same Client
1. ✉️ Email 1 arrives → Task 1 created
2. ✉️ Email 2 arrives → Task 2 created
3. 📝 Generate spec from Email 1 → Task 1 linked
4. ✅ Approve Task 1 → Card 1 created and linked to spec
5. ✅ Approve Task 2 → Card 2 created (not linked to spec)
6. 🔒 Lock spec → Spec uses Card 1 (correct one)

**Result**: No confusion! Each spec links to its specific task's card.

## API Endpoints

### Generate Spec from Email
```http
POST /api/v1/specs/generate
Content-Type: application/json

{
  "emailId": "gmail_message_id_here"
}
```

**Response**:
```json
{
  "spec": {
    "id": "spec-uuid",
    "project_name": "Project Name",
    "trello_card_id": null  // Will be populated on task approval
  }
}
```

### Approve Pending Task
```http
POST /api/v1/tasks/pending/:id/approve
Content-Type: application/json

{
  "listId": "trello_list_id",
  "boardId": "trello_board_id"
}
```

**Response**:
```json
{
  "message": "Task approved and Trello card created",
  "task": {
    "id": "task-uuid",
    "spec_id": "spec-uuid",  // If spec was generated
    "trello_card_id": "trello_card_id"
  },
  "card": {
    "id": "trello_card_id",
    "name": "Task Title"
  }
}
```

### Lock Spec
```http
POST /api/v1/specs/:id/lock
```

**What happens**:
- Spec status → `locked`
- Trello card receives comment notification
- Spec stores `trello_card_id` if not already set

## Database Queries

### Find spec from task
```sql
SELECT spec_id FROM pending_tasks WHERE id = 'task-uuid';
```

### Find card from spec
```sql
SELECT trello_card_id FROM project_specs WHERE id = 'spec-uuid';
```

### Find all specs for a Trello card
```sql
SELECT * FROM project_specs WHERE trello_card_id = 'trello-card-id';
```

### Find task that created a spec
```sql
SELECT pt.*
FROM pending_tasks pt
WHERE pt.spec_id = 'spec-uuid';
```

## Migration

The linking was added via migration:
```sql
-- File: migrations/004_add_spec_id_to_pending_tasks.sql

ALTER TABLE pending_tasks
ADD COLUMN spec_id UUID REFERENCES project_specs(id) ON DELETE SET NULL;

CREATE INDEX idx_pending_tasks_spec_id ON pending_tasks(spec_id);
```

**To run**:
```bash
cd backend
npx ts-node run-migration.ts
```

## Troubleshooting

### Issue: Spec can't find Trello card
**Symptoms**: When locking spec, error "No linked Trello card found"

**Solutions**:
1. Check if task was approved: `SELECT trello_card_id FROM pending_tasks WHERE spec_id = 'spec-uuid'`
2. Check if email has card: `SELECT trello_card_id FROM emails WHERE gmail_id = 'email-id'`
3. Manually link card: `UPDATE project_specs SET trello_card_id = 'card-id' WHERE id = 'spec-uuid'`

### Issue: Task doesn't link to spec
**Symptoms**: After generating spec, `pending_tasks.spec_id` is NULL

**Solutions**:
1. Check if email_id matches: Both spec and task must have same `email_id`
2. Manually link: `UPDATE pending_tasks SET spec_id = 'spec-uuid' WHERE email_id = 'email-id'`

### Issue: Multiple specs for same email
**Symptoms**: Multiple specs generated from same email

**Solution**:
- This is allowed! Each spec can link to the same task.
- Only the first spec will auto-link when task is approved.
- Other specs use fallback mechanism to find card.

## Frontend Implementation

### Task Page Flow
**Location**: `frontend/src/app/(protected)/tasks/page.tsx`

```typescript
// Generate Spec Button
const handleGenerateSpec = async (emailId: string) => {
  const result = await specApi.generateSpec(emailId);
  router.push(`/specs/${result.spec.id}`);
};

// Approve Task Button
const handleApprove = async (task: PendingTask) => {
  await approveTask.mutateAsync({
    taskId: task.id,
    listId: selectedListId,
    boardId: selectedBoardId
  });
  // Refetch tasks
  refetch();
};
```

## Best Practices

1. **Always approve tasks before locking specs** to ensure direct linking
2. **Generate specs before approving** if you want immediate linkage
3. **Use the same email for both spec generation and task** to maintain relationships
4. **Check `trello_card_id` on spec** before locking to verify linkage
5. **Don't delete tasks** that have linked specs (foreign key prevents this anyway)

## Future Enhancements

Potential improvements:
- [ ] UI indicator showing which tasks have specs
- [ ] UI indicator showing which specs have Trello cards
- [ ] Bulk linking tool for retroactive connections
- [ ] Webhook from Trello to update specs when cards change
- [ ] Spec ID in Trello card custom fields
- [ ] "View in Trello" button on spec page
- [ ] "View Spec" button on task page

---

**Last Updated**: 2025-11-28
**Migration**: 004_add_spec_id_to_pending_tasks.sql
**Status**: ✅ Complete and Tested
