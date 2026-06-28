# Feature: Events Browser

## Overview

Experimental page that scrapes event data from an external API using Cheerio. Uses a separate web auth flow (not Firebase) with credentials stored in localStorage.

## Files

| File | Role |
|------|------|
| `app/tools/events/page.tsx` | Events grid with filters (client component) |
| `app/tools/events/[eventId]/edit/page.tsx` | Event edit page — assignment tab + blocks viewer |
| `app/actions.ts` | Server actions: `webAuthLogin()`, `fetchEvents()`, `fetchEventEditPage()`, `updateUserBlocks()` |
| `components/web-auth-guard.tsx` | Auth gate dialog for external API credentials |
| `components/ui/multi-select.tsx` | Shadcn-compatible react-select wrapper for multi-select dropdowns |
| `lib/parsers/events.ts` | Cheerio HTML parser → `Event[]` |
| `lib/parsers/event-details.ts` | Cheerio parser for event edit page HTML → `EventDetailsData` |
| `lib/queries/events.ts` | Re-exports + `eventKeys` query key factory |

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
- `fetchEvents(cookie)` server action scrapes pages 1–3 from `SC_BASE_URL/event?page={n}`
- Parses HTML with Cheerio, extracts `.card` elements
- Query runs only when `WebAuthGuard` is authenticated

## Event Edit Page

- Route: `/tools/events/[eventId]/edit`
- Calls `fetchEventEditPage(cookie, eventId)` which GETs `SC_BASE_URL/event/edit/{eventId}`
- Parses the edit form HTML via `parseEventPage()` into `EventDetailsData`
- Contains two tabs: **Assignment** and **Blocks**
- Auth-gated by `WebAuthGuard`

### Assignment Tab

Allows SPV/PIC users to assign blocks to users.

**UI Components:**
- Left multi-select dropdown: Users (filtered to allowed IDs only)
- Right multi-select dropdown: Blocks (all available blocks from event)
- Submit button: POSTs assignment to external API

**User Filter:**
Only 36 specific user IDs are shown in the users dropdown (hardcoded `ALLOWED_USER_IDS` set).

**Submit Flow:**
1. Gets web auth cookie and email from localStorage
2. Calls `updateUserBlocks()` server action
3. Server action checks user's role in Firebase Firestore (`members` collection)
4. Only users with role "SPV" or "PIC" can perform assignments
5. POSTs to `SC_BASE_URL/event/update_users_blocks/{eventId}` with `users[]`, `blocks[]`, `_csrf`
6. Checks response for redirect (success) or HTML with "Forbidden" message (failure)
7. On success, refreshes page data via `router.refresh()`

### Blocks Tab

- Select area → select block → displays chair grid visualization
- Grid shows occupied (green) and empty (muted) seats

## Server Actions

### `updateUserBlocks(cookie, eventId, csrf, userIds, blockIds, userEmail)`

Assigns users to blocks in the external events system.

**Parameters:**
- `cookie`: Web auth cookie from localStorage
- `eventId`: Event ID from URL
- `csrf`: CSRF token extracted from event edit page HTML
- `userIds`: Array of user IDs to assign
- `blockIds`: Array of block IDs to assign
- `userEmail`: Current user's email for role verification

**Role Guard:**
Queries Firebase Firestore `members` collection by email. Only allows users with role "SPV" or "PIC".

**Response Handling:**
- Redirect (Location header) → success
- HTML with "Forbidden" + "don't have permission" → returns forbidden error
- Non-ok status → returns generic error

## Event Interfaces

```typescript
interface EventDetailsData {
  allUsers: EventDetailsAllUser[];  // All users from #users li elements
  event: EventDetailsEvent;
  users: EventDetailsUser[];        // Users with block assignments
  areas: EventDetailsArea[];
  blocks: EventDetailsBlockItem[];
  csrf: string | null;              // CSRF token from edit page
}

interface EventDetailsAllUser {
  id: number;
  fullName: string;
  email: string | null;
}

interface EventDetailsUser {
  id: number;
  name: string;
  email: string | null;
  blocks: number[];                 // Assigned block IDs
}
```

## HTML Parsing

### Event List Parser (`lib/parsers/events.ts`)
Targets `.card` elements. Header format: `"24 JUN 2026 / AOG TEEN / 16:00"`.

### Event Details Parser (`lib/parsers/event-details.ts`)
- Extracts users from `#users li` elements
- Extracts areas from form groups with "Area" heading
- Extracts blocks from `var blocks = [...]` in script tags
- Extracts CSRF token from `<input name="_csrf">` or script patterns

## UI Features

- **Filters**: Location, event name, date — all via Select dropdowns
- **Card layout**: Responsive grid (1→6 columns based on breakpoint)
- **Card content**: Event name, date badge, time, location, lock/unlock icon
- **Card footer**: "Seats" and "Edit" links using `NEXT_PUBLIC_SC_BASE_URL` + relative URL
- **States**: Loading (12 skeleton cards), error (retry button), empty, filtered-empty
- **Multi-select**: react-select wrapper with Shadcn styling for users and blocks dropdowns

## Environment Requirements

- `SC_BASE_URL` — Server-only, used in `app/actions.ts` for fetch requests
- `NEXT_PUBLIC_SC_BASE_URL` — Client-side, used for link generation in event cards

## Gotchas

- Web auth is completely separate from Firebase auth — different credentials
- Password stored as base64 in localStorage (not encrypted)
- `fetchEvents` scrapes 3 pages in parallel — if site structure changes, parser breaks
- Cheerio parser assumes specific HTML structure (`.card`, `b` tag header, `.container > div`)
- Event IDs extracted via regex from URLs, may be null
- The "Experimental" label is shown in the page subtitle
- Assignment feature requires SPV/PIC role in Firebase `members` collection
- CSRF token must be extracted from event edit page HTML before calling `updateUserBlocks`
