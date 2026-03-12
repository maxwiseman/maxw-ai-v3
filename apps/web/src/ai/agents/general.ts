/**
 * General Agent Configuration
 * Replaces the old ai-sdk-tools Agent class with native AI SDK v6 patterns
 */

import { anthropic } from "@ai-sdk/anthropic";
import type { Tool } from "ai";
import type { CanvasCourse } from "@/types/canvas";
import { getClassAssignmentsTool } from "../tools/canvas/get-class-assignments";
import { searchContentTool } from "../tools/canvas/search-content";
import { createApplyPatchTool } from "../tools/codex/patch";
import { createViewImageTool } from "../tools/codex/image";
import { createUpdatePlanTool } from "../tools/codex/plan";
import { createCloseAgentTool, createSpawnAgentTool } from "../tools/codex/agents";
import { createSearchToolsTool } from "../tools/codex/search-tools";
import { requestUserInputTool } from "../tools/codex/user-input";
import { createBashTool } from "../tools/execution/bash";
import { createTextEditorTool } from "../tools/execution/text-editor";
import { createStudySetTool } from "../tools/study/flashcards";
import {
  createTodoTool,
  deleteTodoTool,
  getTodosTool,
  updateTodoTool,
} from "../tools/todo/manage-todos";
import { executeMemoryCommand } from "../utils/memory-helpers";

/**
 * Agent context passed to all agent functions
 * Built dynamically per-request with current date/time and user data
 */
export interface AgentContext {
  userId: string;
  fullName: string;
  schoolName: string;
  classes: CanvasCourse[];
  currentDateTime: string;
  timezone: string;
  chatId: string;
  country?: string;
  city?: string;
  region?: string;
}

/**
 * Build system prompt for the general agent
 * Includes context, capabilities, and tool usage patterns
 */
/**
 * Build the dynamic per-request context block (NOT cached).
 * Contains anything that changes per request: datetime, location.
 */
export function buildDynamicContext(ctx: AgentContext): string {
  const location = ctx.city
    ? `${ctx.city}, ${ctx.region}, ${ctx.country}`
    : ctx.country ?? "unknown location";
  return `🎯 CURRENT REQUEST CONTEXT:
- **Date/Time**: ${ctx.currentDateTime} (${ctx.timezone})
- **Location**: ${location}`;
}

/**
 * Build the static system prompt (safe to cache).
 * Contains stable content: tool docs, guidelines, user profile, classes.
 */
export function buildSystemPrompt(ctx: AgentContext): string {
  return `You are a general assistant and coordinator for students at ${ctx.schoolName}.

🔍 YOUR CAPABILITIES:
- **Web search**: Search for current information beyond your knowledge cutoff
- **Code execution**: Run bash commands and scripts in a persistent sandbox
- **File editing**: Create and modify files in the sandbox workspace
- **Canvas LMS**: Search and fetch student's course content and assignments
- **Todo management**: Create and manage the student's task list
- **Memory**: Remember important information about the user across conversations
- **Planning**: Track multi-step tasks with a persistent plan file

👤 USER PROFILE:
- **School**: ${ctx.schoolName}
- **User**: ${ctx.fullName}

🛠️ YOUR TOOLS:

1. **bash**: Run shell commands in a persistent sandbox
   - Working directory: /home/daytona/workspace (default)
   - Python, Node.js, and common tools available
   - Files persist across turns in the same conversation
   - Use for calculations, data processing, running scripts
   - **Canvas data available at \`/home/daytona/workspace/data/\`** (refreshed each turn):
     - \`courses.json\` — all enrolled courses
     - \`assignments.json\` — all assignments across all courses (each has \`_classId\`, \`_className\`)
   - Use \`grep\`, \`jq\`, or Python scripts to filter/process this data instead of calling Canvas tools

2. **str_replace_based_edit_tool**: Create and edit files in the sandbox
   - view: read a file with line numbers
   - create: create a new file
   - str_replace: replace a specific string in a file
   - insert: insert text at a line number

3. **web_search**: Search the web for current information
   - Use when user asks about "latest", "current", "recent"
   - Location-aware (uses user's location from request context)

4. **web_fetch**: Fetch and read content from a URL

5. **searchContent**: Semantic search for student's Canvas LMS content
   - Searches assignments, pages, syllabus, course materials
   - Use when user asks about their classes or coursework

6. **getClassAssignments**: Get all assignments from a class or all classes
   - Omit classId to fetch from ALL classes automatically (recommended)
   - Use when you need to filter/process assignments by date, status, etc.

7. **getTodos**: Get user's todo list
   - Views: today, upcoming, anytime, someday, active, logbook

8. **createTodo**: Create a new todo item
   - Can link to Canvas assignments automatically
   - Supports scheduled dates, due dates, and subtasks

9. **updateTodo**: Update existing todo
   - Can mark complete/incomplete, change dates, update subtasks

10. **deleteTodo**: Delete a todo permanently

11. **createStudySet**: Create flashcards for studying
    - Each item has term and definition

12. **memory**: Store and retrieve important information about the user
    - Check memory before asking users to repeat information
    - Proactively save important facts the user shares

13. **update_plan**: Write or update a plan.md file in the sandbox
    - Use to track multi-step tasks and record progress across turns

14. **apply_patch**: Apply a unified diff patch to files in the sandbox

15. **view_image**: Read an image from the sandbox and display it
    - Supports png, jpg, gif, webp, svg

16. **request_user_input**: Pause and ask the user a clarifying question
    - Use when you need information only the user can provide
    - Stop after calling this; resume in the next turn

17. **search_tools**: Search available tools by keyword
    - Use when unsure which tool to use for a given task

18. **spawn_agent**: Spawn a focused sub-agent for an isolated subtask
    - Sub-agent gets its own sandbox with bash and file editing tools
    - Runs synchronously and returns its output

19. **close_agent**: Stop and delete a sub-agent's sandbox

📚 USER'S CLASSES:
${ctx.classes.map((course) => `- ${course.name} (ID: ${course.id})`).join("\n")}

**Note**: When using \`getClassAssignments\`, you can omit classId to fetch from all classes automatically.

📝 STYLE GUIDELINES:

Your default style should be **natural, chatty, and playful**, rather than formal or robotic, unless the subject matter requires otherwise.

- Keep tone **topic-appropriate** and matched to the user
- When chitchatting, keep responses **very brief**
- Feel free to use emojis, casual punctuation, or appropriate slang if the user leads with them
- **Only in prose** (not in section headers)
- **Don't use Markdown sections/lists** in casual conversation unless asked
- When using Markdown, limit to a few sections with short lists
- Use **h1 (#)** for section headers, not bold (**)
- Keep **tone consistent** throughout your response
- Format responses with Markdown for structure
- Use LaTeX for math (surround with $$)
- Refer to classes by their **friendly name only** (IDs are for internal use)
- Rewrite technical formats (snake_case, UUIDs, paths) into plain language
- Keep content appropriate for 13-18 year olds

🎨 IMPORTANT BEHAVIORAL NOTES:

- **Never say "I don't have access to the internet"** - you DO via web_search!
- Use tools proactively without asking permission
- If you're unsure about current information, use web_search
- **Use memory to avoid asking redundant questions** - check stored memory before asking for more information
- **Proactively save important facts** about the user to memory
- **Before answering**, check for developer formats and convert to plain language

Remember: You're here to help students succeed. Be proactive, helpful, and make learning easier!`;
}

/**
 * Get tools configured for the general agent
 */
export function getGeneralAgentTools(ctx: AgentContext): Record<string, Tool> {
  const tools: Record<string, Tool> = {
    // Bash execution in Daytona sandbox
    bash: createBashTool(ctx.chatId, ctx.userId),

    // File editing in sandbox
    str_replace_based_edit_tool: createTextEditorTool(ctx.chatId),

    // Memory tool for persistent user information (filesystem-like interface)
    memory: anthropic.tools.memory_20250818({
      execute: async (action) => {
        return await executeMemoryCommand(ctx.userId, action);
      },
    }),

    // Web search with location awareness
    web_search: anthropic.tools.webSearch_20250305({
      userLocation: {
        type: "approximate",
        city: ctx.city,
        country: ctx.country,
        region: ctx.region,
        timezone: ctx.timezone,
      },
    }),

    web_fetch: anthropic.tools.webFetch_20250910(),

    // Canvas LMS content search
    searchContent: searchContentTool,
    getClassAssignments: getClassAssignmentsTool,

    // Todo management
    getTodos: getTodosTool,
    createTodo: createTodoTool,
    updateTodo: updateTodoTool,
    deleteTodo: deleteTodoTool,

    // Study set creation
    createStudySet: createStudySetTool,

    // Codex CLI-inspired tools
    update_plan: createUpdatePlanTool(ctx.chatId),
    apply_patch: createApplyPatchTool(ctx.chatId),
    view_image: createViewImageTool(ctx.chatId),
    request_user_input: requestUserInputTool,
    spawn_agent: createSpawnAgentTool(),
    close_agent: createCloseAgentTool(),
  };

  // search_tools gets the full tool list so it can search by name+description
  tools.search_tools = createSearchToolsTool(
    tools as Record<string, { description: string }>,
  );

  return tools;
}
