# Copilot Instructions for maxw-ai-v3

This document provides instructions for GitHub Copilot to help with code generation and understanding in this repository.

## Project Overview

This is a TypeScript monorepo built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack) that includes:
- **Web Application**: Next.js 16 (App Router) with React 19
- **Mobile Application**: React Native with Expo
- **AI Features**: AI SDK tools for agents, artifacts, and memory

## Tech Stack

### Core Technologies
- **Runtime**: Bun (package manager and runtime)
- **Monorepo**: Turborepo for workspace management
- **TypeScript**: For type safety across all apps
- **Linting/Formatting**: Biome (not ESLint/Prettier)

### Web App (`apps/web`)
- **Framework**: Next.js 16 with App Router and React 19
- **Styling**: TailwindCSS 4 with shadcn/ui components
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Better-Auth
- **AI SDK**: OpenAI integration with custom agents and tools
- **State Management**: Zustand for client state, TanStack Query for server state
- **Form Handling**: TanStack React Form with Zod validation
- **Search**: Upstash Search integration

### Mobile App (`apps/native`)
- **Framework**: React Native with Expo
- **Styling**: TailwindCSS (NativeWind)

## Project Structure

```
maxw-ai-v3/
├── apps/
│   ├── web/         # Next.js web application
│   │   ├── src/
│   │   │   ├── ai/         # AI agents, tools, and artifacts
│   │   │   ├── app/        # Next.js App Router pages
│   │   │   ├── components/ # React components
│   │   │   ├── db/         # Database schema and migrations
│   │   │   ├── hooks/      # React hooks
│   │   │   ├── lib/        # Utility functions
│   │   │   └── routers/    # API routers
│   │   └── drizzle.config.ts
│   └── native/      # React Native/Expo mobile app
│       ├── app/            # Expo Router pages
│       ├── components/     # React Native components
│       └── lib/            # Utility functions
├── biome.json       # Biome configuration
├── turbo.json       # Turborepo configuration
└── package.json     # Root package.json with workspace scripts
```

## Development Workflow

### Installation
```bash
bun install
```

### Running Applications
```bash
bun dev              # Start all applications
bun dev:web          # Start only web application
bun dev:native       # Start only mobile application
```

### Database Operations
```bash
bun db:push          # Push schema changes to database
bun db:studio        # Open Drizzle Studio UI
bun db:generate      # Generate migrations
bun db:migrate       # Run migrations
```

### Building
```bash
bun build            # Build all applications
bun build:web        # Build only web application
bun build:native     # Build only mobile application
```

### Type Checking
```bash
bun check-types      # Check TypeScript types across all apps
```

### Linting and Formatting
```bash
bun check            # Run Biome check with auto-fix
```

## Code Style and Conventions

### TypeScript
- Use **double quotes** for strings (configured in Biome)
- Use **space indentation** (configured in Biome)
- Prefer `const` and `let` over `var`
- Use type annotations where TypeScript cannot infer types
- Use `interface` for object shapes, `type` for unions/intersections

### React
- Use functional components with hooks
- Prefer named exports for components
- Use the `cn()` utility from `@/lib/utils` for conditional className merging
- Component file structure: imports → types → component → exports

### Styling
- Use **TailwindCSS** utility classes for styling
- Use `cn()` helper for conditional classes: `cn("base-classes", condition && "conditional-classes")`
- Follow shadcn/ui component patterns for UI components
- Biome is configured to sort Tailwind classes using `useSortedClasses` rule

### File Naming
- React components: PascalCase (e.g., `Button.tsx`, `UserProfile.tsx`)
- Utility files: kebab-case (e.g., `date-helpers.ts`, `filter-builders.ts`)
- Type definition files: kebab-case (e.g., `filters.ts`)

### Imports
- Use path aliases: `@/` maps to `src/` in each app
- Organize imports with Biome's `organizeImports` (enabled by default)
- Group imports: external packages → internal modules → relative imports

### Error Handling
- Use proper TypeScript error types
- Validate environment variables with `@t3-oss/env-nextjs`
- Use Zod for runtime validation

### Database
- Use Drizzle ORM for all database operations
- Schema files located in `apps/web/src/db/schema`
- Run `bun db:push` to sync schema changes during development
- Use migrations for production deployments

### AI Integration
- AI-related code is in `apps/web/src/ai/`
- Agents are in `ai/agents/`
- Tools are in `ai/tools/`
- Artifacts are in `ai/artifacts/`
- Use AI SDK patterns for streaming and tool calling

## Environment Variables

- Store environment variables in `.env` at the repository root
- Each app has `.env.example` showing required variables
- Environment variables are validated at build time using `@t3-oss/env-nextjs`
- Key variables (from `turbo.json`):
  - `DATABASE_URL`: PostgreSQL connection string
  - `AUTH_SECRET`: Secret for authentication
  - `UPSTASH_SEARCH_URL`: Upstash Search endpoint
  - `UPSTASH_SEARCH_TOKEN`: Upstash Search token
  - `NEXT_PUBLIC_UPSTASH_SEARCH_TOKEN`: Public Upstash token

## Testing

Currently, this repository does not have a test suite configured. Instead, just run a build of the appropriate app in your environment. Ignore errors relating to Google Fonts (you may not have network access to that resource, but utll work in production).

## Key Libraries and Patterns

### Utility Functions
- `cn()`: Merge Tailwind classes with conflict resolution (from `clsx` + `tailwind-merge`)
- `cva()`: Create variant-based component APIs (from `class-variance-authority`)

### Form Handling
- Use TanStack React Form for form state management (primary form library)
- React Hook Form is used by shadcn/ui form components in `components/ui/form.tsx`
- Use Zod for schema validation (both form libraries support Zod)

### Data Fetching
- Use TanStack Query for server state management
- Configure persistence with `@tanstack/query-async-storage-persister`

### Authentication
- Use Better-Auth for authentication
- Expo integration available via `@better-auth/expo`

### AI Features
- Use AI SDK from Vercel (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`)
- Custom tools in `ai/tools/` directory
- Custom agents in `ai/agents/` directory

## Common Pitfalls to Avoid

- **Don't use ESLint or Prettier**: This project uses Biome for linting and formatting
- **Don't use single quotes**: Biome is configured for double quotes
- **Don't bypass Zod validation**: Always validate user input and environment variables
- **Don't hardcode environment variables**: Use the env validation system
- **Don't ignore TypeScript errors**: Fix them or add proper type assertions
- **Don't use `npm` or `yarn`**: This project uses Bun as the package manager

## Additional Notes

- The web app runs on port 3001 by default (Next.js)
- The mobile app uses Expo Go for development
- Database changes during development use `db:push` (schema sync without migrations)
- Production deployments should use proper migrations via `db:migrate`
- All workspace scripts are defined in the root `package.json`
- Turborepo handles caching and parallel execution of tasks
