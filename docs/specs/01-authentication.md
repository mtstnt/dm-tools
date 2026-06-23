# Feature: Authentication

## Overview

Simple email/password authentication using Firebase Auth. Session state stored as an httpOnly cookie set by a Next.js server action.

## Files

| File | Role |
|------|------|
| `app/auth/login/page.tsx` | Login form (client component) |
| `app/auth/forget-password/page.tsx` | Password reset form (client component) |
| `app/auth/page.tsx` | Redirects to `/auth/login` |
| `app/actions.ts` | Server actions: `setAuthCookie()`, `logout()` |
| `lib/firebase.ts` | Firebase client init, exports `auth` |
| `components/account-info.tsx` | Displays logged-in user, handles logout |
| `components/logout-button.tsx` | Sidebar logout button |
| `proxy.ts` | Route protection logic (exported but NOT used as middleware) |

## Flow

### Sign In
1. User enters email + password on `/auth/login`
2. Calls `signInWithEmailAndPassword(auth, email, password)` from Firebase client SDK
3. On success, calls `setAuthCookie()` server action
4. Server action sets cookie `authenticated=true` (httpOnly, secure in prod, 7-day maxAge, path=/)
5. Redirects to `/`

### Forget Password
1. User enters email on `/auth/forget-password`
2. Calls `sendPasswordResetEmail(auth, email)` from Firebase client SDK
3. On success, shows confirmation message with the email address
4. User can click "Back to sign in" to return to `/auth/login`

### Sign Out
1. User clicks logout in `AccountInfo` dropdown or `LogoutButton`
2. Calls `signOut(auth)` from Firebase client SDK
3. Calls `logout()` server action
4. Server action deletes `authenticated` cookie
5. Redirects to `/auth/login`

### Route Protection
- `proxy.ts` exports a `proxy()` function and `config.matcher`
- This function checks `/tools/*` routes for the `authenticated` cookie
- **Critical**: There is no `middleware.ts` file — the proxy function is orphaned
- To activate route protection, create `middleware.ts` that re-exports from `proxy.ts`

## Cookie Details

```
Name: authenticated
Value: "true"
httpOnly: true
secure: process.env.NODE_ENV === "production"
maxAge: 604800 (7 days)
path: "/"
```

## Firebase Config

Hardcoded in `lib/firebase.ts` (client-side). Also available via env vars:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**Note**: The env vars are defined in `.env` but `lib/firebase.ts` uses hardcoded values, not `process.env`.

## Gotchas

- No middleware.ts exists — route protection is not active by default
- Cookie is a simple boolean, not a Firebase token — no server-side token verification
- Firebase sign-out and cookie deletion must both complete for clean logout
- The auth page is a full-screen split layout (brand panel left, form right) — mobile hides left panel
