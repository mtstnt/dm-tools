# Feature: Reports History

## Overview

Read-only browser for service reports stored in Firestore. Displays reports in a table with a slide-out detail sheet.

## Files

| File | Role |
|------|------|
| `app/tools/reports-history/page.tsx` | Table + detail sheet (304 lines, client component) |
| `lib/queries/reports.ts` | Firestore fetch function + query key factory + Report interface |

## Data Fetching

- Uses TanStack React Query with `reportKeys.all` query key
- `fetchReports()` queries Firestore `reports` collection, ordered by `date` desc
- Client-side re-sort using `parseDate()` for Indonesian date strings
- Query config: `staleTime: 5m`, `gcTime: 30m`, `refetchOnWindowFocus: false`, `retry: 1`

## Report Interface

```typescript
interface Report {
  id: string;
  altarcallNumber?: string;
  altarcallText?: string;
  baptisan?: string;
  bersediaJoinCg?: string;
  date?: string;
  divisions?: Record<string, number>;
  eventName?: string;
  guest?: string;
  jemaat?: string;
  lastUpdated?: string;
  oneMinutePrayer?: string;
  pastorSpeaker?: string;
  prayerStation?: string;
  reportText?: string;
  tc?: string;
  title?: string;
  totalVolunteer?: number;
  type?: string;
  whl?: string;
}
```

## Table Columns

| Column | Visibility |
|--------|-----------|
| Title | Always |
| Type | Hidden on mobile (sm+) |
| Date | Always |
| Volunteers | Always (right-aligned) |
| Jemaat | Hidden on mobile (sm+) |
| TC | Hidden on small screens (md+) |

## Type Labels

```
AOG_YOUTH → "AOG Youth"
AOG_TEEN → "AOG Teen"
EVENT → "Event"
```

## Detail Sheet

Slide-out Sheet (right side, full width on mobile, max-w-md on desktop) showing:
- All report fields in a 2-column grid
- Divisions section (18 division keys)
- Report Text section (pre-formatted)

## Division Keys

Baptisan, Companion, Crowd, DM, GA, Greeter, Hospi, Lighting, MM, MUA, PAW, Photography, Prayer, SM, Sound, Stylish, Usher, WHL

## States

1. **Loading** — 8 skeleton rows
2. **Error** — AlertCircle icon + error message + Retry button
3. **Empty** — "No reports found" message
4. **Data** — Table rows, clickable to open detail sheet

## UI Components Used

Card, Badge, Skeleton, Button, Table, Sheet, Separator — all from `@/components/ui`

## Gotchas

- `parseDate()` handles Indonesian month names — same list as reports page
- Division keys in the detail view use a fixed order array, not from the data
- `InfoItem` component returns null if value is falsy — hides empty fields
- The sheet uses `onOpenChange` to clear selected report when closed
- Refresh indicator shows `RefreshCw` icon when `isFetching && !isLoading`
