# Feature: Authentication

## Overview

Email/password authentication against the local SQLite `users` table. Session state stored as an httpOnly cookie set by a Next.js server action. Firebase Auth is **not** used for app authentication; Firebase is only used for Firestore.

## Files

| File | Role |
|------|------|
| `app/auth/login/page.tsx` | Login form (client component) — local auth + Firebase Auth sign-in |
| `app/auth/forget-password/page.tsx` | Disabled — redirects to `/auth/login` |
| `app/auth/page.tsx` | Redirects to `/auth/login` |
| `actions/auth/login.ts` | Server actions: `login()`, `logout()` |
| `actions/auth/current-user.ts` | Server actions: `getCurrentUser()`, `checkAuth()` |
| `actions/auth/session.ts` | Server action: `getUserSession()` returns id, email, fullName, nij, roles, permissions, firebaseCredentials |
| `actions/auth/firebase-auth.ts` | `getFirebaseCredentials()` — AES-256-GCM encrypted Firebase auth for client |
| `lib/crypto/crypto.ts` | Server-side encryption of Firebase credentials |
| `lib/crypto/crypto-client.ts` | Client-side decryption of Firebase credentials |
| `components/account-info.tsx` | Displays logged-in user and roles, handles logout |
| `components/logout-button.tsx` | Sidebar logout button |
| `components/auth-guard.tsx` | Client-side route guard for `/my/*` and `/tools/*` |
| `components/firebase-auth-initializer.tsx` | Silently signs in to Firebase Auth using encrypted session credentials |
| `components/user-session-provider.tsx` | React Context + hooks: `useSessionUser()`, `hasPermission()` |
| `proxy.ts` | Route protection logic (exported but NOT used as middleware) |

## Flow

### Sign In
1. User enters email + password on `/auth/login`
2. Calls `login(email, password)` server action from `actions/auth/login.ts`
3. Server action normalizes email to lowercase, queries the `users` table, and verifies the bcrypt-hashed password
4. On success, sets cookie `authenticated={userId}` (httpOnly, secure in prod, 7-day maxAge, path=/)
5. Server action encrypts Firebase credentials (if `FIREBASE_AUTH_EMAIL`/`FIREBASE_AUTH_PASSWORD` are set) via AES-256-GCM and returns them in the session
6. Client decrypts credentials using `NEXT_PUBLIC_FIREBASE_AUTH_ENCRYPTION_KEY` and signs in to Firebase Auth via `signInWithEmailAndPassword` (enables Firestore access)
7. Client redirects to `/my/home`

### Forget Password
- Disabled. `/auth/forget-password` redirects to `/auth/login`.

### Sign Out
1. User clicks logout in `AccountInfo` dropdown or `LogoutButton`
2. Calls `logout()` server action
3. Server action deletes the `authenticated` cookie
4. Client redirects to `/auth/login`

### Session Context
- `app/layout.tsx` fetches `getUserSession()` server-side and hydrates `UserSessionProvider`
- Components anywhere in the app can call `useSessionUser()` to read id, email, fullName, nij, roles, permissions, and firebaseCredentials without extra fetches
- `hasPermission(session, resource, action)` checks the session; the hardcoded `ADMIN` role bypasses all checks
- `FirebaseAuthInitializer` (mounted in root layout) silently signs in to Firebase Auth using the encrypted credentials from the session

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

Passwords are stored as bcrypt hashes in `users.password`. The seeder creates a default admin user (`admin@email.com` / `123456`) with the `ADMIN` role.

## Permission Bypass

The hardcoded `ADMIN` role name bypasses all permission checks:
- `checkPermission(resource, action)` in `actions/master/_shared.ts` returns `true` for any user with role name `ADMIN`
- `hasPermission(session, resource, action)` in `components/user-session-provider.tsx` returns `true` for any session whose `roles` array includes `ADMIN`

The seeded `Head Ministry` role receives full permissions via `db/seeder.ts`, but it does **not** bypass checks — it is evaluated through the normal permission matrix.

## Gotchas

- No middleware.ts exists — route protection relies on the client-side `AuthGuard`
- Cookie contains the user ID, not a signed token — no server-side token verification
- The auth page is a full-screen split layout (brand panel left, form right) — mobile hides left panel
- Firebase env vars are currently unused by the running code; Firebase config is hardcoded in `lib/firebase/firebase.ts`
- Permission scopes (`all`, `self`, `team`, `region`) are declared in the schema and seeded data but `checkPermission()` only verifies the permission exists — scope is not enforced at the action level
- `actions/users/permissions.ts` CRUD and three role-permission functions (`assignRolePermission`, `unassignRolePermission`, `updateRolePermissionScope`) lack permission checks — any authenticated user can modify them
