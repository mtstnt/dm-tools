# Feature: Members CSV Import

## Overview

Import members from a CSV file. Uses NIJ as unique key for upserts — creates new users or updates existing ones. A preview table shows the diff before committing.

## Files

| File | Role |
|------|------|
| `actions/users/members-import.ts` | Server actions: `validateMembersCsv`, `importMembers` |
| `app/my/users/members/page.tsx` | Import button + dialog (client component) |

## Access Control

| Role | Can Import |
|------|-----------|
| Admin | Yes |
| Head Ministry | Yes |
| Regional PIC | Yes |
| SPV | No |
| Member | No |

## CSV Format

**Columns (order matters, header text is ignored):**

| Index | Column | Description |
|-------|--------|-------------|
| 0 | Team | `"Team {number}"` or empty for unassigned |
| 1 | Nama Lengkap | Full name (stored uppercase) |
| 2 | Kode CG | CG code (as-is) |
| 3 | NIJ | Unique identifier for upsert lookup |
| 4 | Email | User email (stored lowercase) |
| 5 | Role | `"PIC"` aliases to `"Regional PIC"`, otherwise looked up in `roles` table |

**Rules:**
- First row is ignored (header).
- Additional columns beyond index 5 are ignored.
- Minimum 6 columns required per data row.

## Validation

Per-row validation produces one error per problematic column. Errors are displayed as a table (row number, column name, cause). If any validation error exists, the submit button is disabled.

### Validation Rules

| Rule | Condition |
|------|-----------|
| Column count | Must have >= 6 columns |
| Team format | `"Team {number}"` or empty string; if a team number is given, it must exist in the DB |
| Full name | Must not be empty |
| CG code | Must not be empty |
| NIJ | Must not be empty |
| Email | Must not be empty; must not conflict with another user's email (different NIJ) |
| Role | Must not be empty; `"PIC"` is aliased to `"Regional PIC"`; all other values must match a role in the `roles` table |
| Admin restriction | CSV row must not assign the `"Admin"` role; must not attempt to modify an existing Admin user |
| Duplicate NIJ in CSV | Each NIJ must appear only once within the CSV |

Row numbers are 1-indexed, starting at row 2 for the first data row (row 1 = header).

## Preview Table

Displayed after successful validation. Columns:

**Status | Team | Full Name | CG | NIJ | Email | Role**

| Status | Background | Meaning |
|--------|-----------|---------|
| NEW | Green (`bg-green-50`) | User does not exist yet — will be created |
| UPDATED | Yellow (`bg-yellow-50`) | User exists; one or more fields differ — changed fields shown in **bold** |
| NO CHANGE | Normal (no special bg) | User exists and all fields match — will be skipped |

## Import Logic

On confirm, each row is processed:

1. **NEW** — INSERT user with:
   - `fullName` → trimmed, uppercased
   - `nij` → trimmed
   - `email` → trimmed, lowercased
   - `cgCode` → as-is
   - `password` → bcrypt hash of email prefix (part before `@`); if no `@`, use full email
   - `teamId` → looked up team ID (or null)
   - `roleId` → looked up role ID
   - `createdBy` / `updatedBy` → current user ID

2. **UPDATED** — UPDATE changed fields only (fullName, nij, email, cgCode, teamId, roleId). Password is never changed on update.

3. **NO CHANGE** — Skipped.

Admin users are never created or modified via import (rejected at validation stage).

## Audit Trail

Each inserted or updated row logs an audit trail entry (resource = `"users"`, action = `"import"` or `"bulk_update"`).
