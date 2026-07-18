# Feature: Service Reports Generator

## Overview

Client-side form that generates formatted text reports for church services. Supports three service types (AOG Teen South, AOG Youth South, Event) with per-type data isolation. Reports can be copied to clipboard. Also syncs session metadata to the Tally Counter Firestore collection so altar-call counts can be collected live.

## Files

| File | Role |
|------|------|
| `app/tools/utilities/reports/page.tsx` | Main form component (client component) |
| `lib/queries/tally-session.ts` | `syncTallySessionMeta()`, `fetchTallySession()`, session ID builder |
| `lib/queries/reports.ts` | `fetchReports()`, `reportKeys` query key factory, `Report` interface |
| `components/ministries-dialog.tsx` | Editable ministry list dialog |

## Service Types

| Key | Label | Special Behavior |
|-----|-------|-----------------|
| `teen` | AOG Teen South | Standard fields |
| `youth` | AOG Youth South | Standard fields |
| `event` | Event | Shows additional "Event Name" input |

Each service type maintains独立的 form data via `dataMap` state — switching types preserves entered data.

## Form Fields

### Basic Info
- **Service Type** — Select dropdown
- **Date** — Calendar picker (defaults to today), displays as Indonesian date ("DD Month YYYY")
- **Event Name** — Only shown when type is "event"

### Volunteer Section
Toggle between two modes via Switch:
- **Ministries mode** (default) — 23 individual ministry inputs, auto-summed
- **Total mode** — Single number input

Default ministry list: DM, Crowd, Usher, PAW, Prayer, MM, SM, MUA, First Aid, Photography, Lighting, Greeter, Sosmed, Baptisan, Companion, Stylist, Hospitality, GA, Drama, Konseptor, WHL, Sound, Choir

The list is editable via the ministries dialog (gear icon).

### Congregation
- **Jemaat** — Congregation count
- **TC** — TC count

### Altar Calls
- Dynamic list of text + count entries
- Add/remove entries
- At least one entry always present (can be empty)
- "Kirim ke Tally" button syncs `serviceType`, `date`, and `altarCallCount` to Firestore `tallySession`

## Output Format

The report output is generated from an **editable template** using `%...%` placeholders:

```
*{Title} {Date}*
1. Pastor and Speaker:
2. Guest:
3. Volunteer: %Volunteer%
4. %Seat Counter% ; %Tally Counter% %Altar Call%
5. Baptisan:
6. %WHL%   (Bersedia Join CG: %Bersedia Join CG%)
7. %Prayer Station%:
8. %One Minute Prayer%: 
```

### Placeholder Reference

| Placeholder | Resolves to |
|-------------|-------------|
| `%Volunteer%` | Effective volunteer count (sum of ministries or total) |
| `%Altar Call%` | Full altar call string: `(Altarcall desc1: count1; desc2: count2)` or empty if no entries |
| `%Metric Name%` | Value of the matching metric from the metrics input fields |
| Any other `%...%` | Resolves to empty string, shown as unresolved in a warning box |

### Template Editor (Event Detail Reporting tab only)

The Event Detail page's Reporting tab includes a **template editor** in the preview panel:
- Toggled via a pencil button next to the Copy button
- Default template is generated on mount from selected metric names
- Any `%...%` patterns not matching known placeholders or selected metrics appear in an amber warning box below the editor
- The header (`*Event Name Date*`) is uneditable and always comes from the event details

## Persistence (Event Detail Reporting Tab)

The Reporting tab on the Event Detail page (`/my/events/[id]`) saves data to the local SQLite database.

### Files

| File | Role |
|------|------|
| `app/my/events/[id]/_components/reporting-tab.tsx` | Reporting tab form (metrics, volunteers, altar calls, template editor) |
| `actions/events/reporting.ts` | `getEventReportingData()`, `saveEventReportingData()` server actions |
| `app/my/events/[id]/page.tsx` | Parent page — fetches reporting data, passes as `initialReportingData` |
| `components/metrics-dialog.tsx` | Metric selection dialog (checkboxes from master data) |

### Database Tables

| Table | Fields |
|-------|--------|
| `event_metrics` | `eventId`, `metricId`, `count` |
| `event_volunteers` | `eventId`, `ministryId`, `count` |
| `event_altar_calls` | `eventId`, `description`, `count`, `sequence` |

### Save Behavior

- **Save button** calls `saveEventReportingData(eventId, { metrics, volunteers, altarCalls })`
- Deletes all existing records for the event, then inserts new ones (upsert pattern)
- Only per-ministry volunteer counts are saved (ministries mode). Total mode volunteers are skipped since the schema requires a valid `ministryId` FK.
- Metrics are resolved from master data: metric name → metric ID lookup against `availableMetrics`
- Altar calls are saved with a sequence index

### Load Behavior

- On mount, `page.tsx` calls `getEventReportingData(eventId)` in parallel with other data fetches
- Result is passed as `initialReportingData` prop to `ReportingTab`
- The tab populates `metricNames`, `metricValues`, `formData.volunteers.byMinistry`, and `formData.altarCalls` from saved data
- Template is regenerated from saved metric names on load

### Event Status Transitions

| Condition | Status |
|-----------|--------|
| Event date is in the future | `pending` (unchanged) |
| Event date has passed, no reports saved | `incomplete` (set on `getEventReportingData` load-time check) |
| At least one report saved | `completed` (set when `saveEventReportingData` saves any records) |

Status updates happen server-side in the respective server actions.

### Bulk Volunteer Input

Bulk input is not yet supported. A note is shown below the checkbox.

- **Desktop**: 3-column grid — form (left 3/5), sticky preview (right 2/5)
- **Mobile**: Full-width form, fixed bottom preview bar (expandable to 70vh)

## Tally Integration

- Session ID: `slug(serviceType)__slug(date)`
- Sync writes `{ serviceType, date, altarCallCount, kind: "altarcall", updatedAt }` to Firestore `tallySession/{sessionId}`
- On mount, the page reads an existing tally session and adjusts the altar-call list length to match
- Tally Counter at `/tools/utilities/tally` reads/writes the same session

## UI Components Used

Input, Textarea, Select, Button, Calendar, Popover, Switch, Dialog — all from `@/components/ui`

## Date Handling

Indonesian month names hardcoded in `formatDateDisplay()`:
Januari, Februari, Maret, April, Mei, Juni, Juli, Agustus, September, Oktober, November, Desember

## Gotchas

- Volunteer sum uses `parseInt` with NaN fallback — empty fields count as 0
- Altar call formatting: `text: count` joined by "; "
- Mobile preview has a spacer div to prevent content being hidden behind the fixed bar
- The "Copy" button uses `navigator.clipboard.writeText()`
- The standalone Reports Generator (`/tools/utilities/reports`) does **not** persist data — it only generates clipboard text and creates tally sessions
- The Event Detail Reporting tab (`/my/events/[id]`) persists data to SQLite tables (`event_metrics`, `event_volunteers`, `event_altar_calls`)
- Ministries list is stored in local component state; it is not persisted across reloads
- Total-mode volunteer count is NOT persisted — only per-ministry counts are saved
