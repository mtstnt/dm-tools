# AGENTS

## File Access

Do not attempt to open `.env`. Use `.env.template` for required fields.

## Package Manager

Use Bun, not npm/yarn/pnpm.

## Commands

```bash
bun dev                   # Start dev server (localhost:3000)
bun run build             # Production build
bun run lint              # ESLint (flat config, eslint-config-next)
bunx tsc --noEmit         # Type check (no script configured; npx may resolve a global wrapper)
bun run db:generate       # Generate migration from schema.ts
bun run db:migrate        # Apply pending migrations
bun run db:seed           # Seed master data + default admin user
bun run db:reset          # Delete db/local.sqlite3 (Unix rm; fails on Windows)
bunx drizzle-kit check    # Validate schema and migration state
bunx drizzle-kit studio   # Open Drizzle Studio
```

- No typecheck script exists. Run `bunx tsc --noEmit` manually.
- No test framework is configured.
- `db:reset` uses `rm` and will not work on Windows without WSL/Git Bash.

## Environment Variables

Copy `.env.template` to `.env` and fill in:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=       # Firebase Web API key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=   # Firebase Auth domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=    # Firebase project ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_SC_BASE_URL=            # Client-exposed base URL for legacy event links
DATABASE_URL=db/local.sqlite3       # libsql://... (Turso) or file:./<name>.db (local SQLite)
DATABASE_AUTH_TOKEN=                # Turso auth token; omit for local SQLite
NODE_ENV=development
```

- `SC_BASE_URL` is referenced by server actions under `actions/legacy-web/` but is **not** in `.env.template`; add it manually for legacy events scraping.
- `DATABASE_URL` and `DATABASE_AUTH_TOKEN` are consumed by `db/connection.ts`.
- Firebase config is hardcoded in `lib/firebase.ts`; env vars are available for future migration.

## Architecture

Next.js 16 App Router + React 19 + TypeScript (strict) + Tailwind v4 + Shadcn UI (`base-nova`).

```
app/
  layout.tsx                Root: fonts, ThemeProvider, QueryClient, UserSessionProvider
  auth/
    page.tsx                Redirects to /auth/login
    login/page.tsx          Email/password login (local users table)
    forget-password/        Disabled — redirects to /auth/login
  my/                       Protected area (AuthGuard + sidebar)
    page.tsx                Redirects to /my/home
    home/page.tsx           Placeholder home
    layout.tsx              Sidebar shell shared with /tools
    audit-trails/page.tsx   Paginated audit log
    events/page.tsx         Placeholder
    schedules/page.tsx      Placeholder
    master/                 CRUD for regions, teams, event-types, ministries, metrics, tasks
    users/
      members/              Team member browser + dialogs
      permissions/page.tsx  Permission list
      roles/                Role list + role permission matrix
  tools/                    Protected area (AuthGuard + sidebar)
    page.tsx                Missing — /tools redirects via proxy.ts (but middleware is not wired)
    utilities/
      reports/page.tsx      Service report text generator
      assign/page.tsx       SVG-based volunteer block allocation
      tally/page.tsx        Full-screen tap counter synced to Firestore
    doa-wilayah/page.tsx    Monthly prayer schedule + linked TC tally
    reports-history/page.tsx Firestore report browser
    members/page.tsx        Firebase members browser
    legacy/events/          External SC events scraper + event editor

actions/                    Root-level server actions (NOT under app/)
  auth/login.ts             login(), logout(), getCurrentUser(), checkAuth()
  auth/session.ts           getUserSession() — full user session with roles + permissions
  master/_shared.ts         getUserContext(), checkPermission(), logAuditTrail()
  master/{regions,teams,event-types,ministries,metrics,tasks}.ts
  users/{members,roles,permissions}.ts
  audit-trails.ts
  legacy-web/_shared.ts     webFetch(), LegacyWebContext type
  legacy-web/auth/web-login.ts
  legacy-web/events/{list,detail,update,blocks/update,user-blocks/update,user-blocks/delete}.ts

db/
  schema.ts                 Drizzle ORM schema (SQLite/Turso)
  connection.ts             Drizzle client initialized from DATABASE_URL
  seeder.ts                 Master data + admin@email.com / 123456
  migrations/               Drizzle Kit output

components/
  ui/                       Shadcn components (base-nova, lucide icons)
  custom/                   master-crud-page.tsx, data-table.tsx
  app-sidebar.tsx           Navigation driven by lib/navigation.ts; filters by permissions
  auth-guard.tsx            Client-side route guard (cookie check)
  web-auth-guard.tsx        Auth gate for external SC events API
  providers.tsx             React Query (staleTime 5m, gcTime 30m, no refetch on focus)
  theme-provider.tsx        next-themes wrapper
  user-session-provider.tsx React Context for user session, roles, and permissions
  account-info.tsx          Logged-in user dropdown (local auth)

lib/
  firebase.ts               Hardcoded Firebase client config ("use client")
  navigation.ts             Sidebar menu items: groups + root links/dropdowns with optional resource
  utils.ts                  cn() helper
  queries/
    reports.ts              Firestore reports fetch + reportKeys
    events.ts               Re-exports legacy event actions + eventKeys
    members.ts              Firestore members fetch
    tally-session.ts        Firestore tally session read/write/subscribe
    doa-wilayah.ts          Firestore doa-wilayah read/write/subscribe
  parsers/
    events.ts               Cheerio parser for event list HTML
    event-details.ts        Cheerio parser for event edit HTML
    blocks.ts               Seat-layout block parser
    seat-layout.ts          Seat layout parser

types/
  event.ts                  EventDetail, EventArea, EventBlock, EventUser, EventAssignedUser
  firebase.d.ts             Window.__FIREBASE_APP__ augmentation

proxy.ts                    Exported middleware function + matcher; NOT wired to middleware.ts
```

## Key Facts

- **Shadcn UI**: Prefer Shadcn components. Config in `components.json` (style: `base-nova`, icon library: `lucide`).
- **Pages are client components**: All `page.tsx` files should be client components. Load page data by calling actions from the page component to avoid RSC -> Client runtime errors in the frontend.
- **Auth**: Local `users` table with bcrypt. Sets httpOnly `authenticated` cookie containing the numeric user ID. Firebase Auth is **not** used for app authentication; Firebase is only used for Firestore.
- **No middleware.ts**: `proxy.ts` exports middleware logic but is not wired up. Route protection is client-side via `AuthGuard` on `/my/*` and `/tools/*` layouts.
- **Default admin**: `db/seeder.ts` creates `admin@email.com` / `123456` with the `ADMIN` role.
- **Permission model**: Resources (`users`, `events`, `regions`, ...) × actions (`create`, `read`, `update`, `delete`, `execute`). The hardcoded `ADMIN` role name bypasses all permission checks in both `checkPermission()` (`actions/master/_shared.ts`) and `hasPermission()` (`components/user-session-provider.tsx`). Other roles receive explicit permissions via `db/seeder.ts`.
- **Route redirects**: `/` → `/my` via `proxy.ts`; `/my` → `/my/home`; `/auth` → `/auth/login`. These redirects only work if `middleware.ts` is created from `proxy.ts`.
- **Indonesian dates**: Month names are Indonesian (Januari–Desember). `parseDate()` in `lib/queries/reports.ts` and report pages use them.
- **Members page**: Renders team cards ordered numerically, SPVs first, plus a "Not Assigned" card. Full names stored uppercase, emails lowercase, both trimmed.
- **Master data CRUD**: All use `MasterCrudPage` + `DataTable` with server actions in `actions/master/`.
- **Legacy events**: Moved to `/tools/legacy/events`. Server actions are in `actions/legacy-web/events/` and use `SC_BASE_URL`. Event edit tabs: Assignment, Blocks, Dashboard. Mutations refresh via a `refetch` callback, not `window.location.reload`.
- **Reports generator**: Now at `/tools/utilities/reports`. Client-only, generates clipboard text, does NOT save to Firestore.
- **Tally counter**: `/tools/utilities/tally`. Full-screen tap counter. Reads/writes to Firestore `tallySession` collection; sessions are created from the Reports page or Doa Wilayah page.
- **Doa Wilayah**: `/tools/doa-wilayah`. Monthly prayer schedule (PIC, TC1, TC2, date, notes) stored in Firestore `doaWilayah/{year}/bulan/{month}`. Each month can open exactly one linked TC tally session.
- **Reports history / Members / Tally / Doa Wilayah** all require working Firebase config.
- **Query keys**: `reportKeys` in `lib/queries/reports.ts`, `eventKeys` in `lib/queries/events.ts`, `memberKeys` in `lib/queries/members.ts`.
- **Path alias**: `@/*` maps to project root.
- **ESLint overrides**: `@typescript-eslint/no-explicit-any` and `react-hooks/set-state-in-effect` are disabled.

## Frontend Conventions

- Use Shadcn components whenever possible.
- Controlled dropdowns must always provide the selected label map/value display (for Base UI `Select`, pass `items`) so the trigger shows the human-readable label, not a blank value.
- Do not stack interactive elements: avoid `<Button><Link /></Button>`, `<Button><button>...</button></Button>`, or adding a nested `button` when the parent element is already a button.
- When a link should look like a button, use `buttonVariants` with `Link` instead of wrapping `Link` in `Button`.

## Drizzle / Database Notes

- Local dev uses `DATABASE_URL=db/local.sqlite3` (or any `file:./<name>.db`).
- `drizzle.config.ts` switches dialect to `turso` in production; local uses `sqlite`.
- Run `bun run db:generate` then `bun run db:migrate` after schema changes.
- `bun run db:seed` is idempotent and safe to run multiple times.
- Schema includes users/roles/permissions, events, event assignments/metrics/volunteers/altar-calls, audit trails, and master tables.

## Docs

Feature specs in `docs/specs/`:
- `00-overview.md` — Stack, layout, data model
- `01-authentication.md` — Auth flow, cookie details, middleware gap
- `02-reports.md` — Report generator form fields, output format
- `03-reports-history.md` — Firestore query, table columns, detail sheet
- `04-events.md` — External events browser, web auth guard, cheerio parsing, assignment feature
- `05-assign.md` — Service assignment tool, SVG blocks, member management
- `06-doa-wilayah.md` — Monthly prayer schedule and linked tally
- `07-tally.md` — Full-screen tap counter synced to Firestore

<!-- BEGIN:nextjs-agent-rules -->
## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
