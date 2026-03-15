---
name: canvas-assignments
description: Work with Canvas LMS assignments using getClassAssignments tool. Use when student asks about assignments, due dates, grades, or needs to filter/analyze assignment data from their Canvas classes.
---

# Canvas Assignments

Process and analyze Canvas LMS assignment data using the `getClassAssignments` tool.

## Quick Start

### Fetch assignments from a specific class

```python
import json

result = await getClassAssignments({"classId": "12345"})
assignments = json.loads(result)

for a in assignments:
    print(a["name"])
```

### Fetch assignments from ALL classes (recommended for most queries)

```python
import json

# Omit classId to fetch from all classes in parallel
result = await getClassAssignments({})
assignments = json.loads(result)

# Each assignment includes _classId and _className fields
for a in assignments:
    print(f"{a['name']} - {a['_className']}")
```

**Critical points:**
- Parameter `classId` is **optional** - omit it to fetch from all classes
- When fetching all classes, each assignment includes `_classId` and `_className` fields
- Parameters passed as dictionary: `{"classId": "12345"}` or `{}` for all classes
- Tool returns a JSON string, not a Python object
- You MUST use `json.loads()` to parse the result

For detailed field structure and API reference, see [REFERENCE.md](REFERENCE.md).

## Common Workflows

### Find assignments due this week (across all classes)

```python
import json
from datetime import datetime, timedelta, timezone

# Fetch from all classes automatically
result = await getClassAssignments({})
assignments = json.loads(result)

now = datetime.now(timezone.utc)
week_from_now = now + timedelta(days=7)

due_this_week = []
for a in assignments:
    if a.get("due_at"):
        due_date = datetime.fromisoformat(a["due_at"].replace("Z", "+00:00"))
        if now <= due_date <= week_from_now:
            due_this_week.append({
                "name": a["name"],
                "class": a.get("_className", "Unknown"),
                "due_at": a["due_at"],
                "points": a["points_possible"]
            })

due_this_week.sort(key=lambda x: x["due_at"])
```

### Find missing assignments (across all classes)

```python
import json
from datetime import datetime, timezone

# Fetch from all classes
result = await getClassAssignments({})
assignments = json.loads(result)

now = datetime.now(timezone.utc)
missing = []
for a in assignments:
    submission = a.get("submission")
    if submission:
        # Check if marked as missing or unsubmitted past due date
        if submission.get("missing") or (
            submission.get("workflow_state") == "unsubmitted" and
            a.get("due_at") and
            datetime.fromisoformat(a["due_at"].replace("Z", "+00:00")) < now
        ):
            missing.append({
                "name": a["name"],
                "class": a.get("_className", "Unknown"),
                "due_at": a.get("due_at")
            })
```

### Calculate grade statistics (for a specific class)

```python
import json

# When analyzing grades, usually better to specify a class
result = await getClassAssignments({"classId": "12345"})
assignments = json.loads(result)

# Filter graded assignments
graded = [a for a in assignments 
          if a.get("submission") and a["submission"].get("score") is not None]

if graded:
    scores = [a["submission"]["score"] for a in graded]
    points = [a["points_possible"] for a in graded]
    
    # Calculate percentages
    percentages = [(score / pts * 100) for score, pts in zip(scores, points) if pts > 0]
    
    avg_grade = sum(percentages) / len(percentages)
    print(f"Average grade: {avg_grade:.1f}%")
```

### Working with specific vs all classes

```python
import json

# For broad queries: "what assignments do I have coming up?"
# Fetch from all classes (automatic parallel fetching)
result = await getClassAssignments({})
all_assignments = json.loads(result)

# Each assignment includes _classId and _className
for a in all_assignments:
    print(f"{a['_className']}: {a['name']}")

# For specific queries: "what's my grade in Math?"
# Fetch from specific class
result = await getClassAssignments({"classId": "12345"})
math_assignments = json.loads(result)

# For filtered queries across all classes: "show overdue assignments"
result = await getClassAssignments({"filter": "overdue"})
overdue_all = json.loads(result)
```

## Important Patterns

### Always check for None values

Many fields can be `None`:

```python
# Safe field access
due_at = a.get("due_at")
if due_at:
    # Process due date
    pass

# Check nested objects
submission = a.get("submission")
if submission:
    score = submission.get("score")
    if score is not None:
        # Process score
        pass
```

### Date handling

All dates are ISO 8601 strings with timezone (UTC):

```python
from datetime import datetime, timezone

# Parse date from Canvas (always UTC)
date_string = "2026-01-21T18:48:00Z"
date_obj = datetime.fromisoformat(date_string.replace("Z", "+00:00"))

# CRITICAL: Always use timezone-aware datetime for comparisons
now = datetime.now(timezone.utc)
is_overdue = date_obj < now
```

### Filter server-side when possible

The `filter` parameter works with or without `classId`:

```python
import json

# Filter across ALL classes
result = await getClassAssignments({"filter": "overdue"})
all_overdue = json.loads(result)

# Filter in specific class
result = await getClassAssignments({"classId": "12345", "filter": "upcoming"})
class_upcoming = json.loads(result)

# For complex logic, fetch all and filter in Python
result = await getClassAssignments({})
all_assignments = json.loads(result)
complex_filter = [a for a in all_assignments if <complex_condition>]
```

## Common Errors to Avoid

### ❌ Wrong: Using snake_case parameter name
```python
result = await getClassAssignments(class_id="12345")  # KeyError!
```

### ✅ Correct: Use camelCase "classId"
```python
result = await getClassAssignments({"classId": "12345"})
```

---

### ❌ Wrong: Forgetting to parse JSON
```python
result = await getClassAssignments({"classId": "12345"})
for a in result:  # TypeError: string is not iterable
    print(a["name"])
```

### ✅ Correct: Parse JSON string first
```python
import json
result = await getClassAssignments({"classId": "12345"})
assignments = json.loads(result)  # Parse to Python list
for a in assignments:
    print(a["name"])
```

---

### ❌ Wrong: Timezone-naive datetime (causes TypeError)
```python
from datetime import datetime

now = datetime.now()  # No timezone info
due_date = datetime.fromisoformat(a["due_at"].replace("Z", "+00:00"))
if due_date < now:  # TypeError: can't compare offset-naive and offset-aware datetimes
    print("Overdue")
```

### ✅ Correct: Timezone-aware datetime
```python
from datetime import datetime, timezone

now = datetime.now(timezone.utc)  # UTC timezone
due_date = datetime.fromisoformat(a["due_at"].replace("Z", "+00:00"))
if due_date < now:  # Works correctly
    print("Overdue")
```

---

### ❌ Wrong: Assuming fields always exist
```python
score = a["submission"]["score"]  # KeyError if no submission or score
```

### ✅ Correct: Safe access with .get()
```python
submission = a.get("submission")
if submission:
    score = submission.get("score")
    if score is not None:
        print(f"Score: {score}")
```

## When to use this skill

- Student asks about assignments across all classes ("what's due this week?", "what assignments am I missing?")
- Student asks about specific class assignments ("what's due in Math 101?")
- Need to filter assignments by date or status
- Calculate grade statistics or analyze performance
- Find specific assignments across multiple classes
- Check submission status or due dates

**Tip**: Omit `classId` for most queries - the tool automatically fetches from all classes in parallel and is more efficient than manual looping.

## Reference

For complete assignment field documentation, grading types, submission types, and detailed examples, see [REFERENCE.md](REFERENCE.md).
