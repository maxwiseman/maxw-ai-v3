# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Commands

### Development
```bash
bun dev              # Start all apps (web + native)
bun dev:web          # Start web app only (http://localhost:3000)
bun dev:native       # Start mobile app with Expo
```

### Building
```bash
bun build            # Build all apps
bun build:web        # Build web app only
bun build:native     # Build native app only
bun check-types      # Type check all apps
```

### Database
```bash
bun db:push          # Push schema changes (development)
bun db:studio        # Open Drizzle Studio UI
bun db:generate      # Generate migration files
bun db:migrate       # Run migrations (production)
```

### Code Quality
```bash
bun check            # Run Biome formatting and linting with auto-fix
```

**Important**: This project uses **Biome** (not ESLint/Prettier) and **Bun** (not npm/yarn). Biome is configured for double quotes and space indentation.

## Architecture Overview

This is a TypeScript monorepo built with Turborepo containing:
- **Web app** (`apps/web`): Next.js 16 with App Router and React 19
- **Mobile app** (`apps/native`): React Native with Expo
- **Shared packages** (`packages/*`): Common utilities (if any)

### Tech Stack
- **Runtime**: Bun for package management and development
- **Framework**: Next.js 16 (App Router), React 19
- **Database**: PostgreSQL with Drizzle ORM (Neon serverless)
- **Auth**: Better-Auth with session management
- **Styling**: TailwindCSS 4 with shadcn/ui components
- **AI**: Anthropic Claude via AI SDK with native tools
- **State**: Zustand (client), TanStack Query (server state)
- **Forms**: TanStack React Form with Zod validation
- **Search**: Upstash Search for Canvas LMS content

## AI Agent System

The core feature is an AI assistant powered by **Anthropic Claude Sonnet 4.5** with native tool support.

### Agent Architecture

**Entry Point**: `apps/web/src/app/api/chat/route.ts`
- Uses AI SDK's `ToolLoopAgent` with Anthropic's Claude Sonnet 4.5
- Context includes: user info, geolocation, timezone, classes, chat ID
- Supports extended thinking (10k token budget)
- Container-based tool execution with skill persistence

**Core Components** (`apps/web/src/ai/agents/`):
- `general.ts`: System prompt builder and tool configuration
- `AgentContext`: Type definition for per-request context (userId, classes, timezone, location)
- Legacy agents (secretary, study, triage) kept for reference but not currently active

### Native Anthropic Tools

The agent uses Anthropic's built-in tools (not custom implementations):
- `code_execution`: Python sandbox for calculations and programmatic tool calling
- `web_search`: Location-aware web search (uses geolocation from request headers)
- `memory`: Persistent user memory with filesystem-like interface
- `web_fetch`: Fetch and process web content

### Custom Tools (`apps/web/src/ai/tools/`)

- **Canvas Tools** (`canvas/`):
  - `searchContent`: Upstash semantic search over Canvas LMS content
  - `getClassAssignments`: Fetch assignments from Canvas (programmatic calling)

- **Todo Tools** (`todo/`):
  - `getTodos`, `createTodo`, `updateTodo`, `deleteTodo`: Full CRUD (programmatic calling)

- **Study Tools** (`study/`):
  - `createStudySet`: Generate flashcards with term/definition pairs

### Programmatic Tool Calling Pattern

Tools marked "programmatic calling only" are called from within Python code execution:
```python
result = await getClassAssignments({})  # Fetch from all classes
todos = await getTodos({"view": "today"})
await createTodo({"title": "...", "dueDate": "..."})
```

### AI Integration Points

- **Chat API**: `apps/web/src/app/api/chat/route.ts`
- **Agent Config**: `apps/web/src/ai/agents/general.ts`
- **Tools**: `apps/web/src/ai/tools/`
- **Skills**: `apps/web/src/ai/skills/` (documentation for programmatic tools)
- **Memory Helpers**: `apps/web/src/ai/utils/memory-helpers.ts`

## Database Schema

Located in `apps/web/src/db/schema/`

**Authentication** (`auth.ts`):
- `user`: Core accounts (id, name, email, settings JSONB)
- `session`: User sessions with expiration, IP tracking
- `account`: OAuth provider credentials
- `verification`: Email verification tokens

**Todo System** (`todo.ts`):
- `todo`: Task items with scheduling, Canvas linking, subtasks
- `dateTypeEnum`: calendar, calendarEvening, anytime, someday
- `canvasContentTypeEnum`: assignment, page, quiz, discussion
- Supports subtasks as JSONB array

**Study Materials** (`study.ts`):
- `studySet`: Study collection containers
- `studySetItem`: Flashcards/questions (type: "term" | "question")

**Memory** (`memory.ts`):
- User memory storage for AI agent persistence

**Database Configuration**:
- `drizzle.config.ts` loads from root `.env` file (not `apps/web/.env`)
- Migrations stored in `apps/web/src/db/migrations`
- All foreign keys use `{ onDelete: "cascade" }`

## Code Conventions

### File Naming
- Components: PascalCase (`Button.tsx`, `UserProfile.tsx`)
- Utilities: kebab-case (`date-helpers.ts`, `filter-builders.ts`)
- Types: kebab-case (`filters.ts`)

### Styling
- **TailwindCSS 4** for all styling
- Use `cn()` helper from `@/lib/utils` for conditional classes
- Biome auto-sorts Tailwind classes via `useSortedClasses` rule
- Follow shadcn/ui component patterns

### TypeScript
- Double quotes (configured in Biome)
- Space indentation
- Use `interface` for object shapes, `type` for unions/intersections
- Path alias: `@/` maps to `src/` in each app

### Imports
- Organized automatically by Biome's `organizeImports`
- Group: external packages → internal modules → relative imports

## Environment Variables

Stored in `.env` at **repository root** (not in `apps/web/.env`).

**Required Variables** (from `turbo.json` globalEnv):
```bash
DATABASE_URL                          # PostgreSQL connection string
AUTH_SECRET                           # Better-Auth secret
UPSTASH_SEARCH_URL                    # Upstash Search endpoint
UPSTASH_SEARCH_TOKEN                  # Upstash Search token
NEXT_PUBLIC_UPSTASH_SEARCH_TOKEN      # Public Upstash token
OPENAI_API_KEY                        # OpenAI API key (for embeddings)
ANTHROPIC_API_KEY                     # Anthropic API key (for Claude)
GOOGLE_GENERATIVE_AI_API_KEY          # Google AI API key
```

Environment variables are validated at build time using `@t3-oss/env-nextjs`.

## Canvas LMS Integration

Canvas integration enables assignment tracking and study material generation:

- **API Credentials**: Stored in `user.settings` JSONB column
- **Search Infrastructure**: `apps/web/src/ai/utils/upstash-helpers.ts`
- **Indexing Strategy**: Documents >4000 chars are chunked, metadata preserved
- **Search Tool**: `searchContent` queries assignments, pages, syllabus via Upstash

## Key Utilities

Located in `apps/web/src/lib/utils.ts`:

- **`cn(...classes)`**: Merge TailwindCSS classes with conflict resolution
- **`toTitleCase(str, opts?)`**: Convert strings to title case with smart small word handling
- **`humanReadableDate(date, opts?)`**: "Today", "Tomorrow", "Next Tuesday", or formatted date
- **`extractKeys(object, keys)`**: Type-safe object key extraction

## Testing Strategy

**Current Status**: No test suite configured. Run a build to verify:
```bash
bun build:web
```

Ignore Google Fonts errors if you lack network access (works in production).

## API Routes

Located in `apps/web/src/app/api/`:
- **`/api/auth`**: Better-Auth authentication endpoints
- **`/api/chat`**: AI chat streaming endpoint (Claude Sonnet 4.5 with tools)
- **`/api/metadata`**: Chat metadata generation (titles, suggestions)

## Common Patterns

### Form Handling
- **Primary**: TanStack React Form for form state management
- **Secondary**: React Hook Form (used by shadcn/ui form components)
- **Validation**: Zod schemas for both libraries

### Data Fetching
- TanStack Query for server state management
- Configured with persistence via `@tanstack/query-async-storage-persister`

### Component Structure
```typescript
import { cn } from "@/lib/utils";

interface Props { ... }

export function Component({ prop }: Props) {
  return <div className={cn("base", condition && "conditional")} />;
}
```

### AI Streaming Pattern
```typescript
// In API route
const agent = new ToolLoopAgent({
  model: anthropic("claude-sonnet-4-5"),
  instructions: buildSystemPrompt(context),
  tools: getGeneralAgentTools(context),
  providerOptions: {
    anthropic: {
      thinking: { type: "enabled", budgetTokens: 10000 },
      container: { skills: [...] },
    },
  },
});

const result = await agent.stream({
  messages: await convertToModelMessages(messages),
  experimental_transform: smoothStream({ chunking: "word" }),
});

return result.toUIMessageStreamResponse();
```

## Important Notes

- Web app runs on port 3000 by default (Next.js)
- Mobile app uses Expo Go for development
- User settings stored as JSONB in database (flexible structure)
- All timestamps are timezone-aware via `AgentContext.timezone`
- Geolocation extracted from Vercel request headers for location-aware search
- Container-based tool execution persists files across conversation (~4.5 min timeout)
