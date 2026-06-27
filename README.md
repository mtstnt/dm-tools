# DM Tools

Ministry management toolkit — service reports, volunteer assignment, and event browsing.

## Stack

Next.js 16 App Router · React 19 · TypeScript · Tailwind v4 · Shadcn UI · Firebase (Auth + Firestore) · TanStack React Query

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Configure environment

```bash
cp .env.template .env
```

Fill in the values in `.env`:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `SC_BASE_URL` | Server-only. Base URL for external events API |
| `NEXT_PUBLIC_SC_BASE_URL` | Client-exposed. Same value, used for event card links |

### 3. Run dev server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
bun dev          # Dev server (localhost:3000)
bun run build    # Production build
bun run lint     # ESLint
npx tsc --noEmit # Type check (no script configured)
```

## Features

| Feature | Route | Description |
|---------|-------|-------------|
| Login | `/auth/login` | Firebase email/password auth |
| Forget Password | `/auth/forget-password` | Firebase password reset |
| Service Reports | `/tools/reports` | Generate formatted report text (clipboard) |
| Reports History | `/tools/reports-history` | Browse Firestore-saved reports |
| Assign | `/tools/assign` | SVG-based volunteer block allocation |
| Events | `/tools/events` | Browse external events (experimental) |
| Firebase Debug | `/tools/test-firebase` | Firebase connectivity test |

## Docs

Feature specs in `docs/specs/`.

## Deploy

Deploy to Vercel or any platform supporting Next.js 16. Ensure all env vars are set in the hosting environment.
