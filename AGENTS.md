# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Commands

### Development
```bash
bun dev              # Start all apps (web + native) via Turborepo
bun dev:web          # Start web app only (http://localhost:3000, Next.js --turbopack)
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

**Important**: Never run `bun db:generate` or `bun db:migrate`. Only modify the schema files — the user handles migration generation and execution manually.

### Code Quality
```bash
bun check            # Run Biome formatting and linting with auto-fix
```

**Important**: This project uses **Biome** (not ESLint/Prettier) and **Bun** (not npm/yarn). Biome is configured for double quotes and space indentation.

## Architecture Overview

This is a TypeScript monorepo built with Turborepo containing:
- **Web app** (`apps/web`): Next.js 16 with App Router and React 19
- **Mobile app** (`apps/native`): React Native with Expo
- **Shared packages** (`packages/*`): Workspace path exists for shared packages; none are checked in yet

### Tech Stack
- **Runtime**: Bun for package management and development
- **Framework**: Next.js 16 (App Router), React 19
- **Database**: PostgreSQL with Drizzle ORM (Neon serverless)
- **Auth**: Better-Auth with session management
- **Styling**: TailwindCSS 4 with shadcn/ui components
- **AI**: AI SDK v6 (`ToolLoopAgent`) with Anthropic Claude and OpenAI (Responses API) as selectable providers
- **Sandboxes**: Daytona for per-chat shell and file workspaces; R2 for workspace file storage; Upstash Redis for skills/caching as applicable
- **State**: Zustand (client), TanStack Query (server state)
- **Forms**: TanStack React Form with Zod validation
- **Search**: Upstash Search for Canvas LMS content

## AI Agent System

The core feature is a chat assistant using **AI SDK `ToolLoopAgent`**. The default model is **`claude-sonnet-4-6`** (see `apps/web/src/app/api/chat/route.ts`). If the requested model id starts with `claude`, the provider is Anthropic; otherwise the provider is OpenAI.

### Agent Architecture

**Entry Point**: `apps/web/src/app/api/chat/route.ts`
- Builds `AgentContext`, selects **Anthropic** or **OpenAI** from the requested model id, and calls `getToolsForProvider(context)`
- For Anthropic: extended thinking (10k token budget) and prompt cache (`cacheControl`) in `providerOptions`
- After each turn, the route can sync the Daytona workspace and stream workspace file metadata to the client (`data-workspace-files`)

**Core Components** (`apps/web/src/ai/agents/`):
- `general.ts`: System prompt (`buildSystemPrompt`), per-request context (`buildDynamicContext`), and `getToolsForProvider` / deprecated `getGeneralAgentTools`
- `AgentContext`: Per-request context (`userId`, `fullName`, `schoolName`, `role`, `classes`, `timezone`, location fields, `chatId`, `provider`, `skillsTree`, etc.)

### Tools (high level)

Tools are composed in `getToolsForProvider` in `general.ts`. **Anthropic** uses native tools where available (`bash`, `memory`, `web_search`); **OpenAI** uses native `shell`, native `web_search`, and custom implementations for memory and the text editor. **Shared** custom tools include Canvas search/assignments, todos, study sets, web fetch, plan/patch/image/sub-agent/share_file, etc. See the system prompt and `buildSharedTools` / `getToolsForProvider` for the authoritative list.

Execution runs in a **Daytona** sandbox (not a generic “Python code_execution” container): shell is the primary automation surface; Python/Node and document tooling are available inside the sandbox as described in the system prompt.

### Programmatic Tool Calling Pattern

Some workflows invoke todo/Canvas helpers from shell scripts or documented patterns; the chat agent’s main interface is the tool set above.

### AI Integration Points

- **Chat API**: `apps/web/src/app/api/chat/route.ts`
- **Agent Config**: `apps/web/src/ai/agents/general.ts`
- **Tools**: `apps/web/src/ai/tools/`
- **Sandbox**: `apps/web/src/ai/sandbox/`
- **Skills**: `apps/web/src/ai/sandbox/skills-tree.ts` and skill content synced for the sandbox
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
- `apps/web/drizzle.config.ts` loads from the **repository root** `.env` file (not `apps/web/.env`)
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
- Biome nursery rule `useSortedClasses` sorts Tailwind classes (e.g. with `cn`, `clsx`, `cva`)
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

**Validated at build time** (`apps/web/src/env.ts` with `@t3-oss/env-nextjs`): server vars include `DATABASE_URL`, `AUTH_SECRET`, Upstash Search, **Daytona**, **Upstash Redis**, **R2** credentials, `OPENAI_API_KEY`, optional `DAYTONA_SNAPSHOT`; client includes optional `NEXT_PUBLIC_UPSTASH_SEARCH_TOKEN` and `NEXT_PUBLIC_SERVER_URL`.

**Turborepo `globalEnv`** (`turbo.json`, for task cache inputs): also lists `ANTHROPIC_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `MISTRAL_API_KEY`, `BLOB_READ_WRITE_TOKEN`, and related keys — some are used by dependencies or runtime without going through `env.ts`. If a feature fails at runtime, check both `env.ts` and `process.env` usage.

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

Notable routes under `apps/web/src/app/api/`:
- **`/api/auth/[...all]`**: Better-Auth authentication endpoints
- **`/api/chat`**: AI chat streaming (`ToolLoopAgent`, workspace file parts)
- **`/api/metadata`**: Chat metadata generation (titles, suggestions)
- **`/api/sandbox/sync`**: Sandbox workspace sync
- **`/api/sandbox-files/[id]`**: Serve uploaded workspace files
- **`/api/canvas-file/[fileId]`**: Canvas file proxy/helper
- **`/api/cron/canvas-index`**: Scheduled Canvas indexing

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

### AI Streaming Pattern (simplified)

The chat route builds a `ToolLoopAgent` with `instructions` as **two** system messages (static prompt + dynamic context), merges the agent stream via `createUIMessageStream`, and may append `data-workspace-files` after `onFinish` sync/index. See `apps/web/src/app/api/chat/route.ts` for the full flow.

## Important Notes

- Web app runs on port 3000 by default (Next.js)
- Mobile app uses Expo Go for development
- User settings stored as JSONB in database (flexible structure)
- Timestamps use the user-relevant timezone via `AgentContext` and locale formatting
- Geolocation from Vercel request headers feeds location-aware search
- Daytona sandboxes are per chat; workspace files persist via R2 sync; environment outside the workspace is not guaranteed to persist across restarts
