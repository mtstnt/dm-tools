# Feature: Authentication

## Overview

Email/password authentication against the local SQLite `users` table. Session state stored as an httpOnly cookie set by a Next.js server action. Firebase Auth is **not** used for app authentication; Firebase is only used for Firestore.

## Files

| File | Role |
|------|------|
| `app/auth/login/page.tsx` | Login form (client component) |
| `app/auth/forget-password/page.tsx` | Disabled — redirects to `/auth/login` |
| `app/auth/page.tsx` | Redirects to `/auth/login` |
| `actions/auth/login.ts` | Server actions: `login()`, `logout()`, `getCurrentUser()`, `checkAuth()` |
| `components/account-info.tsx` | Displays logged-in user, handles logout |
| `components/logout-button.tsx` | Sidebar logout button |
| `components/auth-guard.tsx` | Client-side route guard for `/my/*` and `/tools/*` |
| `proxy.ts` | Route protection logic (exported but NOT used as middleware) |

## Flow

### Sign In
1. User enters email + password on `/auth/login`
2. Calls `login(email, password)` server action from `actions/auth/login.ts`
3. Server action normalizes email to lowercase, queries the `users` table, and verifies the bcrypt-hashed password
4. On success, sets cookie `authenticated={userId}` (httpOnly, secure in prod, 7-day maxAge, path=/)
5. Client redirects to `/my/home`

### Forget Password
- Disabled. `/auth/forget-password` redirects to `/auth/login`.

### Sign Out
1. User clicks logout in `AccountInfo` dropdown or `LogoutButton`
2. Calls `logout()` server action
3. Server action deletes the `authenticated` cookie
4. Client redirects to `/auth/login`

### Route Protection
- `AuthGuard` (`components/auth-guard.tsx`) calls `checkAuth()` to verify the session cookie before rendering `/my/*` and `/tools/*` routes
- `proxy.ts` exports a `proxy()` function and `config.matcher`, but there is no `middleware.ts` file — the proxy function is orphaned
- To activate middleware-level redirects (`/` → `/my`), create `middleware.ts` that re-exports from `proxy.ts`

## Cookie Details

```
Name: authenticated
Value: user ID (e.g., "1")
httpOnly: true
secure: process.env.NODE_ENV === "production"
maxAge: 604800 (7 days)
path: "/"
```

## User Passwords

Passwords are stored as bcrypt hashes in `users.password`. The seeder creates a default admin user (`admin@email.com` / `123456`) with the `Head Ministry` role.

## Permission Bypass

`actions/master/_shared.ts` grants full access to any user whose role name is exactly `ADMIN`. The seeded `Head Ministry` role also receives full permissions via `db/seeder.ts`.

## Gotchas

- No middleware.ts exists — route protection relies on the client-side `AuthGuard`
- Cookie contains the user ID, not a signed token — no server-side token verification
- The auth page is a full-screen split layout (brand panel left, form right) — mobile hides left panel
- Firebase env vars are currently unused by the running code; Firebase config is hardcoded in `lib/firebase.ts`
