# Feature: Tally Counter

## Overview

Full-screen tap counter for collecting altar-call counts or TC In/Out counts during a service. Syncs to Firestore `tallySession` so multiple devices can read the same running totals in real time. Sessions are created from the Reports page or from Doa Wilayah "Buka TC".

## Files

| File | Role |
|------|------|
| `app/tools/utilities/tally/page.tsx` | Full-screen counter UI (client component) |
| `lib/queries/tally-session.ts` | Firestore read/write/subscribe helpers |

## Data Model

Firestore path: `tallySession/{sessionId}`

```typescript
interface TallySessionDoc {
  serviceType?: string;
  date?: string;
  altarCallCount?: number;
  kind?: "altarcall" | "tc";
  counts?: Record<string, number>;
}
```

- `kind: "altarcall"` — labels are `Altar Call 1`, `Altar Call 2`, ...
- `kind: "tc"` — labels are `TC In` and `TC Out`; OUT values are stored as negative numbers

## Page Layout

- **Top 35%**: altar-call dropdown, session picker, large current count, combo badge, local-only log
- **Bottom 65%**: giant green "+" tap area
- **Floating minus button**: bottom-left red "−" for decrementing

## Interactions

- **Tap +**: increments the selected label; starts a combo timer (750 ms)
- **Tap −**: decrements if count > 0; also supports combo
- **Combos**: consecutive taps within 750 ms batch into a single Firestore write when the timer expires; combo badge appears at ≥ 2 taps
- **Dropdown**: switch between altar calls / TC In / TC Out
- **Session picker**: choose from existing tally sessions; auto-picks the most recently updated

## Sync Behavior

- Real-time Firestore subscription for the selected session
- Local writes use `increment(delta)` so concurrent counters don't overwrite each other
- A 2500 ms grace period prevents incoming snapshots from visually reverting a just-committed combo
- Logs are **local only** — never written to Firestore

## Vibration

- Plus: single strong buzz `[0, 80]`
- Minus: double short buzz `[0, 30, 50, 30]`
- Only works on Android Chrome; iOS Safari ignores `navigator.vibrate`

## UI Components Used

Almost entirely custom markup. Uses `ChevronDown` and `RefreshCw` icons from `lucide-react`.

## Gotchas

- The page wraps `useSearchParams()` in `<Suspense>` so it can be used with `session?={id}` links
- If no session is selected and sessions exist, tapping + opens the session picker
- TC Out values are stored negative but displayed as positive (`Math.max(0, -rawCount)`)
- Logs are optimistic + confirmed, newest first, capped at 200 entries
- Manual refresh re-lists sessions and re-fetches the selected session document
