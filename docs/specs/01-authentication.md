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
| `actions/auth/session.ts` | Server action: `getUserSession()` returns id, email, fullName, nij, role, teamId, regionId, firebaseCredentials |
| `actions/auth/firebase-auth.ts` | `getFirebaseCredentials()` — AES-256-GCM encrypted Firebase auth for client |
| `lib/crypto/crypto.ts` | Server-side encryption of Firebase credentials |
| `lib/crypto/crypto-client.ts` | Client-side decryption of Firebase credentials |
| `components/account-info.tsx` | Displays logged-in user and roles, handles logout |
| `components/logout-button.tsx` | Sidebar logout button |
| `components/auth-guard.tsx` | Client-side route guard for `/my/*` and `/tools/*` |
| `components/firebase-auth-initializer.tsx` | Silently signs in to Firebase Auth using encrypted session credentials |
| `components/user-session-provider.tsx` | React Context + hooks: `useSessionUser()`, `useSetSessionUser()` |
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
- Components anywhere in the app can call `useSessionUser()` to read id, email, fullName, nij, role, teamId, regionId, and firebaseCredentials without extra fetches
- `canAccess(userRole, allowedRoles)` from `lib/permissions.ts` checks the session role against an explicit allow-list; the hardcoded `Admin` role bypasses all checks
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

Passwords are stored as bcrypt hashes in `users.password`. The seeder creates a default admin user (`admin@email.com` / `123456`) with the `Admin` role.

## Role-Based Access Control

Access control is based on 5 hardcoded roles defined in `lib/permissions.ts`. The role names are:

| Role | Description |
|------|-------------|
| `Admin` | Full system access. Built-in bypass — `canAccess()` always returns `true`. |
| `Head Ministry` | Full access to all features, including system configuration and audit trails. |
| `Regional PIC` | Regional-level access. Can manage events, teams, members, and master data within their region. |
| `SPV` | Team-level access. Can read master data and members, view and update events. |
| `Member` | Basic access. Can view events and request assignment changes. |

### How Checks Work

A single `canAccess(userRole, allowedRoles)` function in `lib/permissions.ts` is used everywhere:

- **Admin bypass**: If `userRole === "Admin"`, returns `true` immediately — no other logic needed.
- **Explicit allow-lists**: Each operation specifies exactly which roles can access it via an array, e.g. `canAccess(role, [ROLES.HEAD_MINISTRY, ROLES.REGIONAL_PIC])`.
- **Zero dependencies**: Pure TypeScript — importable from server actions, client components, anywhere.

### Server-Side Checks

Each server action calls `getUserRole()` (lightweight, no Firebase fetch) and guards with `canAccess()`:

```ts
const role = await getUserRole();
if (!canAccess(role, [ROLES.ADMIN, ROLES.HEAD_MINISTRY])) {
  return { success: false, error: "Forbidden" };
}
```

Data scoping (which region/team data a role can see) is handled **per action**, not in `canAccess()`:

```ts
if (role === ROLES.HEAD_MINISTRY) {
  data = await db.select().from(events);              // all events
} else if (role === ROLES.REGIONAL_PIC) {
  data = await db.select().from(events).where(/* region filter */);
} else if (role === ROLES.SPV) {
  data = await db.select().from(events).where(/* team filter */);
}
```

### Client-Side Checks

Components import `canAccess` directly from `lib/permissions.ts`:

```ts
import { canAccess, ROLES } from "@/lib/permissions";
const session = useSessionUser();
const canEdit = canAccess(session?.role, [ROLES.ADMIN, ROLES.HEAD_MINISTRY, ROLES.SPV]);
```

### Sidebar Navigation

The sidebar (`lib/navigation.ts`) uses `allowedRoles` arrays per menu item instead of the old `resource` + `read` permission model:

```ts
{
  type: "link",
  label: "Regions",
  targetLink: "/my/master/regions",
  icon: Globe,
  allowedRoles: [ROLES.ADMIN, ROLES.HEAD_MINISTRY],
}
```

`components/app-sidebar.tsx` checks `canAccess(session?.role, node.allowedRoles)` to determine visibility.

### Role Mapping: Who Can Do What

| Operation | Admin | Head Ministry | Regional PIC | SPV | Member |
|-----------|-------|--------------|--------------|-----|--------|
| Master data: read | all | all | all | all | - |
| Master data: create/update/delete | all | all | teams, event_types, ministries, metrics, tasks | - | - |
| Events: read | all | all | all | all | all |
| Events: create | all | all | all | - | - |
| Events: update | all | all | all | all | - |
| Events: delete | all | all | - | - | - |
| Users: read | all | all | all | all | - |
| Users: create/update | all | all | all | - | - |
| Users: delete | all | all | - | - | - |
| Audit trails | all | all | - | - | - |
| Configurations | all | all | - | - | - |

## Gotchas

- No middleware.ts exists — route protection relies on the client-side `AuthGuard`
- Cookie contains the user ID, not a signed token — no server-side token verification
- The auth page is a full-screen split layout (brand panel left, form right) — mobile hides left panel
- Firebase env vars are currently unused by the running code; Firebase config is hardcoded in `lib/firebase/firebase.ts`
- Role-based scoping (which region/team data a role sees) is implemented per server action, not in `canAccess()` — each action must handle data filtering for the user's role
