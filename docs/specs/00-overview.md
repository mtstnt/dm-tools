# DM Tools — Feature Overview

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.9 (App Router) |
| React | 19.2.4 |
| Language | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 + tw-animate-css |
| UI Kit | Shadcn UI (base-nova style, 17 components) |
| State/Data | TanStack React Query 5 |
| Auth/DB | Firebase 12 (Auth + Firestore) |
| Theming | next-themes (class strategy, light default) |
| Package Manager | Bun |

## Directory Layout

```
app/
  layout.tsx          Root layout — fonts, ThemeProvider, QueryClientProvider
  actions.ts          Server actions: setAuthCookie(), logout()
  auth/
    login/page.tsx    Login page (Firebase email/password)
    forget-password/  Password reset page (sendPasswordResetEmail)
  tools/
    layout.tsx        Sidebar shell — AppSidebar, ThemeToggle, AccountInfo
    page.tsx          Tools dashboard (card grid linking to features)
    reports/          Service report generator
    reports-history/  Browse saved Firestore reports
    test-firebase/    Firebase debug page
components/
  ui/                 17 Shadcn components (badge, button, calendar, card, etc.)
  app-sidebar.tsx     Navigation sidebar with tool links
  providers.tsx       React Query provider (staleTime 5m, gcTime 30m)
  theme-provider.tsx  next-themes wrapper
  theme-toggle.tsx    Light/dark toggle button
  account-info.tsx    User dropdown with Firebase auth state
  logout-button.tsx   Sidebar logout form action
lib/
  firebase.ts         Firebase client init (hardcoded config, "use client")
  queries/reports.ts  Firestore fetch + sort for reports collection
  utils.ts            cn() — clsx + tailwind-merge
hooks/
  use-mobile.ts       768px breakpoint hook
types/
  firebase.d.ts       Window.__FIREBASE_APP__ augmentation
proxy.ts              Middleware function (exported but NOT wired to middleware.ts)
```

## Auth Flow

1. User visits `/` → redirected to `/tools` (via proxy.ts logic, but middleware.ts is missing)
2. `/tools/*` routes check for `authenticated` cookie
3. If no cookie → redirect to `/auth/login`
4. `/auth/login` page: Firebase `signInWithEmailAndPassword` → on success, server action sets cookie
5. `/auth/forget-password` page: Firebase `sendPasswordResetEmail` → shows success state
6. Cookie: `authenticated=true`, httpOnly, 7-day expiry

## Data Model

Firestore collection `reports`:
- `title`, `type` (AOG_YOUTH, AOG_TEEN, EVENT), `date` (Indonesian format "DD Month YYYY")
- `divisions` — map of ministry names to volunteer counts
- `totalVolunteer`, `jemaat`, `tc`, `guest`, `pastorSpeaker`
- `altarcallText`, `altarcallNumber`, `baptisan`, `whl`, `bersediaJoinCg`
- `prayerStation`, `oneMinutePrayer`, `reportText`, `lastUpdated`

## Features

| Feature | Route | Status |
|---------|-------|--------|
| Authentication | `/auth/login` | Working |
| Forget Password | `/auth/forget-password` | Working |
| Reports Generator | `/tools/reports` | Working |
| Reports History | `/tools/reports-history` | Working |
| Firebase Debug | `/tools/test-firebase` | Working |
| Service Assignment | `docs/sample/` | Reference only (not integrated) |

## Fonts

- **Display**: Instrument Serif (weight 400)
- **Body**: DM Sans
- **Mono**: IBM Plex Mono (400, 500)

CSS variables: `--font-display`, `--font-sans`, `--font-mono`
