# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **AI**: OpenAI integration via AI SDK with custom agents and tools
- **State**: Zustand (client), TanStack Query (server state)
- **Forms**: TanStack React Form with Zod validation
- **Search**: Upstash Search for Canvas LMS content

## AI Agent System

The core feature of this application is a **multi-agent AI system** that routes requests to specialized agents.

### Agent Architecture

**Entry Point**: `generalAgent` (not triage currently)
- Located in `apps/web/src/ai/agents/`
- All agents share context via `AppContext` (user, location, classes, timezone, chat metadata)
- Memory system: working memory (user-scoped), chat history (10 messages), auto-generated titles/suggestions

**Agent Specializations**:

1. **General Agent** (`general.ts`)
   - Role: Coordinator, web search specialist, compound query handler
   - Model: OpenAI gpt-5.2
   - Tools: `webSearch`, `searchContent`, `createStudySet`
   - Handoffs: Secretary, Study agents
   - Pattern: Web search → specialist handoff → synthesize naturally

2. **Secretary Agent** (`secretary.ts`)
   - Role: Task tracking, assignment management, due dates
   - Tools: `searchContent` (Canvas LMS assignments/pages)
   - Handles: Todos, upcoming assignments, scheduling

3. **Study Agent** (`study.ts`)
   - Role: Tutoring, flashcard creation, practice problems
   - Tools: `createStudySet` (with term/question types)
   - Supports: Flashcards, multiple-choice, short-answer modes
   - LaTeX rendering: Surround formulas with $$

4. **Triage Agent** (`triage.ts`)
   - Status: Currently disabled (general agent handles routing)
   - Intended: Route to specialists via `handoff_to_agent` tool

### Agent Routing Logic

Routes are determined by semantic matching in agent instructions:

- **Secretary**: "upcoming assignments", "todos", "due dates", organization tasks
- **Study**: "flashcards", "practice problems", "explain this concept", tutoring
- **General**: Greetings, web search ("latest", "current", "news"), affordability checks, compound queries

**Compound Query Pattern**:
```
User: "Can I afford a new laptop?"
1. General agent performs web search for laptop prices
2. Hands off to specialist for financial data (if implemented)
3. Synthesizes answer without headers
```

### AI Integration Points

- **Chat API**: `apps/web/src/app/api/chat/route.ts`
- **Agents**: `apps/web/src/ai/agents/`
- **Tools**: `apps/web/src/ai/tools/`
- **Artifacts**: `apps/web/src/ai/artifacts/` (streamable UI components like flashcards)
- **Memory Template**: `apps/web/src/ai/agents/memory-template.md`

**Context Injection**:
- `buildAppContext()`: Creates timezone-aware context per request
- `formatContextForLLM()`: Injects user data, classes, location into agent instructions
- Geolocation from request headers powers location-aware web search

**Tools Available**:
- `webSearch`: OpenAI native web search (context-aware with user location/timezone)
- `searchContent`: Upstash semantic search over Canvas assignments/pages
- `createStudySet`: Generate flashcards/questions with LaTeX support

## Database Schema

Located in `apps/web/src/db/schema/`

**Authentication** (`auth.ts`):
- `user`: Core user accounts (id, name, email, settings JSONB)
- `session`: User sessions with expiration, IP tracking
- `account`: OAuth provider credentials (accessToken, refreshToken)
- `verification`: Email verification and password reset tokens

**Study Materials** (`schema.ts`):
- `studySet`: Study collection containers (userId FK)
- `studySetItem`: Individual flashcards/questions (type: "term" | "question")

All foreign keys use `{ onDelete: "cascade" }` for consistency.

**Database Configuration**:
- `drizzle.config.ts` loads from root `.env` file (not `apps/web/.env`)
- Migrations stored in `apps/web/src/db/migrations`
- Use `db:push` for development, `db:migrate` for production

## Code Conventions

### File Naming
- Components: PascalCase (`Button.tsx`, `UserProfile.tsx`)
- Utilities: kebab-case (`date-helpers.ts`, `filter-builders.ts`)
- Types: kebab-case (`filters.ts`)

### Styling
- **TailwindCSS 4** for all styling
- Use `cn()` helper from `@/lib/utils` for conditional classes: `cn("base", condition && "conditional")`
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
OPENAI_API_KEY                        # OpenAI API key
GOOGLE_GENERATIVE_AI_API_KEY          # Google AI API key
```

Environment variables are validated at build time using `@t3-oss/env-nextjs`.

## Canvas LMS Integration

Canvas integration enables assignment tracking and study material generation:

- **API Credentials**: Stored in `user.settings` JSONB column
- **Search Infrastructure**: `apps/web/src/ai/utils/upstash-helpers.ts`
- **Indexing Strategy**: Documents >4000 chars are chunked, metadata preserved
- **Reranking**: Enabled for semantic search relevance
- **Search Tool**: `searchContent` queries assignments, pages, syllabus via Upstash

## Key Utilities

Located in `apps/web/src/lib/utils.ts`:

- **`cn(...classes)`**: Merge TailwindCSS classes with conflict resolution (clsx + tailwind-merge)
- **`toTitleCase(str, opts?)`**: Convert strings to title case with smart small word handling
- **`humanReadableDate(date, opts?)`**: "Today", "Tomorrow", "Next Tuesday", or formatted date
- **`extractKeys(object, keys)`**: Type-safe object key extraction

## Testing Strategy

**Current Status**: No test suite configured. Instead, run a build to verify:
```bash
bun build:web
```

Ignore Google Fonts errors if you lack network access (works in production).

## API Routes

Located in `apps/web/src/app/api/`:
- **`/api/auth`**: Better-Auth authentication endpoints
- **`/api/chat`**: AI chat streaming endpoint (generalAgent entry point)
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
// imports
import { cn } from "@/lib/utils";

// types
interface Props { ... }

// component
export function Component({ prop }: Props) {
  return <div className={cn("base", condition && "conditional")} />;
}
```

### AI Streaming Pattern
```typescript
// In agents
export const myAgent = createAgent({
  name: "agent-name",
  model: openai("gpt-5.2"),
  instructions: (ctx: AppContext) => formatContextForLLM(ctx, "instructions"),
  tools: { ... },
  maxTurns: 5,
});

// In API route
return myAgent.toUIMessageStream({
  message,
  context,
  maxRounds: 5,
  maxSteps: 10,
  sendReasoning: true,
  sendSources: true,
}).pipe(smoothStream({ chunking: "word" }));
```

## Extending the Agent System

To add a new specialist agent:

1. Create agent in `apps/web/src/ai/agents/new-agent.ts`:
```typescript
export const newAgent = createAgent({
  name: "new-specialist",
  model: openai("gpt-5.2"),
  instructions: (ctx) => formatContextForLLM(ctx, `Your specialized instructions...`),
  tools: { ... },
  maxTurns: 5,
});
```

2. Add to `generalAgent` handoffs array in `general.ts`
3. Update routing criteria in agent instructions
4. Create tools in `apps/web/src/ai/tools/` if needed
5. Create artifacts in `apps/web/src/ai/artifacts/` for visual outputs

## Important Notes

- Web app runs on port 3000 by default (Next.js)
- Mobile app uses Expo Go for development
- User settings stored as JSONB in database (flexible structure)
- All timestamps are timezone-aware via `AppContext.timezone`
- Agent memory persists user preferences across chats (InMemoryProvider)
- Chat history limited to 10 messages per conversation
- Artifacts support streaming for real-time updates (flashcards, charts)
