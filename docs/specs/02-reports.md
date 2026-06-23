# Feature: Service Reports Generator

## Overview

Client-side form that generates formatted text reports for church services. Supports three service types (AOG Teen South, AOG Youth South, Event) with per-type data isolation. Reports can be copied to clipboard.

## Files

| File | Role |
|------|------|
| `app/tools/reports/page.tsx` | Main form component (557 lines, client component) |

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
- **Ministries mode** (default) — 20 individual ministry inputs, auto-summed
- **Total mode** — Single number input

Ministry list: DM, Crowd, Usher, PAW, Prayer, MM, SM, MUA, First Aid, Sound, Photography, Lighting, Greeter, Sosmed, Baptisan, Companion, Stylist, Hospitality, GA, WHL

### Congregation
- **Jemaat** — Congregation count
- **TC** — TC count

### Altar Calls
- Dynamic list of text + count entries
- Add/remove entries
- At least one entry always present (can be empty)

## Output Format

```
*{Title} {Date}*
1. Pastor and Speaker:
2. Guest:
3. Volunteer: {count}
4. Jemaat: {count} ; TC: {count} (Altarcall {text}: {count}; ...)
5. Baptisan:
6. WHL:   (Bersedia Join CG: )
7. Prayer Station:
8. One Minute Prayer:
```

Title is derived from service type label or event name.

## Layout

- **Desktop**: 3-column grid — form (left 3/5), sticky preview (right 2/5)
- **Mobile**: Full-width form, fixed bottom preview bar (expandable to 70vh)

## UI Components Used

Input, Textarea, Select, Button, Calendar, Popover, Switch — all from `@/components/ui`

## Date Handling

Indonesian month names hardcoded in `formatDateDisplay()`:
Januari, Februari, Maret, April, Mei, Juni, Juli, Agustus, September, Oktober, November, Desember

## Gotchas

- Volunteer sum uses `parseInt` with NaN fallback — empty fields count as 0
- Altar call formatting: `text: count` joined by "; "
- Mobile preview has a spacer div (`h-[20vh]`) to prevent content being hidden behind the fixed bar
- The "Copy" button uses `navigator.clipboard.writeText()`
- No persistence — this page only generates text, does not save to Firestore
