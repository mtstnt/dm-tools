# Schedules — Event Assignment Browser & Change Requests

## Route

`/my/schedules`

## Purpose

Browse events grouped by date with full visibility into assigned members. Authorized users can request three types of assignment changes — switch, cancellation, and helper — which must be approved before taking effect.

## Access

All authenticated roles (Admin, Head Ministry, Regional PIC, SPV, Member) can view schedules. Creating change requests requires Admin, Regional PIC, or SPV. Approval rules vary by request type (see Approval Matrix below).

## Change Request Types

The request type is inferred from which of `userFromId` / `userToId` are non-null. No explicit `requestType` column is stored.

| Inferred type | userFromId | userToId | Purpose |
|---|---|---|---|
| switch | X (non-null) | Y (non-null) | Transfer assignment from X to Y |
| cancellation | X (non-null) | null | Remove X from the event |
| helper | null | X (non-null) | Add X to the event |

### Approval Effects

| Type | On approve |
|---|---|
| switch | UPDATE all `event_assignments` rows: SET `user_id` = Y WHERE `user_id` = X AND `event_id` = E |
| cancellation | DELETE FROM `event_assignments` WHERE `user_id` = X AND `event_id` = E |
| helper | INSERT INTO `event_assignments` (`event_id`, `user_id`, `task_id`, `block_name`) VALUES (E, X, NULL, NULL) |

### SPV Switch Constraint

For switch type: if `userFrom` is an SPV, then `userTo` must also be an SPV. `getAvailableReplacements` must filter candidates accordingly.

## Permission Matrix

| Role | View | Create Request | Approve Request |
|---|---|---|---|
| Admin | All | All | All |
| Regional PIC | All | All | All |
| SPV | Team-scoped (see below) | Switch/Cancel: SPV of `user_from`'s team. Helper: SPV of `user_to`'s team | Switch: SPV of `user_to`'s team. Cancel: SPV of `user_from`'s team. Helper: **not allowed** |
| Head Ministry | All | No | No |
| Member | All (read-only) | No | No |

### SPV Visibility Scoping

SPV users see change requests where `user_from` OR `user_to` belongs to their team (expanded from the previous "user_from only" scope). However, they may only approve requests matching the approval rules above.

## Page Layout

### Month/Year Selector

- Previous/next month navigation with month dropdown and year dropdown.
- Year options sourced from `getEventScheduleYears()`.

### Tab Bar

- **Assignments** tab — the events table (described below).
- **Change Requests** tab — all change requests for events in the selected month, with type badges, status badges, and approve/reject actions for pending requests.

### Events Table (Assignments Tab)

- Full-width table with columns: **No**, **Tanggal**, **Event**, **Members**, **(+)**.
- Each row = one event.
- **(+)** button in the rightmost column of each row opens the **helper dialog** to add a new member to the event.
- Members column is a flex-wrap grid of clickable cards.
- Members sorted by team number, then SPV first, then alphabetical.
- Each member card shows:
  - Full name (with crown icon if SPV, bold/primary color)
  - Team badge (e.g. "Team 8")
  - PIC badge (amber, if "Event PIC" task)
  - Pending change badge (if any pending change request exists; card is opaque and not clickable):
    - "SWITCH PENDING" for switch
    - "CANCEL PENDING" for cancellation
    - "HELPER PENDING" for helper
  - Swap icon (visible when hovering eligible cards, Admin/Regional PIC/SPV only)
- Clicking a card opens the swap dialog.

### Change Requests Table (Change Requests Tab)

- All change requests for the selected month, regardless of status.
- Columns: Event, Date, Type, From, From Team, To, To Team, Status, Actions.
- Type is derived from null/non-null pattern on `userFromId` / `userToId` and rendered as a badge.
- For cancellation: From shows the user, To shows "-".
- For helper: From shows "-", To shows the user.
- Status rendered as color-coded badge:
  - Pending: amber
  - Approved: green
  - Rejected: red/destructive
- Approve/Reject buttons visible for pending requests only if the current user is authorized (per the approval matrix).
- Requests loading automatically when the tab is selected.

### Swap Dialog

- Clicking a member card opens the swap dialog.
- Replacement dropdown includes a **"None / Tidak ada"** option at the top.
- Selecting a user creates a **switch** request (`userFromId` = member, `userToId` = selected).
- Selecting "None" creates a **cancellation** request (`userFromId` = member, `userToId` = null).
- Replacement candidates are users not currently assigned to the event (excluding `userFromId`), with SPV constraint applied when `userFrom` is an SPV.
- Confirming inserts/updates a row in `event_assignment_change_requests` with status `"pending"`.

### Helper Dialog

- Clicking the **(+)** button in a row opens the helper dialog.
- Simple user picker — select exactly one user to add (no "None" option).
- Candidates are all users NOT currently assigned to the event (including block-assigned and rated users — helper inserts a fresh assignment row).
- Confirming creates a **helper** request (`userFromId` = null, `userToId` = selected).

## Server Actions (`actions/schedules.ts`)

### `getSchedules(month, year)`
- Returns `ScheduleEvent[]` — events with `members: ScheduleMember[]`.
- Members are unique per event, deduplicated by `userId`.
- Shows **all** `event_assignments` rows (including block-seat and rated assignments).
- `isSpv` determined by `roles.name === "SPV"`.
- `isPic` determined by `taskId` matching the "Event PIC" task.
- `pendingRequestType` is `"switch"` / `"cancellation"` / `"helper"` / `null` — derived from the null pattern on the pending change request row.

### `getAvailableReplacements(eventId, userFromId)`
- Returns all users not currently assigned to the event, excluding `userFromId`.
- SPV constraint: if the `userFrom` is an SPV, only return users with role SPV.
- Used for the swap dialog (switch and cancellation types).

### `getAvailableHelpers(eventId)`
- Returns all users NOT in `event_assignments` for the given event (including block-assigned and rated users, since the helper inserts a new assignment row).
- Used for the helper dialog.

### `requestChange(eventId, userFromId, userToId)`
- Auth: Admin, Regional PIC, SPV (per-type SPV rules in permission matrix).
- Type is inferred from which parameters are null — no explicit `requestType` argument.
- Validates caller is SPV of `user_from`'s team (switch/cancellation) or SPV of `user_to`'s team (helper).
- Validates `user_from` is actually assigned to the event (switch/cancellation).
- Validates `user_to` is NOT already assigned to the event (switch/helper).
- Validates SPV constraint for switch type.
- De-duplicates: if a pending request already exists for the same `(eventId, userFromId, userToId)`, updates to `status = "pending"`. If `userFromId` is null (helper), de-duplicates by `(eventId, userToId)`. If `userToId` is null (cancellation), de-duplicates by `(eventId, userFromId)`.
- Inserts a new row with status `"pending"` otherwise.

### `getPendingChanges()`
- Auth: Admin, Regional PIC, SPV.
- Admin/Regional PIC see all pending requests.
- SPV sees requests where `userFrom` or `userTo` belongs to their team.

### `getChangeRequests(month, year)`
- Auth: Admin, Regional PIC, SPV.
- Returns all change requests for events in the given month, across all statuses.
- Admin/Regional PIC see all; SPV sees requests where `userFrom` or `userTo` belongs to their team.
- Each item includes a derived `type` field ("switch" / "cancellation" / "helper") based on null pattern.

### `approveChange(requestId)`
- Auth: Admin, Regional PIC, or SPV per the approval matrix.
- Approver read from stored `userFromId` / `userToId` null pattern to apply correct permission check.
- Switch: transfers all `eventAssignments` rows from `userFromId` → `userToId` within a transaction.
- Cancellation: deletes all `eventAssignments` rows for `userFromId` in the event.
- Helper: inserts one `eventAssignments` row with `taskId = null` and `blockName = null`.
- Updates request status to `"approved"`.

### `rejectChange(requestId)`
- Auth: Admin, Regional PIC, or SPV per the approval matrix.
- Updates request status to `"rejected"`.

## Data Flow Per Type

```
Switch:
  User clicks card → getAvailableReplacements() → pick replacement
    → requestChange(eventId, from, to) → INSERT (status: pending)
  Approver → approveChange()
    → UPDATE event_assignments SET user_id = to WHERE user_id = from AND event_id = E
    → UPDATE change_request SET status = "approved"

Cancellation:
  User clicks card → getAvailableReplacements() → pick "None"
    → requestChange(eventId, from, null) → INSERT (status: pending)
  Approver → approveChange()
    → DELETE FROM event_assignments WHERE user_id = from AND event_id = E
    → UPDATE change_request SET status = "approved"

Helper:
  User clicks (+) → getAvailableHelpers() → pick user
    → requestChange(eventId, null, to) → INSERT (status: pending)
  Approver → approveChange()
    → INSERT INTO event_assignments (event_id, user_id, task_id, block_name) VALUES (E, to, NULL, NULL)
    → UPDATE change_request SET status = "approved"

Reject (all types):
  rejectChange() → UPDATE change_request SET status = "rejected"
```

## Schema

Uses `event_assignment_change_requests` table with one change: `userFromId` made nullable.

| Column | Type | Description |
|---|---|---|
| `id` | integer PK | Auto-increment |
| `eventId` | integer FK | References events |
| `userFromId` | integer FK **(nullable)** | Member being swapped out / cancelled. Null = helper type |
| `userToId` | integer FK (nullable) | Replacement / new member. Null = cancellation type |
| `status` | text | `"pending"` \| `"approved"` \| `"rejected"` |
| `approvedBy` | integer FK | The approver/rejecter |
| `approvedAt` | timestamp | |
| `createdAt` | timestamp | |
| `updatedAt` | timestamp | |
| `createdBy` | text | |
| `updatedBy` | text | |

### Type Inference

| userFromId | userToId | Type |
|---|---|---|
| non-null | non-null | switch |
| non-null | null | cancellation |
| null | non-null | helper |

Both null is an invalid state and must be rejected by `requestChange`.

### Uniqueness

The existing unique index on `(eventId, userFromId, userToId)` is retained but cannot enforce uniqueness when `userFromId` or `userToId` is null (SQLite treats NULL as distinct). Duplicate prevention for helper and cancellation types is handled in `requestChange()` via application-level checks.

## Types

```typescript
type ScheduleMember = {
  assignmentId: number;
  userId: number;
  fullName: string;
  nij: string;
  teamId: number | null;
  teamNumber: number | null;
  isSpv: boolean;
  isPic: boolean;
  taskName: string | null;
  taskId: number | null;
  blockName: string | null;
  pendingRequestType: "switch" | "cancellation" | "helper" | null;
};

type ChangeRequestItem = {
  id: number;
  eventId: number;
  eventName: string;
  eventDate: Date;
  type: "switch" | "cancellation" | "helper";
  userFromId: number | null;
  userFromName: string | null;
  userToId: number | null;
  userToName: string | null;
  status: ApprovalStatus;
  createdAt: Date;
  fromTeamId: number | null;
  fromTeamNumber: number | null;
  toTeamId: number | null;
  toTeamNumber: number | null;
};
```

## Related Files

- `actions/schedules.ts` — Server actions (renamed: `requestChange`, `getChangeRequests`, `getPendingChanges`, `approveChange`, `rejectChange`, new: `getAvailableHelpers`)
- `app/my/schedules/page.tsx` — Client page (tab rename, helper dialog, "None" option, (+) button)
- `db/schema.ts` — Schema change: `userFromId` made nullable
- `components/user-session-provider.tsx` — `hasPermission()` utility
- `lib/navigation.ts` — Sidebar "Schedules" link under Data Entry
