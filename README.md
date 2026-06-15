# E-Planner Frontend

Modern productivity frontend for E-Planner, built with Next.js App Router and TypeScript.
It provides authenticated flows, dashboard widgets, task management, folders, calendar views, settings, and an offline-friendly fallback mode.

## Features

- Authentication pages: login and register
- Dashboard with widgets (tasks, activity graph, daily phrase, clock)
- Task workflows with details and markdown notes
- Calendar and folder navigation views
- Recycle bin and settings sections
- Offline page and development mock support

## Tech Stack

- Next.js 16 + React 19 + TypeScript (strict mode)
- Tailwind CSS 4
- Zustand for client state
- zod for validation
- dnd-kit for drag and drop interactions
- Radix UI / shadcn-style UI primitives
- HugeIcons (`@hugeicons/react`)

## Prerequisites

- Node.js 20+
- pnpm 9+

## Quick Start (Local)

```bash
pnpm install
pnpm dev
```

App URL: [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create a local `.env` (or `.env.local`) with at least:

```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api
JWT_SECRET=replace_with_long_random_secret
API_DEBUG_LOGS=false
```

Notes:
- `NEXT_PUBLIC_API_URL` points to the backend API base URL.
- `JWT_SECRET` is required by frontend runtime/auth flows.
- `API_DEBUG_LOGS=true` enables verbose API debug logs.
- Server-side requests also support `API_URL`; if set, it is preferred over `NEXT_PUBLIC_API_URL`.

## Scripts

```bash
pnpm dev     # start local development server
pnpm build   # production build
pnpm start   # run built app
pnpm lint    # run ESLint
```

## Docker Compose

This repository compose file runs the frontend container only.
The backend must run separately on the same Docker network.

Create the shared network once (or use your existing one):

```bash
docker network create eplanner-shared-network
```

Run frontend:

```bash
docker compose up --build
```

Expected frontend port:
- Frontend: `3000`

`docker-compose.yml` requires `JWT_SECRET` in environment.

Network notes:
- Frontend joins `SHARED_BACKEND_NETWORK` (default: `eplanner-shared-network`).
- Backend container must also join the same network.
- Ensure `NEXT_PUBLIC_API_URL` points to the backend host reachable in that network (default: `http://backend:8000/api`).

## Project Structure

```text
src/
  app/          # app routes (auth, dashboard, offline, etc.)
  components/   # UI and feature components
  lib/          # api clients, i18n, utilities, validation
  stores/       # Zustand stores
  actions/      # server actions and domain operations
```
