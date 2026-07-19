# Translations Worksheet

Fill in the **ID** column with Indonesian translations.
Strings marked with `(keep)` should stay as-is.
Strings with `${...}` are dynamic — only translate the surrounding text.

---

## A. Layout & Branding

| # | English | ID |
|---|---------|-----|
| 1 | DM Tools | |
| 2 | Data Ministry Tools | |
| 3 | Data Ministry | |
| 4 | Serve with | |
| 5 | clarity. | |
| 6 | Tools built for ministry teams who care about the details that make every service run smoothly. | |

## B. Login & Authentication

| # | English | ID |
|---|---------|-----|
| 1 | Welcome back | |
| 2 | Sign in to access your tools. | |
| 3 | Email | |
| 4 | Password | |
| 5 | name@church.org | *(placeholder)* |
| 6 | Enter your password | |
| 7 | Sign in | |
| 8 | Signing in... | |
| 9 | Authentication failed | |
| 10 | Login failed | |
| 11 | Sign in with your credentials to access Events. | |
| 12 | Invalid email or password | |
| 13 | Log out | |

## C. Sidebar Navigation

| # | English | ID |
|---|---------|-----|
| 1 | Home | |
| 2 | Data Entry | |
| 3 | My Events | |
| 4 | All Events | |
| 5 | Master | |
| 6 | Regions | |
| 7 | Teams | |
| 8 | Event Types | |
| 9 | Ministries | |
| 10 | Metrics | |
| 11 | Tasks | |
| 12 | Configurations | |
| 13 | Audit Trails | |
| 14 | Team Management | |
| 15 | Members | |
| 16 | Permissions | |
| 17 | Roles | |
| 18 | Utilities | |
| 19 | Report Generator | |
| 20 | Assign | |
| 21 | Tally Counter | |
| 22 | Calendar | |
| 23 | Legacy SC Website | |
| 24 | Events (Web SC) | |
| 25 | Report History (Firebase) | |
| 26 | Members (Firebase) | |

## D. Master CRUD (shared — master-crud-page.tsx)

| # | English | ID |
|---|---------|-----|
| 1 | Failed to create | |
| 2 | Failed to update | |
| 3 | Failed to delete | |
| 4 | Failed to delete ${n} item(s) | |
| 5 | Actions | |
| 6 | Edit | |
| 7 | Delete | |
| 8 | Add ${resourceLabel} | |
| 9 | Create a new ${resourceLabel.toLowerCase()}. | |
| 10 | Cancel | |
| 11 | Saving... | |
| 12 | Save | |
| 13 | Update | |
| 14 | Search ${resourceLabel.toLowerCase()}... | |
| 15 | Delete ${n} | |
| 16 | Edit ${resourceLabel} | |
| 17 | Update the ${resourceLabel.toLowerCase()} details. | |
| 18 | Delete ${resourceLabel} | |
| 19 | Are you sure you want to delete this ${resourceLabel.toLowerCase()}? | |
| 20 | This action cannot be undone. | |
| 21 | Deleting... | |
| 22 | Bulk Delete ${resourceLabel}s | |
| 23 | Are you sure you want to delete ${n} selected ${resourceLabel.toLowerCase()}s? This action cannot be undone. | |

### D.1 Master Entity Labels

| # | English | Context | ID |
|---|---------|---------|-----|
| 1 | Manage regions. | Regions desc | |
| 2 | Region | Resource label | |
| 3 | Manage teams. | Teams desc | |
| 4 | Team | Resource label | |
| 5 | Manage event types. | Event Types desc | |
| 6 | Event Type | Resource label | |
| 7 | Manage ministries. | Ministries desc | |
| 8 | Ministry | Resource label | |
| 9 | Manage metrics. | Metrics desc | |
| 10 | Metric | Resource label | |
| 11 | Manage tasks. | Tasks desc | |
| 12 | Task | Resource label | |
| 13 | Manage application configurations. | Configurations desc | |
| 14 | Configuration | Resource label | |

## E. Data Table (shared — data-table.tsx)

| # | English | ID |
|---|---------|-----|
| 1 | Search... | |
| 2 | Select all | |
| 3 | Select row | |
| 4 | Loading... | |
| 5 | No results. | |
| 6 | ${n} of ${n} row(s) selected. | |
| 7 | Previous | |
| 8 | Page ${n} of ${n} | |
| 9 | Next | |

## F. Members Page (app/my/users/members/)

| # | English | ID |
|---|---------|-----|
| 1 | Members | |
| 2 | View members by team. | |
| 3 | Teams Directory | |
| 4 | Overview of all active teams and unassigned members. | |
| 5 | Add Member | |
| 6 | No members assigned. | |
| 7 | Not Assigned | |
| 8 | All members are assigned to a team. | |
| 9 | SPV | *(keep)* |
| 10 | Member | |
| 11 | Members | |
| 12 | Create user | |
| 13 | Add a new member to the system. | |
| 14 | Creating... | |
| 15 | Create | |
| 16 | Edit user | |
| 17 | Save changes | |
| 18 | Delete user | |
| 19 | Are you sure you want to delete ...? This action cannot be undone. | |
| 20 | Full name | |
| 21 | NIJ | *(keep)* |
| 22 | email@example.com | *(placeholder)* |
| 23 | Leave blank to keep current | |
| 24 | Select team | |
| 25 | Team ${team.number} | |

## G. Member Detail (app/my/users/members/[id]/)

| # | English | ID |
|---|---------|-----|
| 1 | Invalid user ID | |
| 2 | Failed to load user | |
| 3 | Member | |
| 4 | Member details. | |
| 5 | User profile, roles, and additional permissions. | |
| 6 | Connected with SC Web (ID: ${user.sourceId}) | |
| 7 | Not yet connected with SC Web | |
| 8 | Back to members | |
| 9 | Dashboard | |
| 10 | Schedules | |
| 11 | Review | |
| 12 | Roles | |
| 13 | Additional Permissions | |
| 14 | User Data | |
| 15 | Read-only database fields for this user. | |
| 16 | Team | |
| 17 | Created at | |
| 18 | Updated at | |
| 19 | Created by | |
| 20 | Updated by | |
| 21 | Coming soon... | |
| 22 | No roles assigned. | |
| 23 | Roles directly assigned to this user. | |
| 24 | User-specific permissions outside role assignments. | |
| 25 | Resource | |
| 26 | Action | |
| 27 | No additional permissions. | |

## H. Roles (app/my/users/roles/)

| # | English | ID |
|---|---------|-----|
| 1 | Roles | |
| 2 | Manage roles and their permissions. | |
| 3 | Loading roles... | |
| 4 | Search role... | |
| 5 | Name | |
| 6 | Delete Role | |
| 7 | Are you sure you want to delete the role "{name}"? This action cannot be undone. | |
| 8 | Role | |
| 9 | Role details. | |
| 10 | Role permissions. | |
| 11 | Assign Permission | |
| 12 | Assign an existing permission to this role. | |
| 13 | Permission | |
| 14 | Select permission | |
| 15 | Scope | |
| 16 | Select scope | |
| 17 | Assigning... | |
| 18 | Assign | |
| 19 | Back to roles | |
| 20 | Resource Name | |
| 21 | Create | |
| 22 | Read | |
| 23 | Update | |
| 24 | Delete | |
| 25 | Execute | |
| 26 | Edit Scope | |
| 27 | Update the scope for ${resource} → ${action}. | |

## I. Permissions (app/my/users/permissions/)

| # | English | ID |
|---|---------|-----|
| 1 | Permissions | |
| 2 | Manage permissions. | |
| 3 | Loading permissions... | |
| 4 | Search resource... | |
| 5 | Add Permission | |
| 6 | Create a new permission. | |
| 7 | Resource | |
| 8 | e.g. regions | |
| 9 | Action | |
| 10 | Select action | |
| 11 | Edit Permission | |
| 12 | Update the permission details. | |
| 13 | Delete Permission | |
| 14 | Are you sure you want to delete the permission resource "{name}"? This action cannot be undone. | |

## J. Audit Trails (app/my/audit-trails/)

| # | English | ID |
|---|---------|-----|
| 1 | Audit Trails | |
| 2 | Read-only system activity log. | |
| 3 | ID | |
| 4 | Changed At | |
| 5 | User | |
| 6 | Resource | |
| 7 | Action | |
| 8 | Record | |
| 9 | Old Data | |
| 10 | New Data | |
| 11 | No audit trails found. | |
| 12 | Showing ${startRow}–${endRow} of ${totalCount} entries | |
| 13 | No entries | |

## K. Events (app/my/events/, app/my/my-events/)

| # | English | ID |
|---|---------|-----|
| 1 | Events Schedule | |
| 2 | My Events | |
| 3 | Manage and assign teams for upcoming organizational services and events. | |
| 4 | Filter | |
| 5 | Add Event | |
| 6 | Periode Event | *(already Indonesian)* |
| 7 | Previous month | |
| 8 | Month | |
| 9 | Year | |
| 10 | Next month | |
| 11 | No events scheduled yet. | |
| 12 | Show fewer events | |
| 13 | Show all events (${n}) | |
| 14 | ! Requires Application | |
| 15 | Team ${team.number} | |

## L. Legacy Events (app/tools/legacy/events/)

| # | English | ID |
|---|---------|-----|
| 1 | Events | |
| 2 | Manage events. | |
| 3 | Experimental | |
| 4 | Sign out | |
| 5 | Not authenticated | |
| 6 | Session expired | |
| 7 | Failed to load events | |
| 8 | Your session has expired. Please sign in again. | |
| 9 | Unknown error | |
| 10 | Sign in again | |
| 11 | Retry | |
| 12 | No events found. | |
| 13 | Location | |
| 14 | All locations | |
| 15 | Event name | |
| 16 | All events | |
| 17 | Date | |
| 18 | All dates | |
| 19 | Clear filters | |
| 20 | No events match the selected filters. | |
| 21 | Untitled | |
| 22 | Seats | |
| 23 | Presence | |
| 24 | Edit | |
| 25 | Untitled Event | |
| 26 | No date | |
| 27 | Assignment | |
| 28 | Blocks | |
| 29 | Dashboard | |
| 30 | Dashboard — coming soon | |
| 31 | Failed to load: | |

## M. Reports Generator (app/tools/utilities/reports/)

| # | English | ID |
|---|---------|-----|
| 1 | Service Report | |
| 2 | Fill in the details below to generate your report. | |
| 3 | Input Fields | |
| 4 | Preview | |
| 5 | Service Type | |
| 6 | Date | |
| 7 | Event Name | |
| 8 | Volunteer | |
| 9 | Ministries | |
| 10 | Total | |
| 11 | TC | *(keep)* |
| 12 | Altar Calls | |
| 13 | Enter event name | |
| 14 | e.g. 18 | |
| 15 | e.g. 11 | |
| 16 | Text | |
| 17 | Count | |
| 18 | Sync Tally | |
| 19 | Copy | |
| 20 | Copied! | |
| 21 | Event | |
| 22 | AOG Teen South | *(keep)* |
| 23 | AOG Youth South | *(keep)* |

### M.1 Report Template Lines

| # | English | ID |
|---|---------|-----|
| 1 | 1. Pastor and Speaker: | |
| 2 | 2. Guest: | |
| 3 | 3. Volunteer: | |
| 4 | 4. Jemaat: | |
| 5 | 5. Baptisan: | |
| 6 | 6. WHL:   (Bersedia Join CG: ) | |
| 7 | 7. Prayer Station: | |
| 8 | 8. One Minute Prayer: | |

## N. Reports History (app/tools/reports-history/)

| # | English | ID |
|---|---------|-----|
| 1 | Reports History | |
| 2 | Browse all saved service reports. | |
| 3 | Title | |
| 4 | Type | |
| 5 | Date | |
| 6 | Volunteers | |
| 7 | Failed to load reports | |
| 8 | Retry | |
| 9 | No reports found. | |
| 10 | Untitled | |
| 11 | Updated | |
| 12 | Pastor / Speaker | |
| 13 | Guest | |
| 14 | Event Name | |
| 15 | Total Volunteers | |
| 16 | Altar Call | |
| 17 | Altar Call # | |
| 18 | Baptisan | |
| 19 | WHL | |
| 20 | Join CG | |
| 21 | Prayer Station | |
| 22 | One Minute Prayer | |
| 23 | Divisions | |
| 24 | Report Text | |

## O. Firebase Members (app/tools/members/)

| # | English | ID |
|---|---------|-----|
| 1 | Manage Members | |
| 2 | Input data member — Nama Lengkap, NIJ, Email, Nickname, Team, Role, Admin, Source User | |
| 3 | Nickname | *(keep)* |
| 4 | Team | |
| 5 | Source User | |
| 6 | Role | |
| 7 | Member | |
| 8 | SPV | *(keep)* |
| 9 | PIC | *(keep)* |
| 10 | Admin | |
| 11 | Edit | |
| 12 | Update | |
| 13 | Edit Member | |
| 14 | Web auth required to fetch users | |
| 15 | Failed to fetch users | |
| 16 | ADMIN | *(keep)* |

## P. Tally Counter (app/tools/utilities/tally/)

| # | English | ID |
|---|---------|-----|
| 1 | Altar Call 1 ... Altar Call N | *(keep)* |
| 2 | Log | |
| 3 | COMBO | *(keep)* |

## Q. Assign Tool (app/tools/utilities/assign/)

| # | English | ID |
|---|---------|-----|
| 1 | SERVICE ASSIGNMENT | |
| 2 | TC In + Altarcall S1 | *(keep)* |
| 3 | TC Out + Altarcall S2 | *(keep)* |
| 4 | FD | *(keep)* |
| 5 | Teen | |
| 6 | Youth | |
| 7 | VIEW | |
| 8 | MANUAL | |
| 9 | INITIALIZE EVENTS | |
| 10 | RE-ROLL SR | |
| 11 | CLEAR | |
| 12 | AUTO ASSIGN | |
| 13 | OUTPUT | |
| 14 | MAIN STAGE | |
| 15 | ALL BLOCK | |
| 16 | ALL | |
| 17 | ALL-T | *(keep)* |
| 18 | ALL-Y | *(keep)* |

## R. Server Action Errors (actions/)

| # | English | ID |
|---|---------|-----|
| 1 | Unauthorized | |
| 2 | Forbidden | |
| 3 | Forbidden: You don't have permission to perform this action. | |
| 4 | CSRF token not found | |
| 5 | Login failed | |
| 6 | SESSION_EXPIRED | |
| 7 | Email already exists | |
| 8 | Role "Member" is missing | |
| 9 | Failed to load | |
| 10 | Failed to create | |
| 11 | Failed to update | |
| 12 | Failed to delete | |
| 13 | Failed to assign permission | |
| 14 | Failed to unassign permission | |
| 15 | Failed to update scope | |
| 16 | Failed to fetch events page | |
| 17 | Failed to fetch event edit page | |
| 18 | Request failed | |
| 19 | Name is required | |
| 20 | Value is required | |
| 21 | Team number is required | |
| 22 | Region is required | |
| 23 | Full name is required | |
| 24 | NIJ is required | |
| 25 | Email is required | |
| 26 | Invalid email | |
| 27 | Password must be at least 6 characters | |

### R.1 Entity-specific error prefixes

| English | Entities |
|---------|----------|
| Region not found | |
| Team not found | |
| Event type not found | |
| Ministry not found | |
| Metric not found | |
| Task not found | |
| Configuration not found | |
| Role not found | |
| Permission not found | |
| User not found | |

## S. Miscellaneous

| # | English | File | ID |
|---|---------|------|-----|
| 1 | Home | my/home/page.tsx | |
| 2 | Welcome! | my/home/page.tsx | |
| 3 | Edit Ministries | ministries-dialog.tsx | |
| 4 | No ministries. Add one below. | ministries-dialog.tsx | |
| 5 | New ministry name | ministries-dialog.tsx | |
| 6 | Regions | my/schedules/page.tsx | |
| 7 | Manage regions. | my/schedules/page.tsx | |

---

## Notes

- Strings marked `(keep)` should not be translated — they are acronyms, brand names, or proper nouns.
- `${...}` are runtime variables — only translate the surrounding text.
- Some strings appear in multiple files — once filled in above, replace them in ALL files listed.
- After completing, hand this file back and I will do the replacements across the codebase.
