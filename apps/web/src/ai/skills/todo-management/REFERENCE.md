# Todo Management API Reference

Complete reference for todo management tools and data structures.

## Tool APIs

### getTodos

Fetch todos filtered by view type.

**Parameters:**

- `view` (string, required): Which view to fetch
  - `"today"` - Tasks scheduled for today or overdue
  - `"upcoming"` - Tasks with future scheduled dates
  - `"anytime"` - Tasks with no specific date
  - `"someday"` - Tasks for later/maybe
  - `"active"` - All uncompleted tasks
  - `"logbook"` - Completed tasks
- `limit` (number, optional): For logbook view only, limit results (default: 50)

**Returns:** JSON string containing array of todo objects (must be parsed with `json.loads()`)

**Example:**

```python
import json

# Get today's tasks
result = await getTodos({"view": "today"})
todos = json.loads(result)

# Get last 10 completed tasks
result = await getTodos({"view": "logbook", "limit": 10})
completed = json.loads(result)
```

---

### createTodo

Create a new todo item.

**Parameters:**

- `title` (string, required): The todo title
- `description` (string, optional): Detailed description
- `dateType` (string, optional): When to work on it
  - `"calendar"` - Specific date/time (requires scheduledDate)
  - `"calendarEvening"` - Evening of specific date (requires scheduledDate)
  - `"anytime"` - No specific time (default)
  - `"someday"` - Later/maybe
- `scheduledDate` (string, optional): ISO date string for when to work on it
- `dueDate` (string, optional): ISO date string for deadline
- `subTasks` (array, optional): Array of subtask objects
  - Each subtask: `{id: string, title: string, checked: boolean}`
- `canvasContentType` (string, optional): Type of Canvas content
  - `"assignment"` | `"page"` | `"quiz"` | `"discussion"`
- `canvasContentId` (number, optional): Canvas content ID
- `canvasClassId` (number, optional): Canvas class/course ID

**Returns:** JSON string containing the created todo object

**Example:**

```python
import json

# Simple todo
result = await createTodo({
    "title": "Buy groceries",
    "dateType": "anytime"
})
todo = json.loads(result)

# Todo with due date and Canvas link
result = await createTodo({
    "title": "Complete Math Assignment",
    "dueDate": "2026-01-28T23:59:00Z",
    "dateType": "calendar",
    "scheduledDate": "2026-01-27T15:00:00Z",
    "canvasContentType": "assignment",
    "canvasContentId": 123456,
    "canvasClassId": 78910
})
todo = json.loads(result)

# Todo with subtasks
import uuid
result = await createTodo({
    "title": "Write essay",
    "subTasks": [
        {"id": str(uuid.uuid4()), "title": "Research", "checked": False},
        {"id": str(uuid.uuid4()), "title": "Outline", "checked": False},
        {"id": str(uuid.uuid4()), "title": "Draft", "checked": False}
    ]
})
todo = json.loads(result)
```

---

### updateTodo

Update an existing todo item.

**Parameters:**

- `id` (string, required): The todo ID to update
- `title` (string, optional): New title
- `description` (string, optional): New description
- `checked` (boolean, optional): Mark as complete/incomplete
- `dateType` (string, optional): Change date type
- `scheduledDate` (string, optional): ISO date string for new scheduled date
- `dueDate` (string, optional): ISO date string for new due date
- `subTasks` (array, optional): Updated subtasks array

**Returns:** JSON string containing the updated todo object

**Note:** When setting `checked: true`, `completedAt` is automatically set to current timestamp.

**Example:**

```python
import json

# Mark as complete
result = await updateTodo({
    "id": "abc-123-def-456",
    "checked": True
})
todo = json.loads(result)

# Reschedule
result = await updateTodo({
    "id": "abc-123-def-456",
    "scheduledDate": "2026-01-30T10:00:00Z"
})
todo = json.loads(result)

# Update subtasks (mark one as checked)
result = await updateTodo({
    "id": "abc-123-def-456",
    "subTasks": [
        {"id": "st1", "title": "Research", "checked": True},
        {"id": "st2", "title": "Outline", "checked": False},
        {"id": "st3", "title": "Draft", "checked": False}
    ]
})
todo = json.loads(result)
```

---

### deleteTodo

Delete a todo item permanently.

**Parameters:**

- `id` (string, required): The todo ID to delete

**Returns:** JSON string containing success status and deleted ID

**Note:** This cannot be undone.

**Example:**

```python
import json

result = await deleteTodo({"id": "abc-123-def-456"})
response = json.loads(result)
print(f"Deleted: {response['success']}")  # True
```

## Todo Object Structure

Complete structure of each todo object:

```python
{
    # Identification
    "id": "abc-123-def-456",    # UUID string
    "userId": "user-789",        # User ID (automatically set)
    
    # Core fields
    "title": "Complete homework", # Todo title (string)
    "description": "Math problems 1-20",  # Optional description (string | None)
    "checked": False,            # Completion status (boolean)
    
    # Scheduling
    "dateType": "calendar",      # When to work on it (string)
    "scheduledDate": "2026-01-25T15:00:00Z",  # ISO 8601 string | None
    "dueDate": "2026-01-28T23:59:00Z",        # ISO 8601 string | None
    
    # Subtasks
    "subTasks": [                # Array | None
        {
            "id": "st-1",
            "title": "Problem 1-5",
            "checked": True
        },
        {
            "id": "st-2",
            "title": "Problem 6-10",
            "checked": False
        }
    ],
    
    # Canvas LMS linking
    "canvasContentType": "assignment",  # string | None
    "canvasContentId": 123456,          # number | None
    "canvasClassId": 78910,             # number | None
    
    # Metadata
    "completedAt": "2026-01-26T10:30:00Z",  # ISO 8601 string | None
    "createdAt": "2026-01-20T08:00:00Z",    # ISO 8601 string
    "updatedAt": "2026-01-26T10:30:00Z"     # ISO 8601 string
}
```

## Field Reference

### dateType Values

| Value | Description | Requires scheduledDate? |
|-------|-------------|-------------------------|
| `"calendar"` | Specific date/time to work on it | Yes |
| `"calendarEvening"` | Evening of a specific date | Yes |
| `"anytime"` | No specific time (do when available) | No |
| `"someday"` | Maybe later (low priority) | No |

### canvasContentType Values

| Value | Description |
|-------|-------------|
| `"assignment"` | Canvas assignment |
| `"page"` | Canvas page |
| `"quiz"` | Canvas quiz |
| `"discussion"` | Canvas discussion topic |

### Date Fields

All date fields use ISO 8601 format: `"2026-01-25T15:00:00Z"` (UTC timezone)

- `scheduledDate` - When to work on the task
- `dueDate` - Deadline for the task
- `completedAt` - When the task was marked complete (auto-set)
- `createdAt` - When the todo was created (auto-set)
- `updatedAt` - Last update timestamp (auto-set)

## Date Handling

All dates are ISO 8601 strings with timezone (UTC):

```python
from datetime import datetime, timezone

# Parse date from todo
date_string = "2026-01-25T15:00:00Z"
date_obj = datetime.fromisoformat(date_string)

# CRITICAL: Always use timezone-aware datetime for comparisons
now = datetime.now(timezone.utc)
is_overdue = date_obj < now

# Format for display
formatted = date_obj.strftime("%B %d, %Y at %I:%M %p")
# Output: "January 25, 2026 at 03:00 PM"
```

**⚠️ Common Error**: Using `datetime.now()` without timezone will cause:
```
TypeError: can't compare offset-naive and offset-aware datetimes
```

**Solution**: Always use `datetime.now(timezone.utc)` when comparing with todo dates.

## View Behavior

### today
Returns tasks that are:
- Scheduled for today (calendar/calendarEvening with scheduledDate = today)
- OR overdue (dueDate < tomorrow)
- AND not checked

### upcoming
Returns tasks that are:
- Scheduled in the future (scheduledDate >= today)
- AND not checked

### anytime
Returns tasks that are:
- dateType = "anytime"
- AND not checked

### someday
Returns tasks that are:
- dateType = "someday"
- AND not checked

### active
Returns ALL tasks that are:
- NOT checked
- Sorted by: dueDate, scheduledDate, createdAt (desc)

### logbook
Returns tasks that are:
- checked = true
- Sorted by: completedAt (desc)
- Limited to specified number (default 50)

## Error Handling

```python
import json

try:
    result = await getTodos({"view": "today"})
    todos = json.loads(result)
    
    # Process todos
    for todo in todos:
        print(todo["title"])
        
except json.JSONDecodeError as e:
    print(f"JSON parsing error: {e}")
except KeyError as e:
    print(f"Missing expected field: {e}")
except Exception as e:
    print(f"Error: {e}")
```

## Common Patterns

### Find todo by title

```python
import json

result = await getTodos({"view": "active"})
todos = json.loads(result)

# Find specific todo
todo = next((t for t in todos if "math" in t["title"].lower()), None)
if todo:
    print(f"Found: {todo['title']}")
```

### Filter by Canvas class

```python
import json

result = await getTodos({"view": "active"})
todos = json.loads(result)

# Get todos for specific class
class_todos = [t for t in todos if t.get("canvasClassId") == 78910]
print(f"Found {len(class_todos)} todos for this class")
```

### Calculate subtask progress

```python
def get_progress(todo):
    subtasks = todo.get("subTasks", [])
    if not subtasks:
        return None
    
    completed = sum(1 for st in subtasks if st["checked"])
    total = len(subtasks)
    percentage = (completed / total) * 100
    
    return {
        "completed": completed,
        "total": total,
        "percentage": percentage
    }

# Usage
progress = get_progress(todo)
if progress:
    print(f"{progress['completed']}/{progress['total']} subtasks complete ({progress['percentage']:.0f}%)")
```

## Performance Tips

1. **Use specific views**: Query only the view you need (today, upcoming, etc.)
2. **Limit logbook queries**: Use the `limit` parameter to avoid fetching too many completed tasks
3. **Cache results**: Store todos in a variable if you need to process them multiple times
4. **Batch updates**: If updating multiple todos, process them in a loop efficiently

## Common Pitfalls

1. **JSON Parsing**: Tool returns JSON string, not Python object
   - ❌ Wrong: `for todo in await getTodos(...)`
   - ✅ Correct: `todos = json.loads(await getTodos(...))`

2. **Date Comparison**: Todo dates are timezone-aware
   - ❌ Wrong: `now = datetime.now()` (timezone-naive)
   - ✅ Correct: `now = datetime.now(timezone.utc)` (timezone-aware)

3. **Field Existence**: Many fields are optional (None)
   - ❌ Wrong: `todo["dueDate"]` (KeyError if None)
   - ✅ Correct: `todo.get("dueDate")` (returns None safely)

4. **Subtask IDs**: Must be unique strings
   - ❌ Wrong: Using sequential numbers (1, 2, 3) as strings
   - ✅ Correct: Using UUIDs (`str(uuid.uuid4())`)

5. **Update returns new object**: Always capture and use the returned value
   - ❌ Wrong: `await updateTodo({...})` (losing updated data)
   - ✅ Correct: `result = await updateTodo({...}); todo = json.loads(result)`
