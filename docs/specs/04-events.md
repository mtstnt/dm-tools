# Feature: Events Browser

## Overview

Experimental page that scrapes event data from an external API using Cheerio. Uses a separate web auth flow (not Firebase) with credentials stored in localStorage.

## Files

| File | Role |
|------|------|
| `app/tools/events/page.tsx` | Events grid with filters (client component) |
| `app/actions.ts` | Server actions: `webAuthLogin()`, `fetchEvents()` |
| `components/web-auth-guard.tsx` | Auth gate dialog for external API credentials |
| `lib/parsers/events.ts` | Cheerio HTML parser → `Event[]` |
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

## Event Interface

```typescript
type Event = {
  id: string | null;          // Extracted from edit or seat count URL
  date: string | null;        // "24 JUN 2026"
  time: string | null;        // "16:00"
  eventName: string | null;   // "AOG TEEN"
  location: string | null;    // Venue name
  seatCountUrl: string | null; // Relative URL for seat management
  editUrl: string | null;      // Relative URL for event editing
  locked: boolean;             // Has lock icon
};
```

## HTML Parsing

Parser targets `.card` elements. Header format: `"24 JUN 2026 / AOG TEEN / 16:00"`.
- Date is first segment
- Time is last segment if matches `HH:MM` pattern
- Event name is middle segments joined by " / "
- Lock detection: presence of `i.fa-lock` element

## UI Features

- **Filters**: Location, event name, date — all via Select dropdowns
- **Card layout**: Responsive grid (1→6 columns based on breakpoint)
- **Card content**: Event name, date badge, time, location, lock/unlock icon
- **Card footer**: "Seats" and "Edit" links using `NEXT_PUBLIC_SC_BASE_URL` + relative URL
- **States**: Loading (12 skeleton cards), error (retry button), empty, filtered-empty

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
