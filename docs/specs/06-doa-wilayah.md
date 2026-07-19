# Feature: Doa Wilayah

## Overview

Monthly prayer schedule page. Each month gets exactly one Doa Wilayah entry with PIC, TC 1, TC 2, date, notes, and an optional linked TC tally session. Data is stored in Firestore under `doaWilayah/{year}/bulan/{month}`.

## Files

| File | Role |
|------|------|
| `app/tools/doa-wilayah/page.tsx` | Main page — year selector, month list, summary cards, tally dialog |
| `lib/queries/doa-wilayah.ts` | Firestore read/write/subscribe helpers, `buildDoaWilayahSessionId()` |
| `lib/queries/members.ts` | Firestore `members` fetch for person picker |
| `lib/queries/tally-session.ts` | Creates and reads linked TC tally sessions |
| `lib/fuzzy-search.ts` | Fuzzy name/nickname ranking for the person picker |

## Data Model

Firestore path: `doaWilayah/{year}/bulan/{month}` where `month` is `"1"`..`"12"`.

```typescript
interface DoaWilayahMonth {
  pic?: { id: string; name: string } | null;
  tc1?: { id: string; name: string } | null;
  tc2?: { id: string; name: string } | null;
  notes?: string;
  date?: string;            // "YYYY-MM-DD"
  tallySessionId?: string;  // linked TC session, set once
}
```

The year document itself (`doaWilayah/{year}`) is kept "real" with `{ year, updatedAt }` so it appears when listing the top-level collection.

## Page Structure

- **Header**: Title + year selector (current year ± 1)
- **Quick stats**: Total members, filled months, unfilled months
- **Service summary**: Frequency count per person across PIC/TC1/TC2 for the selected year
- **TC monthly summary**: Live In/Out/Total from linked tally sessions
- **Month list**: 12 collapsible rows, one per month

## Month Row

Two modes:

1. **View mode** — shows saved PIC, TC1, TC2, notes, and date. "Ubah" enters edit mode.
2. **Edit mode** — form with searchable PIC/TC1/TC2 pickers, notes textarea, date input, and "Buka TC" button.

### Person Picker

- Fuzzy-searchable dropdown over the Firestore `members` collection
- Already-selected people in the same month are filtered out
- Duplicate detection blocks save with an error message

### Date & TC Tally

- Date field and "Buka TC" button lock once `tallySessionId` is set
- TC session ID is deterministic: `doa-wilayah__{date}` (built by `buildDoaWilayahSessionId()` in `lib/queries/doa-wilayah.ts`)
- Opening TC calls `ensureDoaWilayahTallySession()` and writes `tallySessionId` back to the month document
- Live In/Out badge appears when a TC session is linked

## Permissions

Currently open (`canWrite = true`) — no role/permission checks. The code keeps a `canWrite` state variable so access control can be reintroduced later.

## UI Components Used

Select, Input, Textarea, Button, Badge, Dialog — all from `@/components/ui`

## Gotchas

- One document per month; saving always merges into that same document
- A person cannot hold two roles (PIC/TC1/TC2) in the same month
- `date` must be saved before "Buka TC" becomes available
- Once a TC session is opened, the date and "Buka TC" button are permanently locked for that month
- Members list is loaded from Firestore; failure shows a warning but the rest of the page still works
