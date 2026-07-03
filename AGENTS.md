# AGENTS

## Package Manager

Use Bun, not npm/yarn/pnpm.

## Commands

```bash
bun dev                   # Start dev server (localhost:3000)
bun run build             # Production build
bun run lint              # ESLint (flat config, eslint-config-next)
npx tsc --noEmit          # Type check (no script configured)
bunx drizzle-kit generate # Generate migration from schema.ts
bunx drizzle-kit migrate  # Apply pending migrations
bunx drizzle-kit check    # Validate schema and migration state
bunx drizzle-kit studio   # Open Drizzle Studio
```

No typecheck script exists. Run `npx tsc --noEmit` manually if needed.
No test framework is configured.

## Environment Variables

Copy `.env.template` to `.env` and fill in:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=       # Firebase Web API key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=   # Firebase Auth domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=    # Firebase project ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
DATABASE_URL=                       # libsql://... (Turso) or file:./<name>.db (local SQLite)
DATABASE_AUTH_TOKEN=                # Turso auth token; omit for local SQLite
SC_BASE_URL=                        # Server-only. Base URL for external events API (used by server actions)
NEXT_PUBLIC_SC_BASE_URL=            # Client-exposed. Same value, used for link generation in event cards
```

`DATABASE_URL` and `DATABASE_AUTH_TOKEN` are consumed by `db/connection.ts`. Use `file:./<name>.db` for local development; for Turso, use the `libsql://` URL and auth token.
`SC_BASE_URL` is server-only (used in `app/actions.ts` for web auth and event fetching).
`NEXT_PUBLIC_SC_BASE_URL` is client-side (used in `app/tools/events/` card links).
Firebase config is hardcoded in `lib/firebase.ts` but env vars are available for future migration.

## Architecture

Next.js 16 App Router + React 19 + TypeScript (strict) + Tailwind v4.

```
db/
  schema.ts           Drizzle ORM schema (libsql/Turso/SQLite) — tables, enums, indexes, relations
  connection.ts       Drizzle client initialized from DATABASE_URL + DATABASE_AUTH_TOKEN

app/
  layout.tsx          Root: fonts (Instrument Serif, DM Sans, IBM Plex Mono), ThemeProvider, QueryClient
  actions/
    _shared.ts        Shared webFetch() + LegacyWebContext type for all external-API actions
    auth/web-login.ts webAuthLogin() server action
    events/
      list.ts         getEvents() — paginated fetch + cheerio parse → EventInfo[]
      detail.ts       getEventDetail() — fetch + cheerio parse → EventDetail
      update.ts       updateEventUsers() — replace event's user list
      blocks/update.ts    updateBlock() — update a block's chairs/rows/cols/users
      user-blocks/update.ts updateUserBlocks() — assign users to blocks
      user-blocks/delete.ts removeUserBlock() — remove a single user from a block
  auth/
    login/page.tsx    Firebase email/password login
    forget-password/  Firebase password reset email
  tools/              Protected area (sidebar layout)
    reports/          Report text generator (client-only, no Firestore write)
    reports-history/  Firestore report browser
    assign/           Service assignment tool (SVG-based block allocation)
    events/           External events browser + event edit viewer (web auth guard)
    test-firebase/    Firebase debug page
components/
  ui/                 18 Shadcn components (base-nova style) + multi-select (react-select wrapper)
  providers.tsx       React Query (staleTime 5m, gcTime 30m, no refetch on focus)
  web-auth-guard.tsx  Auth gate for external events API (localStorage-based session)
lib/
  firebase.ts         Firebase client init — hardcoded config, "use client"
  queries/
    reports.ts        Firestore fetch for reports collection
    events.ts         Re-exports all event server actions + eventKeys query key factory
  parsers/
    events.ts         Cheerio parser for event list HTML → EventInfo[]
    event-details.ts  Cheerio parser for event edit page HTML → EventDetail
types/
  event.ts            EventDetail, EventArea, EventBlock, EventUser, EventAssignedUser interfaces
```

## Key Facts

- **Shadcn UI**: Always prefer Shadcn components. Config in `components.json` (style: `base-nova`, icon library: `lucide`).
- **Mobile-responsive**: All pages must work on mobile. Reports page has a fixed bottom preview bar on small screens.
- **Auth**: Firebase email/password → sets `authenticated` cookie via server action. Cookie is a simple boolean, not a Firebase token.
- **No middleware.ts**: `proxy.ts` exports middleware logic but is NOT wired up. Route protection is inactive by default.
- **Firebase config**: Hardcoded in `lib/firebase.ts`, not reading from `process.env`. Env vars in `.env` are unused by the client code.
- **Indonesian dates**: Month names are Indonesian (Januari–Desember). `parseDate()` in `lib/queries/reports.ts` and `formatDateDisplay()` in reports page.
- **Reports page**: Client-only form that generates text for clipboard. Does NOT save to Firestore.
- **Reports history**: Reads from Firestore `reports` collection. Fields include `divisions` (map of ministry→count), `type` (AOG_YOUTH, AOG_TEEN, EVENT).
- **Events page**: Scrapes external events API via server action (cheerio). Uses `WebAuthGuard` with localStorage-based session (not Firebase). Requires `SC_BASE_URL` + `NEXT_PUBLIC_SC_BASE_URL` env vars. List page shows `EventInfo` cards (filterable by location/name/date). Event edit page parses HTML into `EventDetail` via `getEventDetail()`. Assignment tab allows SPV/PIC users to assign blocks to users (`updateUserBlocks`), remove a block from a user (`removeUserBlock`), and remove a user from the event (`updateEventUsers` with remaining IDs). Blocks tab edits a block's chairs grid (`updateBlock`). All mutations refresh data via a `refetch` callback (re-calls `getEventDetail`) instead of `window.location.reload`.
- **Assign page**: SVG-based service block allocation tool. Generates Teen/Youth assignments. Client-only, no persistence.
- **Theme**: Light mode default, class-based dark mode via `next-themes`.
- **Fonts**: CSS variables `--font-display` (Instrument Serif), `--font-sans` (DM Sans), `--font-mono` (IBM Plex Mono).
- **Query keys**: Defined in `lib/queries/reports.ts` as `reportKeys` object and `lib/queries/events.ts` as `eventKeys`.
- **Path alias**: `@/*` maps to project root.

## Docs

Feature specs in `docs/specs/`:
- `00-overview.md` — Stack, layout, data model
- `01-authentication.md` — Auth flow, cookie details, middleware gap
- `02-reports.md` — Report generator form fields, output format
- `03-reports-history.md` — Firestore query, table columns, detail sheet
- `04-events.md` — External events browser, web auth guard, cheerio parsing, assignment feature
- `05-assign.md` — Service assignment tool, SVG blocks, member management

Reference samples in `docs/sample/`:
- `service-assignment.tsx.example` — Complex SVG-based assignment tool (not integrated)
- `service-assignment.html.example` — Standalone HTML version of same

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
