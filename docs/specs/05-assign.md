# Feature: Service Assignment Tool

## Overview

SVG-based tool for allocating volunteers to service blocks (A1–A4, B1–B3, S1–S2) across two events (Teen and Youth). Supports auto-assignment with weighted distribution and manual override mode.

## Files

| File | Role |
|------|------|
| `app/tools/utilities/assign/page.tsx` | Full assignment tool (client component) |

## Concepts

### Blocks

| Block | Type | Description |
|-------|------|-------------|
| A1–A4 | Area blocks | Main counter zones, require min 2 people each |
| B1–B3 | Backup blocks | Adjacent to A blocks |
| S1, S2 | Special blocks | TC In + Altarcall (S1), TC Out + Altarcall (S2) |
| MAIN_STAGE | Non-clickable | Visual reference point, all A blocks face it |

### Roles

- **All Block**: Top 2 members in the list — assigned to all A blocks for one event
- **SR (Peran Khusus)**: TC In, TC Out, FD — 3 special roles per event
- **Counter**: Remaining members assigned to individual blocks

### Events

Two simultaneous events: Teen and Youth. Members can be restricted to one via `(T)` or `(Y)` suffix.

## Member Management

- **Add single**: Text input + Enter/click
- **Bulk import**: Paste names (one per line), supports `•` and numbered prefixes
- **Availability suffix**: `(T)` = teen only, `(Y)` = youth only, none = both
- **Reorder**: Move up/down buttons on hover
- **Remove**: Delete button on hover

## Auto-Assignment Algorithm

1. **SR selection**: Random 3 from pool (avoiding overlap between events when possible)
2. **Zone balancing**: A blocks split into zones [A1,A2] and [A3,A4] — members distributed by weight
3. **Consecutive rule**: A block assignments must be consecutive (e.g., A1+A2, not A1+A3)
4. **BS assignment**: B/S blocks filled from adjacent A block members, with load balancing
5. **Previous-event awareness**: Second event uses first event's assignments to avoid same-person overlap

### Weights

```typescript
WEIGHTS[0] = { A1: 0.4, A2: 0.5, A3: 0.4, A4: 0.2, B1: 0.08, B2: 0.1, B3: 0.05, S1: 0.02, S2: 0.02 }
WEIGHTS[1] = { A1: 0.7, A2: 0.6, A3: 0.8, A4: 0.5, B1: 0.1,  B2: 0.3, B3: 0.1,  S1: 0.02, S2: 0.02 }
```

Youth event has higher A-block weights (more counter load).

## Manual Mode

- Select a counter member from the sidebar
- Click blocks on the SVG to toggle assignment
- Validation: consecutive A blocks, must have A before B/S, adjacent blocks only
- Error messages in Indonesian

## SVG Visualization

- **Geometry**: Rectangles and polygons for each block
- **Colors**: Each member gets a unique color from a 20-color palette
- **Status badges**: Min-2 indicator (green/yellow/red) on A blocks
- **Direction arrows**: Hollow arrows pointing toward main stage
- **Tooltip**: Hover any block to see assignees, weight, and min-2 status
- **Connecting lines**: Dashed lines from A blocks to main stage

## Output

Text format per event:

```
Teen
• name1 : ALL BLOCK
• name2 : TC In + Altarcall S1
• name3 : A1, B1
• name4 : A2, B2
```

Copy buttons: "SALIN TEEN", "SALIN YOUTH", "SALIN SEMUA" (combined).

## Layout

- **Sidebar** (264px): Member list, input, SR picker, controls
- **Main area**: SVG visualization
- **Footer** (215px, toggleable): Output text + copy buttons

## UI Components Used

Card (with CardHeader/CardAction/CardContent/CardFooter), Button, Input, Textarea, Popover — all from `@/components/ui`

## Gotchas

- No persistence — refreshing loses all data
- Min 5 members required (2 all-block + 3 SR)
- Each event needs min 5 eligible members (accounting for T/Y restrictions)
- SR roles try to avoid overlap between Teen and Youth but fall back to shared pool if needed
- Consecutive A-block rule enforced in both auto and manual modes
- Colors cycle through 20-color palette based on member index
- All UI text is in Indonesian
