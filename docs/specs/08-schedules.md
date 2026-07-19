# Schedules — Event Assignment Browser & Swap Requests

## Route

`/my/schedules`

## Purpose

Browse events grouped by date with full visibility into assigned members. Authorized users (Admin, Regional PIC, SPV) can request assignment swaps, which must be approved by the team SPV or Admin before taking effect.

## Access

All authenticated roles (Admin, Head Ministry, Regional PIC, SPV, Member) can view schedules. Swap requests require Admin, Regional PIC, or SPV. Approval requires Admin or SPV of the affected member's team.

## Page Layout

### Month/Year Selector

- Previous/next month navigation with month dropdown and year dropdown.
- Year options sourced from `getEventScheduleYears()`.

### Events Table

- Full-width table with rows = one event each.
- Columns: **No**, **Tanggal** (date), then dynamic **Tim Slot N** + **Anggota Slot N** pairs.
- Max slot columns determined by the event with the most teams.
- Empty slots shown as `-` when an event has fewer teams.
- Date cell shows formatted date (e.g. "Sat, 04 Jul 2026").
- Team slot shows team name badge (e.g. "Team 8").
- Anggota slot lists all members for that team vertically.

### Member Rows (within Anggota Slot)

Each member is shown with:
- Crown icon (if SPV role)
- Full name (bold/primary color if SPV)
- PIC badge (amber, if assigned "Event PIC" task)
- Swap icon button (visible on hover to Admin/Regional PIC/SPV)

### Swap Dialog

- Clicking the swap icon opens a dialog to select a replacement.
- Replacement candidates are same-team members not currently assigned to the event.
- Confirming creates a row in `event_assignment_change_requests` with status `"pending"`.

### Pending Approvals Section

Visible to Admin and SPV users when there are pending swap requests. Displays a table:

| Column | Content |
|--------|---------|
| Event | Event name |
| Date | Event date |
| From | Member being swapped out |
| To | Replacement member |
| Team | From member's team |
| Actions | Approve (check) / Reject (X) buttons |

## Server Actions (`actions/schedules.ts`)

### `getSchedules(month, year)`
- Returns `ScheduleEvent[]` — events with `members: ScheduleMember[]`.
- Members are unique per event, deduplicated by `userId`.
- `isSpv` determined by `roles.name === "SPV"`.
- `isPic` determined by `taskId` matching the "Event PIC" task.
- Filters out block-seat and rated assignments (`blockName IS NULL AND rating IS NULL`).

### `getAvailableReplacements(eventId, userFromId)`
- Returns all users not currently assigned to the event, excluding `userFromId`.

### `requestSwap(eventId, userFromId, userToId)`
- Auth: Admin, Regional PIC, SPV.
- If a pending request already exists for the same `(eventId, userFromId)`, updates `userToId`.
- Otherwise inserts a new row with status `"pending"`.

### `getPendingSwaps()`
- Auth: Admin, Regional PIC, SPV.
- Admin/Regional PIC see all pending requests.
- SPV sees only requests where `userFrom` belongs to their team.

### `approveSwap(requestId)`
- Auth: Admin, or SPV of the `userFrom`'s team.
- Transfers **all** `eventAssignments` rows from `userFromId` → `userToId` within a transaction.
- Updates request status to `"approved"`.

### `rejectSwap(requestId)`
- Auth: Admin, or SPV of the `userFrom`'s team.
- Updates request status to `"rejected"`.

## Data Flow

```
User clicks swap → getAvailableReplacements() → pick replacement
  → requestSwap() → INSERT into event_assignment_change_requests (status: pending)

SPV/Admin sees pending request → approveSwap()
  → UPDATE event_assignments SET user_id = userToId WHERE user_id = userFromId
  → UPDATE event_assignment_change_requests SET status = "approved"

Or → rejectSwap() → UPDATE event_assignment_change_requests SET status = "rejected"
```

## Schema

Uses `event_assignment_change_requests` table:
- `eventId` — FK to events
- `userFromId` — Member being swapped out
- `userToId` — Replacement member (nullable, set at request time)
- `status` — `"pending"` | `"approved"` | `"rejected"`
- `approvedBy` — FK to users (the approver/rejecter)
- `approvedAt` — Timestamp

## Related Files

- `actions/schedules.ts` — Server actions
- `app/my/schedules/page.tsx` — Client page
- `components/user-session-provider.tsx` — `hasPermission()` utility
- `lib/navigation.ts` — Sidebar "Schedules" link under Data Entry
