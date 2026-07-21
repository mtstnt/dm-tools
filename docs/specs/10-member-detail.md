# Member Detail View

## Route

`/my/users/members/[id]`

## Purpose

Display a single member's profile data, event schedule history, and reviews overview in a responsive multi-card layout.

## Access

| Role | Can View |
|------|----------|
| Admin | Yes |
| Head Ministry | Yes |
| Regional PIC | Yes |
| SPV | Yes |
| Member | No |

## Page Layout

### Header

- User's full name (heading)
- SC Web connection badge (shows source ID or "Not yet connected with SC Web")
- "Back to members" button linking to `/my/users/members`

### Card Grid

Responsive 3-card grid: `grid-cols-1 md:grid-cols-2 xl:grid-cols-3`.

#### Card 1 — Data

Read-only display of database fields (excludes `password`, `cgCode`, `sourceId`). Each field rendered vertically as a `DetailField` (label + readonly `Input`).

Fields shown:

| Label | Source |
|-------|--------|
| Full name | `users.fullName` |
| NIJ | `users.nij` |
| Email | `users.email` |
| Team | `users.teamId` → resolved to "Team {number}" |
| Role | `users.roleId` → resolved role name |
| Created at | `users.createdAt` (formatted with `id-ID` locale, medium date + short time) |
| Updated at | `users.updatedAt` |
| Created by | Resolved user full name from `createdBy` numeric ID |
| Updated by | Resolved user full name from `updatedBy` numeric ID |

#### Card 2 — Schedules

Two sections in shortened view:

- **Past** — last 3 schedules where `events.date < now`, ordered date DESC
- **Upcoming** — next 5 schedules where `events.date >= now`, ordered date ASC

Each row shows: `Event Name / formatted date & time`.

The card body shows a loading spinner while fetching. Empty state: "No schedules found.".

**View More button**: Opens a `Dialog` containing a `Table` with all schedules (past + upcoming) ordered by `events.date` DESC, limited to 20 rows.

Dialog table columns:

| Column | Content |
|--------|---------|
| No | Row index (1-based) |
| Event Name | `events.name` |
| Date & Time | `events.date` (formatted `id-ID`, medium date + short time) |

#### Card 3 — Reviews

Placeholder card with "Coming soon..." message.

## Server Actions

### `getUserSchedules(userId)` (`actions/users/members.ts`)

Returns three slices in parallel:

| Slice | Query | Order | Limit |
|-------|-------|-------|-------|
| `past` | `eventAssignments` joined with `events`, where `userId` matches and `events.date < now` | `events.date` DESC | 3 |
| `upcoming` | `eventAssignments` joined with `events`, where `userId` matches and `events.date >= now` | `events.date` ASC | 5 |
| `all` | `eventAssignments` joined with `events`, where `userId` matches | `events.date` DESC | 20 |

Auth: Same as `getUserDetail` (Admin, Head Ministry, Regional PIC, SPV).

Return type: `UserSchedulesResult` with `ScheduleItem[]` (each: `eventId`, `eventName`, `eventDate`).

## Data Flow

```
Page mount → getUserDetail(userId) → render Data card
          → getUserSchedules(userId) → render Schedules card (shortened view)
          → "View More" click → render Dialog with Table (all slice)
```

## Related Files

- `app/my/users/members/[id]/page.tsx` — Client page
- `actions/users/members.ts` — `getUserDetail()`, `getUserSchedules()`
- `components/ui/dialog.tsx` — Dialog (Base UI primitives)
- `components/ui/table.tsx` — Table component
