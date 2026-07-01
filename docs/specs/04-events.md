# Feature: Events Browser

## Overview

Page that scrapes event data from an external API using Cheerio. Uses a separate web auth flow (not Firebase) with credentials stored in localStorage.

## Files

| File | Role |
|------|------|
| `app/tools/events/page.tsx` | Events grid with filters (client component) |
| `app/tools/events/[eventId]/edit/page.tsx` | Event edit page — fetches `EventDetail`, renders tabs |
| `app/tools/events/[eventId]/edit/assignment-tab.tsx` | Assignment tab — assign/remove blocks, remove users |
| `app/tools/events/[eventId]/edit/blocks-tab.tsx` | Blocks tab — edit chair grid per block |
| `app/actions/events/list.ts` | `getEvents()` server action |
| `app/actions/events/detail.ts` | `getEventDetail()` server action |
| `app/actions/events/update.ts` | `updateEventUsers()` server action |
| `app/actions/events/user-blocks/update.ts` | `updateUserBlocks()` server action |
| `app/actions/events/user-blocks/delete.ts` | `removeUserBlock()` server action |
| `app/actions/events/blocks/update.ts` | `updateBlock()` server action |
| `app/actions/_shared.ts` | Shared `webFetch()` + `LegacyWebContext` type |
| `components/web-auth-guard.tsx` | Auth gate dialog for external API credentials |
| `components/ui/multi-select.tsx` | Shadcn-compatible react-select wrapper for multi-select dropdowns |
| `lib/parsers/events.ts` | Cheerio HTML parser → `EventInfo[]` (event list) |
| `lib/parsers/event-details.ts` | Cheerio parser for event edit page HTML → `EventDetail` |
| `lib/queries/events.ts` | Re-exports all event server actions + `eventKeys` query key factory + `EventInfo` type |
| `types/event.ts` | `EventDetail`, `EventArea`, `EventBlock`, `EventUser`, `EventAssignedUser` interfaces |

## Auth Flow (Web Auth)

1. User navigates to `/tools/events`
2. `WebAuthGuard` checks localStorage for stored credentials + cookie
3. If missing → shows modal dialog (email + password)
4. On submit → calls `webAuthLogin()` server action
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

- Route: `/tools/events/[eventId]/edit`
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
  assignedBlocks: number[];
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
- Builds `users[i].assignedBlocks` by inverting the block→users mapping
- Pre-filters `allUsers` to `ALLOWED_USER_IDS` (hardcoded set of 36 IDs)
- Extracts CSRF token from `<input name="_csrf">` or `window._token` script pattern
- `allUsers` field is pre-filtered; `users` field contains only assigned users

## UI Features

- **Filters**: Location, event name, date — all via Select dropdowns
- **Card layout**: Responsive grid (1→6 columns based on breakpoint)
- **Card content**: Event name, date badge, time, location, lock/unlock icon
- **Card footer**: "Seats" and "Edit" links using `NEXT_PUBLIC_SC_BASE_URL` + relative URL
- **States**: Loading (12 skeleton cards), error (retry button), empty, filtered-empty
- **Multi-select**: react-select wrapper with Shadcn styling for users and blocks dropdowns

## Environment Requirements

- `SC_BASE_URL` — Server-only, used in `app/actions/events/` for fetch requests
- `NEXT_PUBLIC_SC_BASE_URL` — Client-side, used for link generation in event cards

## Gotchas

- Web auth is completely separate from Firebase auth — different credentials
- Password stored as base64 in localStorage (not encrypted)
- `getEvents` scrapes 10 pages in parallel — if site structure changes, parser breaks
- Cheerio parser assumes specific HTML structure (`.card`, `b` tag header, `.container > div`)
- Event IDs extracted via regex from URLs, may be null
- Assignment feature requires SPV/PIC role in Firebase `members` collection
- CSRF token is extracted from event edit page HTML; `removeUserBlock` additionally fetches a fresh token from `/csrfToken`
- `allUsers` is pre-filtered to `ALLOWED_USER_IDS` in the parser (`lib/parsers/event-details.ts`), not in the client component
- `getEventDetail` returns `Promise<EventDetail>` (typed via `detail.ts`); `page.tsx` still casts `as EventDetail` because the re-export in `lib/queries/events.ts` goes through the action
- Mutations refresh via `refetch` callback (re-calls `getEventDetail`), not `window.location.reload`
