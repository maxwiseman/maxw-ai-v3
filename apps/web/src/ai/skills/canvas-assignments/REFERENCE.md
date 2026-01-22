# Canvas Assignments API Reference

Complete reference for the `getClassAssignments` tool and Canvas assignment data structure.

## Tool API

### getClassAssignments

Fetch assignments from Canvas LMS. Can fetch from a specific class or all classes in parallel.

**Parameters:**

- `classId` (string, optional): Canvas course ID (use camelCase, not snake_case)
  - If provided: fetches from that class only
  - If omitted: fetches from ALL user's classes in parallel
- `filter` (string, optional): Pre-filter assignments server-side

**Filter values:**
- `"past"` - Assignments with due dates in the past
- `"overdue"` - Assignments past due and not submitted
- `"undated"` - Assignments without a due date
- `"ungraded"` - Assignments that haven't been graded
- `"unsubmitted"` - Assignments not yet submitted
- `"upcoming"` - Assignments due soon
- `"future"` - Assignments with future due dates

**Returns:** JSON string containing array of assignment objects (must be parsed with `json.loads()`)

**When fetching from all classes:**
- Each assignment includes `_classId` (string) and `_className` (string) fields
- Assignments from all classes are fetched in parallel for efficiency
- Results are combined into a single flat array

**Examples:**

```python
import json

# Fetch from specific class
result = await getClassAssignments({"classId": "12345"})
assignments = json.loads(result)

# Fetch from ALL classes (recommended for most queries)
result = await getClassAssignments({})
all_assignments = json.loads(result)

# Each assignment from all classes includes class info
for a in all_assignments:
    print(f"{a['_className']}: {a['name']}")

# Filter across all classes
result = await getClassAssignments({"filter": "upcoming"})
upcoming_all = json.loads(result)

# Filter in specific class
result = await getClassAssignments({"classId": "12345", "filter": "overdue"})
overdue_in_class = json.loads(result)
```

## Assignment Object Structure

Complete structure of each assignment object returned:

```python
{
    # Core Identification
    "id": 123456,              # Assignment ID (number)
    "course_id": 78910,        # Course ID (number)
    "name": "Assignment Title", # Assignment name (string)
    "html_url": "https://...", # Direct link to assignment (string)
    
    # Added when fetching from all classes (not present when fetching specific class)
    "_classId": "78910",       # String version of course_id (only when classId omitted)
    "_className": "Math 101",  # Human-readable class name (only when classId omitted)
    
    # Dates (ISO 8601 strings or None)
    "due_at": "2026-01-25T23:59:00Z",    # Due date
    "unlock_at": "2026-01-15T00:00:00Z", # When assignment becomes available
    "lock_at": "2026-01-26T23:59:00Z",   # When assignment locks
    
    # Grading Information
    "points_possible": 100.0,  # Maximum points (float)
    "grading_type": "points",  # Grading type (string)
    "published": True,         # Whether published (boolean)
    
    # Description
    "description": "HTML content...",  # Assignment instructions (string, may be HTML)
    
    # Submission Configuration
    "submission_types": [      # Array of allowed submission types
        "online_text_entry",
        "online_upload"
    ],
    "allowed_extensions": [    # Allowed file extensions (if online_upload)
        "pdf", "docx"
    ],
    "allowed_attempts": -1,    # Number of attempts allowed (-1 = unlimited)
    
    # Assignment Group
    "assignment_group_id": 456, # ID of the assignment group
    "position": 5,             # Position in assignment list
    
    # Submission Status (if included)
    "submission": {
        "id": 789012,
        "assignment_id": 123456,
        "user_id": 345678,
        "submitted_at": "2026-01-20T15:30:00Z",  # When submitted
        "score": 95.0,          # Awarded points
        "grade": "95",          # Grade as string
        "workflow_state": "graded",  # Status
        "late": False,          # Whether late
        "missing": False,       # Whether missing
        "attempt": 1            # Attempt number
    },
    
    # Rubric (if present)
    "rubric": [                # Array of rubric criteria
        {
            "id": "crit_1",
            "description": "Criterion name",
            "long_description": "Detailed description",
            "points": 50.0,
            "ratings": [
                {
                    "id": "rating_1",
                    "description": "Excellent",
                    "points": 50.0
                }
            ]
        }
    ]
}
```

## Field Types Reference

### Grading Types

Possible values for `grading_type`:

- `"points"` - Point-based grading (0-100, etc.)
- `"percent"` - Percentage grading (0-100%)
- `"letter_grade"` - Letter grades (A, B, C, etc.)
- `"gpa_scale"` - GPA scale (0.0-4.0)
- `"pass_fail"` - Pass/Fail only
- `"not_graded"` - Not graded

### Submission Types

Possible values in `submission_types` array:

- `"none"` - No submission
- `"on_paper"` - Physical submission
- `"online_text_entry"` - Text box submission
- `"online_url"` - URL submission
- `"online_upload"` - File upload
- `"media_recording"` - Audio/video recording
- `"student_annotation"` - Document annotation
- `"external_tool"` - LTI tool submission
- `"online_quiz"` - Quiz submission
- `"discussion_topic"` - Discussion post

### Submission Workflow States

Possible values for `submission.workflow_state`:

- `"submitted"` - Submitted but not graded
- `"unsubmitted"` - Not yet submitted
- `"graded"` - Graded by instructor
- `"pending_review"` - Awaiting review

## Date Handling

All date fields use ISO 8601 format: `"2026-01-21T18:48:00Z"` (UTC timezone)

### Parsing Dates

```python
from datetime import datetime, timezone

# Parse ISO 8601 date from Canvas (always UTC)
date_string = "2026-01-21T18:48:00Z"
date_obj = datetime.fromisoformat(date_string.replace("Z", "+00:00"))

# CRITICAL: Always use timezone-aware datetime for comparisons
# Canvas dates are timezone-aware, so comparing with timezone-naive datetime will raise TypeError
now = datetime.now(timezone.utc)
if date_obj < now:
    print("Assignment is overdue")
```

**⚠️ Common Error**: Using `datetime.now()` without timezone will cause:
```
TypeError: can't compare offset-naive and offset-aware datetimes
```

**Solution**: Always use `datetime.now(timezone.utc)` when comparing with Canvas dates.

### Formatting Dates

```python
# Human-readable format
date_obj.strftime("%B %d, %Y at %I:%M %p")
# Output: "January 21, 2026 at 06:48 PM"

# Short format
date_obj.strftime("%m/%d/%Y")
# Output: "01/21/2026"
```

## Important Notes

1. **Null/None Values**: Many fields can be `None`:
   - Always check with `.get()` or `if field:` before accessing
   - Fields that can be None: `due_at`, `unlock_at`, `lock_at`, `description`, `submission`

2. **Assignment Groups**: Assignments belong to assignment groups which have weights for final grade calculation.

3. **Submission Object**: Only present if user has started/submitted the assignment.

4. **HTML Content**: The `description` field contains HTML. Strip tags if you need plain text.

5. **Published Status**: Unpublished assignments (`published: False`) may not be visible to students.

6. **Rubrics**: Rubric arrays can be empty (`[]`) if no rubric is attached.

7. **Points Possible**: Can be `0` for ungraded assignments.

## Error Handling

```python
import json

try:
    result = await getClassAssignments({"classId": "12345"})
    
    # Parse JSON string
    assignments = json.loads(result)
    
    # Check if it's actually a list
    if not isinstance(assignments, list):
        print("Error: Expected list of assignments")
        return
        
    # Process assignments
    for assignment in assignments:
        # Your code here
        pass
        
except json.JSONDecodeError as e:
    print(f"JSON parsing error: {e}")
except Exception as e:
    print(f"Error: {e}")
```

## Performance Tips

1. **Fetch from all classes by default**: Omit `classId` to automatically fetch from all classes in parallel - this is more efficient than looping through classes manually
2. **Use filters when possible**: The `filter` parameter reduces data transfer and works with both single-class and all-class queries
3. **Cache results**: Store assignments in a variable if you need to reference them multiple times
4. **Selective fields**: Only access/process the fields you actually need

## Common Pitfalls

1. **Parameter Naming**: Use `classId` (camelCase), not `class_id` (snake_case)
   - ❌ Wrong: `{"class_id": "12345"}`
   - ✅ Correct: `{"classId": "12345"}` or `{}` for all classes

2. **JSON Parsing**: Tool returns JSON string, not Python object
   - ❌ Wrong: `for a in await getClassAssignments(...)` (iterating over string)
   - ✅ Correct: `assignments = json.loads(await getClassAssignments(...))`

3. **Manual looping for multiple classes**: Don't loop manually when you can omit classId
   - ❌ Wrong: Looping through class IDs and calling tool multiple times
   - ✅ Correct: `await getClassAssignments({})` fetches all in parallel

4. **Date Comparison**: Canvas returns UTC timezone-aware dates
   - ❌ Wrong: `now = datetime.now()` (timezone-naive)
   - ✅ Correct: `now = datetime.now(timezone.utc)` (timezone-aware)
   - Mixing naive and aware datetimes raises TypeError

5. **Type Checking**: Assignment IDs and course IDs are numbers in response, but pass as strings to tool

6. **Empty Arrays**: `submission_types`, `allowed_extensions`, `rubric` can all be empty arrays

7. **Submission Missing**: Don't assume `submission` key exists - always check first

8. **HTML in Description**: Description may contain complex HTML with embedded media
