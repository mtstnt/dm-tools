# Feature: Events

## Internal Events

### Event Schedule Browser

**Route**: `/my/events`

Displays a month-based calendar view of internal events grouped by date. Each date group shows event cards with event type, region, date/time, and assigned teams. Supports month/year navigation and expandable date groups.

Each event card shows an edit button (pencil icon) for users with Admin, Head Ministry, Regional PIC, or SPV role, and a delete button (trash icon) for users with Admin or Head Ministry role. Checks use `canAccess(role, [...])` from `lib/permissions.ts`. Clicking delete opens a confirmation dialog; confirming removes the event and all related data (teams, assignments, metrics, volunteers, altar calls) in a single transaction.

### Event Creation

**Route**: `/my/events/new`

Stack-based event creation form. Users can add multiple event cards, each with region, date/time, event type, and assignment mode (teams, members, or manual apply). Submit creates all events in a single transaction.

#### Monthly Bulk Create

A "Monthly Bulk Create" button opens a dialog that auto-generates event cards for AOG TEEN (16:00) and AOG YOUTH (18:30) on every Saturday of a selected month.

**Dialog fields**:
- **Region** — select the region for all generated events
- **Month** — Indonesian month names (Januari–Desember)
- **Year** — range of ±5 years from current

**Generation logic**:
1. Reads `BULK_EVENT_TYPES` from `lib/constants.ts` (default: `["AOG TEEN", "AOG YOUTH"]`) and looks up each by name (case-insensitive) from master data
2. Uses `eachWeekendOfMonth()` from `date-fns` and filters to `BULK_EVENT_TARGET_DAY` (default: `6` = Saturday)
3. Creates one card per event type per Saturday, using start times from `BULK_EVENT_TIME` (default: AOG TEEN 16:00, AOG YOUTH 18:30) and `DATETIME_LOCAL_FORMAT` for the input
4. All cards default to "teams" assignment mode
5. Cards are appended to the existing card list for review/editing before submission

**Files**:
- `app/my/events/new/page.tsx` — trigger button and dialog wiring
- `app/my/events/_components/monthly-bulk-create-dialog.tsx` — standalone dialog component
- `lib/constants.ts` — shared constants: `MONTHS_ID`, `BULK_EVENT_TYPES`, `BULK_EVENT_TIME`, `BULK_EVENT_TARGET_DAY`, `DATETIME_LOCAL_FORMAT`

---

## Legacy Events Browser (SC Website)

## Overview

Page that scrapes event data from an external API using Cheerio. Uses a separate web auth flow (not Firebase) with credentials stored in localStorage. This feature lives under `/tools/legacy/events`.

## Files

| File | Role |
|------|------|
| `app/tools/legacy/events/page.tsx` | Events grid with filters (client component) |
| `app/tools/legacy/events/[eventId]/edit/page.tsx` | Event edit page — fetches `EventDetail`, renders tabs |
| `app/tools/legacy/events/[eventId]/edit/assignment-tab.tsx` | Assignment tab — assign/remove blocks, remove users |
| `app/tools/legacy/events/[eventId]/edit/blocks-tab.tsx` | Blocks tab — edit chair grid per block |
| `actions/legacy-web/events/list.ts` | `getEvents()` server action |
| `actions/legacy-web/events/detail.ts` | `getEventDetail()` server action |
| `actions/legacy-web/events/update.ts` | `updateEventUsers()` server action |
| `actions/legacy-web/events/user-blocks/update.ts` | `updateUserBlocks()` server action |
| `actions/legacy-web/events/user-blocks/delete.ts` | `removeUserBlock()` server action |
| `actions/legacy-web/events/blocks/update.ts` | `updateBlock()` server action |
| `actions/legacy-web/users/fetch-all.ts` | `fetchAllUsers()` server action — fetches all SC users from a sample event page |
| `actions/legacy-web/_shared.ts` | Shared `webFetch()` + `LegacyWebContext` type |
| `components/web-auth-guard.tsx` | Auth gate dialog for external API credentials |
| `components/ui/multi-select.tsx` | Shadcn-compatible react-select wrapper for multi-select dropdowns |
| `lib/parsers/events.ts` | Cheerio HTML parser → `EventInfo[]` (event list) |
| `lib/parsers/event-details.ts` | Cheerio parser for event edit page HTML → `EventDetail` |
| `lib/parsers/blocks.ts` | Seat-layout block parser |
| `lib/parsers/seat-layout.ts` | Seat layout parser |
| `lib/queries/events.ts` | Re-exports all event server actions + `eventKeys` query key factory + `EventInfo` type |
| `lib/utils.ts` | `parseEventTitle()` — parses "date/name/time" format |
| `types/event.ts` | `EventDetail`, `EventArea`, `EventBlock`, `EventUser`, `EventAssignedUser` interfaces |

## Auth Flow (Web Auth)

1. User navigates to `/tools/legacy/events`
2. `WebAuthGuard` checks localStorage for stored credentials + cookie
3. If missing → shows modal dialog (email + password)
4. On submit → calls `webAuthLogin()` server action from `actions/legacy-web/auth/web-login.ts`
5. Server action: GET `/login` → extract CSRF token → POST `/login` → extract `sails.sid` cookie
6. On success → stores email, base64-encoded password, and cookie in localStorage
7. Subsequent visits → restores session from localStorage

### Storage Keys

```
web-auth-email     → plaintext email
web-auth-password  → base64-encoded password
web-auth-cookie    → sails.sid cookie value
```

### Sign Out

Click "Sign out" button → `clearWebAuth()` removes all three localStorage keys → page reloads.

## Data Fetching

- Uses TanStack React Query with `eventKeys.all` query key
- `getEvents(ctx)` server action scrapes pages 1–10 from `SC_BASE_URL/event?page={n}`
- Parses HTML with Cheerio, extracts `.card` elements → `EventInfo[]`
- Filters to events with name in `["AOG TEEN", "AOG YOUTH"]` and location `GMS Surabaya Selatan`
- Query runs only when `WebAuthGuard` is authenticated

## Event Edit Page

- Route: `/tools/legacy/events/[eventId]/edit`
- Calls `getEventDetail(ctx, eventId)` which GETs `SC_BASE_URL/event/edit/{eventId}`
- Parses the edit form HTML via `parseEventPage()` into `EventDetail`
- Contains three tabs: **Assignment**, **Blocks**, **Dashboard** (placeholder)
- Auth-gated by `WebAuthGuard`

### Refresh Mechanism

- `page.tsx` exposes a `refetch` callback (`useCallback` wrapping `getEventDetail`) and passes it down to `AssignmentTab`
- All mutations (assign, remove block, remove user) call `await refetch()` on success instead of `window.location.reload()`
- `page.tsx` initial mount state is `"loading"`; the same `refetch` is invoked in `useEffect`

### Assignment Tab

Allows SPV/PIC users to assign blocks to users and remove users/blocks.

**UI Components:**
- Left multi-select dropdown: Users (all available users, pre-filtered by `ALLOWED_USER_IDS` in the parser)
- Right multi-select dropdown: Blocks (flattened from `areas[].blocks`)
- Submit button: POSTs assignment to external API
- Per-user trash icon (rightmost column): removes the user from the event

**Submit Flow:**
1. Gets web auth cookie from localStorage
2. Calls `updateEventUsers()` to merge new user IDs with existing assigned IDs
3. Calls `updateUserBlocks()` to assign selected blocks to selected users
4. On success → `await refetch()` (re-fetches `EventDetail`), resets selection after 2s

**Remove Block Flow:**
1. Click X on a block badge → confirmation dialog
2. Calls `removeUserBlock(ctx, eventId, blockId, block.userIds, userIdToRemove)` — sends the block's remaining user list (excluding the removed user)
3. On success → `await refetch()`

**Remove User Flow:**
1. Click trash icon → confirmation dialog
2. Calls `updateEventUsers(ctx, eventId, remainingUserIds)` with all assigned user IDs except the selected one
3. On success → `await refetch()`

### Blocks Tab

- Select area → select block → displays chair grid visualization
- Reads nested `areas[].blocks` for the selected area (no flat `blocks` array or `area_id` field)
- Grid shows occupied (green) and empty (muted) seats
- `block.userIds` is passed directly to `updateBlock()` (no client-side derivation from `users`)
- Revert button restores grid from `block.chairs`

## Server Actions

### `fetchAllUsers(ctx)`

Fetches all users from the external SC website by parsing a sample event edit page (event ID 95469). Returns `EventUser[]` with id, fullName, and email.

### `updateUserBlocks(ctx, eventId, userIds, blockIds)`

Assigns users to blocks in the external events system.

**Response Handling:**
- Redirect (Location header) → success
- HTML with "Forbidden" + "don't have permission" → returns forbidden error
- Non-ok status → returns generic error

### `removeUserBlock(ctx, eventId, blockId, userAssignedToBlock, userToRemoveId)`

Removes a single user from a block by re-sending the block's user list minus that user. Fetches a fresh CSRF token from `/csrfToken` before the request.

### `updateEventUsers(ctx, eventId, userIds)`

Replaces the event's entire user list. Used both for adding users (assign flow) and removing users (delete flow sends the remaining IDs).

### `updateBlock(ctx, blockId, name, row, col, chairsData, userIds)`

Updates a block's name, grid dimensions, chairs layout, and assigned users.

## Event Interfaces

Defined in `types/event.ts`:

```typescript
interface EventDetail {
  id: number;
  name: string;
  date: string;
  location: string;
  areas: EventArea[];
  users: EventAssignedUser[];   // assigned users only (filtered by ALLOWED_USER_IDS in parser)
  allUsers: EventUser[];        // pre-filtered by ALLOWED_USER_IDS in parser
  csrf: string;
}

interface EventArea {
  id: number;
  name: string;
  blocks: EventBlock[];
}

interface EventBlock {
  id: number;
  name: string;
  row: number;
  column: number;
  userIds: number[];
  chairs: number[][];
}

interface EventUser {
  id: number;
  fullName: string;
  email: string;
}

interface EventAssignedUser {
  id: number;
  fullName: string;
  email: string;
  assignedBlockIds: number[];
  taskIds?: number[];
}
```

`EventInfo` (event list cards) is defined in `lib/parsers/events.ts` and re-exported via `lib/queries/events.ts`.

## HTML Parsing

### Event List Parser (`lib/parsers/events.ts`)
Targets `.card` elements. Header format: `"24 JUN 2026 / AOG TEEN / 16:00"`. Returns `EventInfo[]` with `eventId`, `name`, `date`, `time`, `location`, `showUrl`, `editUrl`, `locked`.

### Event Details Parser (`lib/parsers/event-details.ts`)
- `parseEventPage(id, html)` → `EventDetail`
- Extracts users from `#users li` and `#event_users li` elements (merged, deduped)
- Extracts areas from form groups with "Area" heading
- Extracts blocks from `var blocks = [...]` in script tags (filters out "All Block")
- Builds `users[i].assignedBlockIds` by inverting the block→users mapping
- Pre-filters `allUsers` to `ALLOWED_USER_IDS` (hardcoded set of 36 IDs)
- Extracts CSRF token from `<input name="_csrf">` or `window._token` script pattern
- `allUsers` field is pre-filtered; `users` field contains only assigned users

## UI Features

- **Filters**: Location, event name, date — all via Select dropdowns
- **Card layout**: Responsive grid (1→6 columns based on breakpoint)
- **Card content**: Event name, date badge, time, location, lock/unlock icon
- **Card footer**: "Seats", "Presence", and "Edit" links using `NEXT_PUBLIC_SC_BASE_URL` + relative URL
- **States**: Loading (12 skeleton cards), error (retry button), empty, filtered-empty
- **Multi-select**: react-select wrapper with Shadcn styling for users and blocks dropdowns

## Environment Requirements

- `SC_BASE_URL` — Server-only, used in `actions/legacy-web/events/` for fetch requests. Not present in `.env.template`; add manually.
- `NEXT_PUBLIC_SC_BASE_URL` — Client-side, used for link generation in event cards.

## Gotchas

- Web auth is completely separate from app auth — different credentials
- Password stored as base64 in localStorage (not encrypted)
- `getEvents` scrapes 10 pages in parallel — if site structure changes, parser breaks
- Cheerio parser assumes specific HTML structure (`.card`, `b` tag header, `.container > div`)
- Event IDs extracted via regex from URLs, may be null
- Assignment feature requires SPV/PIC role in Firebase `members` collection
- CSRF token is extracted from event edit page HTML; `removeUserBlock` additionally fetches a fresh token from `/csrfToken`
- `allUsers` is pre-filtered to `ALLOWED_USER_IDS` in the parser (`lib/parsers/event-details.ts`), not in the client component
- Mutations refresh via `refetch` callback (re-calls `getEventDetail`), not `window.location.reload`

---

# Feature: Local Events (Internal Database)

## Overview

Events created and managed within the app's own database (SQLite/Turso via Drizzle ORM). This is a separate system from the legacy SC events browser. Events have a status that determines their visual indicator on the list page and their label on the detail page.

## Files

| File | Role |
|------|------|
| `actions/events.ts` | Server actions: `getEventSchedule`, `getEventScheduleYears`, `getEventDetail`, `getEventConfiguration`, `updateEventConfiguration`, `getEventCreationOptions`, `createEvents`, `getEventForEdit`, `updateEvent`, `deleteEvent` |
| `app/my/events/page.tsx` | Events schedule list with month/year filters, date-grouped cards |
| `app/my/events/[id]/page.tsx` | Event detail with Configuration, Assignment, Seating, Reporting tabs |
| `app/my/events/[id]/_components/configuration-tab.tsx` | Event configuration editor |
| `app/my/events/[id]/_components/assignment-tab.tsx` | User/block assignment |
| `app/my/events/[id]/_components/seating-tab.tsx` | Seating layout |
| `app/my/events/[id]/_components/reporting-tab.tsx` | Event metrics and volunteer reporting |
| `app/my/events/new/` | Event creation flow |
| `db/schema.ts` | `events` table, `eventStatusEnum`, related tables |

## Types

### `EventScheduleItem` (`actions/events.ts`)

```typescript
type EventScheduleItem = {
  id: number;
  name: string;
  date: Date;
  status: EventStatus;          // "pending" | "incomplete" | "completed"
  regionName: string;
  eventTypeName: string;
  mode?: EventMode;             // "teams" | "members" | "manual_apply"
  requiresApplication: boolean;
  teams: { id: number; number: number }[];
};
```

### `EventDetailData` (`actions/events.ts`)

```typescript
type EventDetailData = {
  id: number;
  name: string;
  date: Date;
  status: EventStatus;
  regionName: string;
  eventTypeName: string;
  mode: EventMode;
  allUsers: { id: number; fullName: string; email: string }[];
  assignments: {
    id: number;
    fullName: string;
    email: string;
    assignedBlockIds: number[];
    taskIds: number[];
  }[];
};
```

### `EventStatus` (`db/schema.ts`)

```typescript
const eventStatusEnum = ["pending", "incomplete", "completed"] as const;
type EventStatus = "pending" | "incomplete" | "completed";
```

## Status Indicator Logic

The status displayed to the user is **derived** from both the `status` database field and the event date. This logic is shared between the list page and detail page.

### Derivation Rules

| DB `status` | Event Date | Display Indicator | Display Label |
|-------------|-----------|-------------------|---------------|
| `completed` | any | Green check icon (`CheckCircle`) | "Completed" |
| `pending` | future | Nothing (hidden) | "Pending" |
| `pending` | past / present | Yellow warning icon (`TriangleAlert`) | "Incomplete" |
| `incomplete` | future | Nothing (hidden) | "Pending" |
| `incomplete` | past / present | Yellow warning icon (`TriangleAlert`) | "Incomplete" |

### Implementation

**List page** (`app/my/events/page.tsx`): `getStatusIcon(event)` returns a JSX icon element or `null`. The icon is rendered to the right of the event type name in each card's header. When the event date has passed, the card header text (`CardTitle` and `CardDescription`) renders in muted/gray color (`text-muted-foreground`) to visually distinguish past events.

**Detail page** (`app/my/events/[id]/page.tsx`): `getStatusLabel(status, date)` returns `"Completed"`, `"Pending"`, or `"Incomplete"`. The `STATUS_STYLES` record maps these labels to color classes (green, yellow, orange).

## Tab Architecture (Event Detail)

The detail page uses Shadcn `Tabs` with four tabs:

1. **Configuration** — Editable key-value fields stored as JSON in `events.configuration`.
2. **Assignment** — Assign users to tasks/blocks. Uses `allUsers` for selection and existing `assignments` for display.
3. **Seating** — Visual seating layout (WIP).
4. **Reporting** — Event metrics (altar calls, volunteers) sourced from `eventMetrics`, `eventVolunteers`, `eventAltarCalls`.

## Database Schema

The `events` table (`db/schema.ts:329`) includes:
- `regionId`, `eventTypeId` — foreign keys to master tables
- `date` — event date/time as timestamp
- `name` — display name (derived from event type, or custom)
- `mode` — `"teams"` | `"members"` | `"manual_apply"`
- `configuration` — JSON array of `{ field, value }` pairs
- `sourceId` — optional reference to external event ID (legacy sync)
- `status` — `"pending"` (default) | `"incomplete"` | `"completed"`

Related tables: `eventTeams`, `eventAssignments`, `eventMetrics`, `eventVolunteers`, `eventAltarCalls`.

## Queries

### `getEventSchedule(month, year)`
- **Authorization**: Requires at least `Member` role. Uses `canAccess(await getUserRole(), [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC, ROLES.SPV, ROLES.MEMBER])`.
- Returns all events within the given calendar month.
- Uses `leftJoin` on `eventTeams`/`teams` — events with multiple teams produce multiple rows, deduplicated via a `Map<id, EventScheduleItem>`.
- Each event includes its `status` for the status indicator logic.

### `getEventDetail(eventId)`
- **Authorization**: Requires at least `Member` role.
- Returns a single event with its status, all system users, and all assignments for that event.
- Assignments are aggregated by `userId`, collecting `assignedBlockIds` (from `blockName`) and `taskIds`.

---

# Feature: Event Recap

## Overview

A participation summary table that shows how many non-mandatory events each user has participated in within a given year. Excludes AOG TEEN and AOG YOUTH event types.

**Route**: `/my/events/recap`

## Files

| File | Role |
|------|------|
| `actions/events/recap.ts` | Server actions: `getEventRecapSummary`, `getUserRecapEvents` |
| `app/my/events/recap/page.tsx` | Client component with table and year navigation |

## UI

- **Table columns**: Full Name, NIJ, Team, Role, Participations (count)
- **Sorting**: Descending by participation count, ties broken alphabetically by full name
- **Year navigation**: Previous/next year buttons; defaults to current year
- **Expandable rows**: Click a row to expand and show the user's event list
  - Events are lazy-loaded when the row is first expanded, then cached client-side for the session
  - Loading state shows a spinner while fetching
- **Event badges**: Each event renders as a `<Badge variant="secondary">` with format `"<Event Name> / <Event Date>"` where the date uses `"d MMM yyyy"` format (e.g. "24 Jun 2026")
  - If the user's assignment includes the "Event PIC" task, `(PIC)` is appended to the badge
  - Badges are clickable links that open `/my/events/[eventId]` in a new tab

## Server Actions

### `getEventRecapSummary(year?)`

- **Authorization**: Requires at least `Member` role
- **Year**: Defaults to current year; validated range 2020–2100
- **Query**: Joins `eventAssignments` → `users`, `events`, `eventTypes`, `teams`, `roles`
- **Filters**: Excludes event types "AOG TEEN" and "AOG YOUTH"; scoped to the target calendar year (`date >= Jan 1 AND date < Jan 1 of next year`)
- **Aggregation**: `COUNT(DISTINCT eventId)` per user
- **Returns**: `EventRecapSummaryItem[]` with `userId`, `fullName`, `nij`, `teamNumber`, `roleName`, `participationCount`

### `getUserRecapEvents(userId, year?)`

- **Authorization**: Requires at least `Member` role
- **Purpose**: Lazy-loaded per-user event list when a row is expanded
- **Query**: Joins `eventAssignments` → `events`, `eventTypes`, `tasks`; filtered by `userId`, year, and excluded event types
- **Returns**: `UserRecapEvent[]` with `eventId`, `eventName`, `eventDate`, `isPic`
- **Deduplication**: Uses a `Map<eventId>` — if a user has multiple assignments for the same event (e.g. PIC + another role), they appear as one entry with `isPic: true`
- **Caching**: Client-side `useRef<Map<number, UserRecapEvent[]>>()`; cleared on year change

## Data Model

The recap is derived entirely from existing tables:

```
eventAssignments → users (full_name, nij, team_id, role_id)
                 → events (date, event_type_id)
                 → eventTypes (name) — filtered to exclude AOG TEEN / AOG YOUTH
                 → tasks (name) — checked for "Event PIC"

teams, roles — LEFT JOINed via users for display
```

No new database tables or columns are required.
