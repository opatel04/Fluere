# Fluere

### Turn client conversations into clear, actionable work.

Fluere is an AI-powered workspace for freelancers and small teams. It turns client emails into structured tasks and project specifications, helps identify scope changes, and connects approved work to Trello.

## Overview

Client work often gets scattered across inboxes, notes, and project boards. Fluere brings those pieces together so you can review requests, define deliverables, and track work from one workspace.

AI-generated suggestions stay under your control: review and edit tasks before approving them for Trello.

## Features

- **Email-to-task extraction** — Extract actionable tasks and project details from client emails.
- **Client workspaces** — Keep client conversations, tasks, specifications, and activity connected.
- **Task management** — Review, edit, prioritize, and categorize suggested work.
- **AI-assisted specifications** — Generate project specifications from emails and refine them through chat.
- **Specification versioning** — Lock agreed specifications and maintain versions as requirements evolve.
- **Scope-change detection** — Flag incoming requests that may fall outside the agreed project.
- **Gmail integration** — Process client conversations without manually copying their contents.
- **Trello integration** — Sync approved tasks and link project specifications to Trello.
- **Follow-up tracking** — Surface unanswered conversations and upcoming deadlines.
- **Activity history** — Track important events across client projects.

## How it works

1. Connect your Gmail and Trello accounts.
2. Process client emails to extract tasks and project details.
3. Review and refine the suggested tasks and specifications.
4. Approve work and sync it to Trello.
5. Monitor follow-ups, project activity, and potential scope changes.

## Tech stack

| Area | Technologies |
| --- | --- |
| Frontend | Next.js 14, React, TypeScript |
| UI | Tailwind CSS, Radix UI, shadcn/ui, Framer Motion |
| Data fetching and state | TanStack Query, Zustand, Axios |
| Backend | Express 5, TypeScript |
| Database | PostgreSQL |
| Background processing | Redis, Bull |
| Integrations | Gmail, Trello, OpenAI, Gemini, Resend, Twilio |
| Testing and UI development | Vitest, React Testing Library, MSW, Storybook |
| Deployment | Railway |

## Repository structure

```text
frontend/   Next.js application
backend/    Express API, background workers, integrations, and migrations
```

## Local development

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL 14+
- Redis 6+
- Credentials for the integrations you want to enable

### 1. Clone the repository

```bash
git clone https://github.com/opatel04/TaskSnap-v2.git
cd TaskSnap-v2
```

### 2. Install dependencies

```bash
# Backend
cd backend
npm install
cp .env.example .env

# Frontend
cd ../frontend
npm install
```

### 3. Configure the environment

Update `backend/.env` with your PostgreSQL, Redis, and integration credentials. Refer to the backend and frontend documentation for package-specific configuration.

Ensure PostgreSQL and Redis are running before starting the application.

### 4. Start the application

Run each service in a separate terminal from the repository root.

**API server**

```bash
cd backend
npm run dev
```

**Background worker**

```bash
cd backend
npm run dev:worker
```

**Frontend**

```bash
cd frontend
npm run dev
```

### Local endpoints

| Service | URL |
| --- | --- |
| Web application | http://localhost:3001 |
| API | http://localhost:3000 |
| API health check | http://localhost:3000/health |

## Documentation

- [Backend setup and API overview](backend/README.md)
- [Frontend setup and development](frontend/README.md)
- [API documentation](backend/docs/API_DOCUMENTATION.md)
- [System architecture](backend/docs/ARCHITECTURE.md)
- [Frontend API specification](frontend/docs/FRONTEND_API_SPEC.md)
- [Specification and Trello linking](backend/SPEC_TRELLO_LINKING.md)

## Project status

Fluere is under active development.

The core workflow includes email-to-task extraction, AI-assisted specifications, chat-based editing, specification locking and versioning, Trello linking, client management, and scope-change monitoring.

Planned improvements include attachment processing and expanded edit-history views.

## Contributing

Issues, feature suggestions, and pull requests are welcome.

Before contributing, review the frontend and backend documentation. Keep API contracts aligned when changing shared functionality.

## License

The backend is released under the MIT license. The frontend is currently marked as a private application. Refer to the package-specific license files for usage and redistribution terms.
