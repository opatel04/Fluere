# Board Automation - Quick Start Guide

## 🚀 What You Can Do Now

Your TaskSnap API now has **full board automation** capabilities! Cards are automatically sorted into the right lists based on intelligent rules.

---

## 📋 Quick Examples

### 1. Apply a Template to Your Board

```bash
# Get available templates
curl http://localhost:3000/api/v1/board-automation/templates | jq

# Apply Priority-Based template to your board
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
      }
    ]
  }'

# Initialize board (creates the lists)
curl -X POST http://localhost:3000/api/v1/board-automation/YOUR_BOARD_ID/initialize \
  -H "Content-Type: application/json" \
  -d '{ "userId": "YOUR_USER_ID" }'
```

---

### 2. Create a Custom List

```bash
curl -X POST http://localhost:3000/api/v1/board-automation/YOUR_BOARD_ID/lists \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "name": "In Review",
    "position": "top"
  }'
```

---

### 3. Move a Card

```bash
curl -X POST http://localhost:3000/api/v1/board-automation/cards/CARD_ID/move \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "targetListId": "TARGET_LIST_ID",
    "position": "top"
  }'
```

---

### 4. Test Where a Task Would Be Routed

```bash
curl -X POST http://localhost:3000/api/v1/board-automation/YOUR_BOARD_ID/test-routing \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "task": {
      "name": "Fix critical bug",
      "priority": "urgent",
      "category": "bug"
    }
  }'
```

---

### 5. Process Emails (Automatic Routing)

```bash
# Process your inbox - cards automatically routed!
curl -X POST http://localhost:3000/api/v1/automation/process-inbox \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "maxEmails": 50
  }'
```

---

## 🎯 Routing Condition Examples

### By Priority
```json
{
  "condition": {
    "type": "priority",
    "operator": "equals",
    "value": "urgent"
  }
}
```

### By Category
```json
{
  "condition": {
    "type": "category",
    "operator": "equals",
    "value": "meeting"
  }
}
```

### By Keywords
```json
{
  "condition": {
    "type": "keyword",
    "operator": "contains",
    "value": ["urgent", "asap", "critical"]
  }
}
```

### By Due Date
```json
{
  "condition": {
    "type": "dueDate",
    "operator": "lessThan",
    "value": 3
  }
}
```

### By Label
```json
{
  "condition": {
    "type": "label",
    "operator": "contains",
    "value": ["customer", "urgent"]
  }
}
```

---

## 📚 Full Documentation

- **API Reference:** `BOARD-AUTOMATION-API.md`
- **Implementation Details:** `BOARD-AUTOMATION-SUMMARY.md`
- **Test Results:** `TEST-RESULTS.md`

---

## ✅ Verified Working

- ✅ Create lists via API
- ✅ Move cards between lists
- ✅ User-configurable board layouts
- ✅ Smart routing rules (priority, category, keywords, dates, labels)
- ✅ Automatic board initialization
- ✅ Template system for quick setup
- ✅ Integrated with email processing
- ✅ Database persistence
- ✅ Graceful fallbacks

---

## 🎨 Frontend Integration Ideas

1. **Board Setup Wizard**
   - Template selection
   - Drag-and-drop list ordering
   - Visual rule builder

2. **Kanban Board View**
   - Drag cards between lists
   - Filter by labels/priority
   - Inline card editing

3. **Routing Rules Dashboard**
   - Enable/disable rules
   - Test routing with sample tasks
   - Analytics on rule usage

4. **Email Preview**
   - Show where tasks will be routed before processing
   - Bulk actions (process selected emails)

---

## 🔥 Test It Now!

```bash
# Start server (if not running)
npm run dev

# Run automated tests
node test-board-automation.js
```

**All tests should pass! ✅**

---

## 💡 Pro Tips

1. **Use high priority numbers** (100, 90, 80) for more specific rules
2. **Rules are evaluated in priority order** - highest first
3. **Always initialize board** after configuration changes
4. **Test routing** before processing emails
5. **Use templates** as starting points, then customize

---

## 🎉 What's Next?

Your backend is **fully functional** and ready for frontend development!

Build a beautiful UI that lets users:
- Configure their boards visually
- See live routing previews
- Manage cards with drag-and-drop
- View analytics on task distribution

**The API is ready to power your frontend! 🚀**
