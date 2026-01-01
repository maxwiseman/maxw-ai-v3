# maxw-ai-v3

An AI-powered educational platform combining web and mobile interfaces with advanced AI agents for learning assistance, task management, and content creation.

## Features

- **AI-Powered Chat**: Interactive AI chat with streaming responses, tool integration, and multiple specialized agents (General, Secretary, Study, Triage)
- **Educational Dashboard**: Manage classes, assignments, todos, and study sets
- **Study Tools**: Create and review flashcards, question sets, and educational content
- **Canvas Workflow**: Integration with Canvas LMS
- **Cross-Platform**: Web app (Next.js) and mobile app (React Native + Expo)
- **Authentication**: Secure user authentication with Better-Auth
- **Search**: Integrated search functionality with Upstash
- **Modern Tech Stack**: TypeScript, Next.js 16, React 19, TailwindCSS, shadcn/ui, Drizzle ORM, PostgreSQL

## Getting Started

### Prerequisites

- Bun (package manager)
- PostgreSQL database
- Node.js (for React Native development)

### Installation

1. Install dependencies:
```bash
bun install
```

### Environment Setup

1. Copy environment files:
```bash
cp apps/web/.env.example apps/web/.env
cp apps/native/.env.example apps/native/.env
```

2. Configure your environment variables in `apps/web/.env`:
   - Database connection string
   - Authentication secrets
   - AI API keys (OpenAI, etc.)
   - Other service configurations

### Database Setup

1. Ensure PostgreSQL is running and accessible.
2. Push the database schema:
```bash
bun db:push
```
3. (Optional) View your database with Drizzle Studio:
```bash
bun db:studio
```

### Development

Start all applications:
```bash
bun dev
```

Or run individually:
- Web app: `bun dev:web` (http://localhost:3000)
- Mobile app: `bun dev:native` (use Expo Go app)







## Project Structure

```
maxw-ai-v3/
├── apps/
│   ├── web/         # Next.js web application with API routes
│   │   ├── src/
│   │   │   ├── ai/           # AI agents, tools, and artifacts
│   │   │   ├── app/          # Next.js App Router pages
│   │   │   ├── components/   # React components and UI
│   │   │   ├── db/           # Database schema and connections
│   │   │   ├── lib/          # Utilities and configurations
│   │   │   └── types/        # TypeScript definitions
│   │   └── package.json
│   └── native/      # React Native mobile application (Expo)
│       ├── app/              # Expo Router pages
│       ├── components/       # Mobile components
│       └── package.json
├── packages/       # Shared packages (if any)
├── biome.json      # Code formatting and linting config
├── turbo.json      # Turborepo configuration
└── package.json    # Root package.json with workspace scripts
```

## Available Scripts

- `bun dev`: Start all applications in development mode
- `bun build`: Build all applications
- `bun dev:web`: Start only the web application
- `bun dev:native`: Start the React Native/Expo development server
- `bun build:web`: Build only the web application
- `bun build:native`: Build only the native application
- `bun check-types`: Check TypeScript types across all apps
- `bun db:push`: Push schema changes to database
- `bun db:studio`: Open database studio UI
- `bun db:generate`: Generate database migration files
- `bun db:migrate`: Run database migrations
- `bun check`: Run Biome formatting and linting
