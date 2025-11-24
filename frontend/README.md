# TaskSnap Frontend

Frontend application for TaskSnap - Client and Task Management System.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **TailwindCSS 3.x** (design tokens, spacing scale, radii, elevation only)
- **shadcn/ui** + Radix for accessible primitives
- **Zustand** for local/app state
- **TanStack Query** for server data
- **React Hook Form + Zod** for forms/validation
- **Axios** for HTTP client
- **lucide-react** for icons
- **Storybook** for component catalog
- **@dnd-kit** for drag and drop
- **MSW** for API mocking
- **Vitest** + React Testing Library for testing

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.local.example .env.local
```

3. Start the development server:
```bash
npm run dev
```

The app will be available at [http://localhost:3001](http://localhost:3001)

### Other Commands

- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Run tests with coverage
- `npm run storybook` - Start Storybook (port 6006)
- `npm run build-storybook` - Build Storybook

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (protected)/       # Protected pages (dashboard, clients, tasks, etc.)
│   └── globals.css        # Global styles
├── components/
│   ├── ui/                # shadcn/ui components
│   ├── primitives/        # Primitive components (Button, Input, Card, etc.)
│   └── domain/            # Domain components (StatsCard, ClientCard, etc.)
├── lib/
│   ├── api/               # API client setup
│   ├── hooks/             # Custom React hooks
│   ├── store/             # Zustand stores
│   ├── types/             # TypeScript types
│   ├── analytics.ts       # Analytics wrapper
│   └── utils.ts           # Utility functions
├── mocks/
│   ├── fixtures/          # JSON fixtures (users, clients, tasks, emails, ai_suggestions)
│   ├── handlers.ts        # MSW request handlers
│   └── browser.ts         # MSW browser setup
├── config/
│   └── featureFlags.ts    # Feature flags configuration
└── test/
    └── setup.ts           # Test setup file
```

## Mock API

The project uses MSW (Mock Service Worker) for API mocking. The mock server is configured in `src/mocks/` and uses fixtures from `src/mocks/fixtures/`.

### API Endpoints (Mocked)

- `POST /api/v1/auth/login` - User login
- `GET /api/v1/users/profile` - Get user profile
- `GET /api/v1/clients` - List clients (with filters)
- `GET /api/v1/clients/:id` - Get client detail
- `GET /api/v1/tasks` - List tasks
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/clients/:id/emails` - List client emails
- `POST /api/v1/ai/extract-manual` - AI task extraction

See the spec document for detailed request/response shapes.

## Feature Flags

Feature flags are configured in `src/config/featureFlags.ts` and can be controlled via environment variables:

```env
FEATURE_FLAGS=kanban,email_integration
```

## Development Guidelines

- Follow the component structure: primitives → domain components
- All components should have Storybook stories
- Write tests for critical flows
- Ensure accessibility (keyboard navigation, ARIA labels)
- Responsive design: mobile (<768px), tablet (768-1024px), desktop (>1024px)
- Use TypeScript for type safety
- Follow the existing code style and conventions

## Testing

Run tests with:
```bash
npm run test
```

Tests use Vitest and React Testing Library. Critical flows to test:
- Auth success/failure
- Clients list + open client detail
- Create task + show in list/kanban
- Email AI extract accept flow
- Accessibility tests with jest-axe

## Storybook

Start Storybook with:
```bash
npm run storybook
```

Each component should have stories showing: default, loading, empty, error, and mobile viewport states.

## License

Private - TaskSnap

