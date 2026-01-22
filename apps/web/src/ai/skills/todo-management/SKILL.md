---
name: todo-management
description: Manage user's todo list using getTodos, createTodo, updateTodo, and deleteTodo tools. Use when user asks about their tasks, wants to add/edit todos, or needs to track assignments and deadlines.
---

# Todo Management

Manage user's todo list with full CRUD operations and Canvas integration.

## Quick Start

### Get todos by view

```python
import json

# Get todos for different views
result = await getTodos({"view": "today"})
todos = json.loads(result)

for todo in todos:
    print(f"{'✓' if todo['checked'] else '○'} {todo['title']}")
```

**Critical points:**
- Parameter is `view` (string), passed as dictionary: `{"view": "today"}`
- Tool returns a JSON string, not a Python object
- You MUST use `json.loads()` to parse the result
- Each todo includes full metadata (dates, Canvas links, subtasks)

### Available views

- `"today"` - Tasks scheduled for today or overdue
- `"upcoming"` - Tasks with future scheduled dates
- `"anytime"` - Tasks with no specific date
- `"someday"` - Tasks for later/maybe
- `"active"` - All uncompleted tasks
- `"logbook"` - Completed tasks (supports optional `limit` parameter)

For detailed field structure, see [REFERENCE.md](REFERENCE.md).

## Common Workflows

### Display today's tasks

```python
import json

result = await getTodos({"view": "today"})
todos = json.loads(result)

if todos:
    print(f"You have {len(todos)} task(s) for today:\n")
    for idx, todo in enumerate(todos, 1):
        status = "✓" if todo["checked"] else "○"
        print(f"{idx}. {status} {todo['title']}")
        
        if todo.get("dueDate"):
            print(f"   Due: {todo['dueDate']}")
        
        # Show subtasks if present
        if todo.get("subTasks"):
            completed = sum(1 for st in todo["subTasks"] if st["checked"])
            total = len(todo["subTasks"])
            print(f"   Subtasks: {completed}/{total} complete")
else:
    print("No tasks for today!")
```

### Create todo from Canvas assignment

```python
import json

# Get upcoming assignments
assignments_result = await getClassAssignments({"filter": "upcoming"})
assignments = json.loads(assignments_result)

# Create todos for each
for assignment in assignments[:5]:  # Limit to 5
    result = await createTodo({
        "title": f"Complete {assignment['name']}",
        "dueDate": assignment['due_at'],
        "dateType": "calendar",
        "canvasContentType": "assignment",
        "canvasContentId": assignment['id'],
        "canvasClassId": int(assignment['_classId'])
    })
    todo = json.loads(result)
    print(f"Created: {todo['title']}")
```

### Mark todo as complete

```python
import json

# Find and complete a specific todo
result = await getTodos({"view": "active"})
todos = json.loads(result)

for todo in todos:
    if "math homework" in todo["title"].lower():
        update_result = await updateTodo({
            "id": todo["id"],
            "checked": True
        })
        updated = json.loads(update_result)
        print(f"Completed: {updated['title']}")
        break
```

### Add subtasks to existing todo

```python
import json

# Get a todo and add subtasks
result = await getTodos({"view": "today"})
todos = json.loads(result)

essay_todo = next((t for t in todos if "essay" in t["title"].lower()), None)

if essay_todo:
    await updateTodo({
        "id": essay_todo["id"],
        "subTasks": [
            {"id": "1", "title": "Research sources", "checked": False},
            {"id": "2", "title": "Write outline", "checked": False},
            {"id": "3", "title": "Write draft", "checked": False},
            {"id": "4", "title": "Edit and revise", "checked": False}
        ]
    })
    print("Added subtasks to essay")
```

### View completed tasks

```python
import json
from datetime import datetime, timezone, timedelta

result = await getTodos({"view": "logbook", "limit": 20})
todos = json.loads(result)

# Filter to last 7 days
week_ago = datetime.now(timezone.utc) - timedelta(days=7)

recent = [t for t in todos 
          if t.get("completedAt") and 
          datetime.fromisoformat(t["completedAt"]) >= week_ago]

print(f"You completed {len(recent)} task(s) this week:")
for todo in recent:
    completed_at = datetime.fromisoformat(todo["completedAt"])
    print(f"✓ {todo['title']} - {completed_at.strftime('%A')}")
```

### Reschedule tasks

```python
import json
from datetime import datetime, timezone, timedelta

# Get anytime tasks and schedule them
result = await getTodos({"view": "anytime"})
todos = json.loads(result)

tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()

if todos:
    # Schedule first task for tomorrow
    await updateTodo({
        "id": todos[0]["id"],
        "dateType": "calendar",
        "scheduledDate": tomorrow
    })
    print(f"Scheduled '{todos[0]['title']}' for tomorrow")
```

## Important Patterns

### Always parse JSON responses

All todo tools return JSON strings:

```python
import json

# Wrong: Treating result as object
result = await getTodos({"view": "today"})
for todo in result:  # TypeError: string is not iterable
    print(todo["title"])

# Correct: Parse JSON first
result = await getTodos({"view": "today"})
todos = json.loads(result)
for todo in todos:
    print(todo["title"])
```

### Safe field access

Many fields can be `None`:

```python
# Safe access to optional fields
due_date = todo.get("dueDate")
if due_date:
    # Process due date
    pass

# Check for subtasks
sub_tasks = todo.get("subTasks")
if sub_tasks:
    completed = [st for st in sub_tasks if st["checked"]]
    print(f"{len(completed)}/{len(sub_tasks)} subtasks complete")

# Check for Canvas link
if todo.get("canvasContentId"):
    print(f"Linked to Canvas {todo['canvasContentType']} #{todo['canvasContentId']}")
```

### Date handling

All dates are ISO 8601 strings:

```python
from datetime import datetime, timezone

# Parse ISO date from todo
if todo.get("dueDate"):
    due_date = datetime.fromisoformat(todo["dueDate"])
    now = datetime.now(timezone.utc)
    
    if due_date < now:
        print("Overdue!")
    else:
        days_left = (due_date - now).days
        print(f"{days_left} days until due")
```

### Generating unique IDs for subtasks

When creating subtasks, generate unique IDs:

```python
import uuid

subtasks = [
    {"id": str(uuid.uuid4()), "title": "Step 1", "checked": False},
    {"id": str(uuid.uuid4()), "title": "Step 2", "checked": False},
]

await createTodo({
    "title": "Multi-step task",
    "subTasks": subtasks
})
```

## Common Errors to Avoid

### ❌ Wrong: Forgetting to parse JSON
```python
result = await getTodos({"view": "today"})
for todo in result:  # TypeError: string is not iterable
    print(todo["title"])
```

### ✅ Correct: Parse JSON string first
```python
import json
result = await getTodos({"view": "today"})
todos = json.loads(result)
for todo in todos:
    print(todo["title"])
```

---

### ❌ Wrong: Assuming fields always exist
```python
print(f"Due: {todo['dueDate']}")  # KeyError if no due date
```

### ✅ Correct: Safe access with .get()
```python
due_date = todo.get("dueDate")
if due_date:
    print(f"Due: {due_date}")
```

---

### ❌ Wrong: Using timezone-naive datetime
```python
from datetime import datetime

now = datetime.now()  # No timezone info
due_date = datetime.fromisoformat(todo["dueDate"])
if due_date < now:  # TypeError: can't compare offset-naive and offset-aware
    print("Overdue")
```

### ✅ Correct: Timezone-aware datetime
```python
from datetime import datetime, timezone

now = datetime.now(timezone.utc)  # UTC timezone
due_date = datetime.fromisoformat(todo["dueDate"])
if due_date < now:  # Works correctly
    print("Overdue")
```

---

### ❌ Wrong: Not handling create/update responses
```python
await createTodo({"title": "New task"})
# Lost the created todo ID!
```

### ✅ Correct: Capture and parse response
```python
import json
result = await createTodo({"title": "New task"})
todo = json.loads(result)
print(f"Created todo with ID: {todo['id']}")
```

## Canvas Integration

### Link todos to Canvas assignments

```python
import json

# Get assignment details
assignments_result = await getClassAssignments({"classId": "12345"})
assignments = json.loads(assignments_result)

assignment = assignments[0]

# Create linked todo
result = await createTodo({
    "title": f"Complete {assignment['name']}",
    "dueDate": assignment['due_at'],
    "canvasContentType": "assignment",
    "canvasContentId": assignment['id'],
    "canvasClassId": assignment['course_id']
})
```

### Find todos linked to Canvas

```python
import json

result = await getTodos({"view": "active"})
todos = json.loads(result)

# Filter Canvas-linked todos
canvas_todos = [t for t in todos if t.get("canvasContentId")]

print(f"You have {len(canvas_todos)} Canvas-linked tasks:")
for todo in canvas_todos:
    print(f"- {todo['title']} ({todo['canvasContentType']})")
```

## Date Types Explained

### calendar
Specific date and time:
```python
await createTodo({
    "title": "Dentist appointment",
    "dateType": "calendar",
    "scheduledDate": "2026-01-25T14:00:00Z"
})
```

### calendarEvening
Evening of a specific date:
```python
await createTodo({
    "title": "Study for test",
    "dateType": "calendarEvening",
    "scheduledDate": "2026-01-25T00:00:00Z"  # Date only, implies evening
})
```

### anytime
No specific date (do when you have time):
```python
await createTodo({
    "title": "Clean room",
    "dateType": "anytime"
})
```

### someday
Maybe later (low priority):
```python
await createTodo({
    "title": "Learn guitar",
    "dateType": "someday"
})
```

## When to use this skill

- User asks about their tasks ("what do I have to do today?")
- User wants to create todos ("remind me to...", "add ... to my todo list")
- User wants to mark tasks complete ("I finished...", "mark ... as done")
- User wants to organize tasks (reschedule, add subtasks, update details)
- User asks about completed tasks ("what did I finish?")
- Creating todos from Canvas assignments
- Tracking assignment deadlines

## Reference

For complete todo field documentation, type definitions, and detailed examples, see [REFERENCE.md](REFERENCE.md).
