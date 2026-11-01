# TaskSnap

### Turn client conversations into organized, actionable work.

TaskSnap is an AI-powered workspace for freelancers and small teams. It helps you turn emails into tasks, keep client work organized, detect follow-ups and scope changes, and connect your workflow with Gmail and Trello.

## Why TaskSnap?

Important work often starts in an inbox and gets lost between messages, notes, and project boards. TaskSnap brings that workflow together:

1. Connect your Gmail and Trello accounts.
2. Let TaskSnap identify tasks and project details from email.
3. Review, edit, prioritize, and approve the suggested work.
4. Sync approved tasks and project specifications to Trello.
5. Track follow-ups, activity, and scope changes from one dashboard.

## Features

- **AI email-to-task extraction** — turn client messages into structured tasks.
- **Client workspace** — keep clients, emails, tasks, and activity connected.
- **Smart task management** — sort, prioritize, categorize, and organize work.
- **Project specifications** — generate specs from emails and edit them through chat.
- **Scope-creep detection** — identify requests that go beyond the agreed project.
- **Gmail integration** — process client conversations without manually copying details.
- **Trello integration** — send approved work to the board and keep project links connected.
- **Follow-up and notification support** — stay ahead of unanswered messages and deadlines.
- **Activity tracking** — maintain a clear history of important project events.

## Product workflow

```text
Client email
    ↓
AI extracts tasks and project details
    ↓
Review and edit in TaskSnap
    ↓
Approve the work
    ↓
Trello card + project tracking
```

## Built with

| Area | Technology |
| --- | --- |
| Web application | Next.js 14, React, TypeScript |
| UI | Tailwind CSS, Radix UI, shadcn/ui, Framer Motion |
| Data fetching and state | TanStack Query, Zustand, Axios |
| API | Express 5, TypeScript |
| Database | PostgreSQL |
| Background jobs | Redis and Bull |
| Integrations | Gmail, Trello, OpenAI, Gemini, Resend, Twilio |
| Testing | Vitest, React Testing Library, MSW, Storybook |
| Deployment | Railway |

## Repository structure

```text
frontend/   Next.js web application
backend/    Express API, workers, integrations, and database migrations
```

## Try it locally

### Requirements

- Node.js 18+
- npm
- PostgreSQL 14+
- Redis 6+
- API credentials for the integrations you want to enable

### Setup

```bash
git clone https://github.com/opatel04/TaskSnap-v2.git
cd TaskSnap-v2

cd backend
npm install
cp .env.example .env

cd ../frontend
npm install
```

Configure the backend values in `backend/.env`, including your database, Redis, Gmail, Trello, and AI credentials. Then start the services in separate terminals:

```bash
# API server
cd backend
npm run dev

# Background worker
cd backend
npm run dev:worker

# Web application
cd frontend
npm run dev
```

The web app runs at [http://localhost:3001](http://localhost:3001). The API runs at [http://localhost:3000](http://localhost:3000), with a health check at [http://localhost:3000/health](http://localhost:3000/health).

## Documentation

- [Backend setup and API overview](backend/README.md)
- [Frontend setup and development guide](frontend/README.md)
- [API documentation](backend/docs/API_DOCUMENTATION.md)
- [System architecture](backend/docs/ARCHITECTURE.md)
- [Frontend API specification](frontend/docs/FRONTEND_API_SPEC.md)
- [Spec and Trello linking](backend/SPEC_TRELLO_LINKING.md)

## Project status

TaskSnap's core workflow is implemented: email-to-task extraction, AI-assisted project specifications, chat-based editing, spec locking and versioning, Trello linking, client management, and scope-creep monitoring.

The project is actively evolving. Some advanced capabilities, such as attachment processing and richer edit-history experiences, are planned improvements.

## Contributing

Issues, ideas, and pull requests are welcome. Before making changes, please review the package-specific documentation and keep frontend and backend API contracts aligned.

## License

The backend is released under the MIT license. The frontend is currently marked as a private application.
