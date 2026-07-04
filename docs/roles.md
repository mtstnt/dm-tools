### Roles

| Role          |
|---------------|
| Head Ministry |
| Regional PIC  |
| SPV           |
| Member        |

### Permissions

(Note: crud = means 4 rows, each create, read, update, delete. e = execute)

#### MASTER DATA

| Resource       | Action |
|----------------|--------|
| regions        | crud   |
| teams          | crud   |
| event_types    | crud   |
| ministries     | crud   |
| metrics        | crud   |
| tasks          | crud   |
| configurations | crud   |

#### USERS

| Resource         | Action |
|------------------|--------|
| users            | crud   |
| roles            | crud   |
| permissions      | crud   |
| role_permissions | crud   |
| user_permissions | crud   |
| user_roles       | crud   |

#### EVENTS

| Resource                        | Action |
|---------------------------------|--------|
| events                          | crud   |
| event_teams                     | crud   |
| event_volunteers                | crud   |
| event_assignments               | crud   |
| event_metrics                   | crud   |
| event_altar_calls               | crud   |
| event_assignment_change_requests | crud   |

#### AUDIT TRAILS

| Resource     | Action |
|--------------|--------|
| audit_trails | r      |

#### OTHER ACTIONS

| Resource         | Action |
|------------------|--------|
| gen_monthly_report | e      |
| gen_weekly_report  | e      |
| gen_yearly_report  | e      |

### Role Permissions

#### 1. Head Ministry

| Resource                         | Create | Read | Update | Delete | Execute | Scope |
|----------------------------------|--------|------|--------|--------|---------|-------|
| regions                          | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| teams                            | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| event_types                      | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| ministries                       | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| metrics                          | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| tasks                            | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| configurations                   | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| users                            | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| roles                            | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| permissions                      | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| role_permissions                 | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| user_permissions                 | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| user_roles                       | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| events                           | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| event_teams                      | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| event_volunteers                 | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| event_assignments                | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| event_metrics                    | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| event_altar_calls                | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| event_assignment_change_requests | [x]    | [x]  | [x]    | [x]    | [ ]     | all   |
| audit_trails                     | [ ]    | [x]  | [ ]    | [ ]    | [ ]     | all   |
| gen_yearly_report                | [ ]    | [ ]  | [ ]    | [ ]    | [x]     | all   |
| gen_monthly_report               | [ ]    | [ ]  | [ ]    | [ ]    | [x]     | all   |
| gen_weekly_report                | [ ]    | [ ]  | [ ]    | [ ]    | [x]     | all   |

#### 2. Regional PIC

| Resource                         | Create | Read | Update | Delete | Execute | Scope  |
|----------------------------------|--------|------|--------|--------|---------|--------|
| teams                            | [x]    | [x]  | [x]    | [x]    | [ ]     | region |
| event_types                      | [x]    | [x]  | [x]    | [x]    | [ ]     | all    |
| ministries                       | [x]    | [x]  | [x]    | [x]    | [ ]     | all    |
| metrics                          | [x]    | [x]  | [x]    | [x]    | [ ]     | all    |
| tasks                            | [x]    | [x]  | [x]    | [x]    | [ ]     | all    |
| users                            | [x]    | [x]  | [x]    | [x]    | [ ]     | region |
| roles                            | [x]    | [x]  | [x]    | [x]    | [ ]     | all    |
| permissions                      | [x]    | [x]  | [x]    | [x]    | [ ]     | all    |
| role_permissions                 | [x]    | [x]  | [x]    | [x]    | [ ]     | all    |
| user_permissions                 | [x]    | [x]  | [x]    | [x]    | [ ]     | all    |
| user_roles                       | [x]    | [x]  | [x]    | [x]    | [ ]     | all    |
| events                           | [x]    | [x]  | [x]    | [x]    | [ ]     | region |
| event_teams                      | [x]    | [x]  | [x]    | [x]    | [ ]     | region |
| event_volunteers                 | [x]    | [x]  | [x]    | [x]    | [ ]     | region |
| event_assignments                | [x]    | [x]  | [x]    | [x]    | [ ]     | region |
| event_metrics                    | [x]    | [x]  | [x]    | [x]    | [ ]     | region |
| event_altar_calls                | [x]    | [x]  | [x]    | [x]    | [ ]     | region |
| event_assignment_change_requests | [x]    | [x]  | [x]    | [x]    | [ ]     | region |
| audit_trails                     | [ ]    | [x]  | [ ]    | [ ]    | [ ]     | region |
| gen_monthly_report               | [ ]    | [ ]  | [ ]    | [ ]    | [x]     | region |
| gen_weekly_report                | [ ]    | [ ]  | [ ]    | [ ]    | [x]     | region |

#### 3. SPV

| Resource                         | Create | Read | Update | Delete | Execute | Scope  |
|----------------------------------|--------|------|--------|--------|---------|--------|
| teams                            | [ ]    | [x]  | [ ]    | [ ]    | [ ]     | region |
| users                            | [ ]    | [x]  | [ ]    | [ ]    | [ ]     | region |
| events                           | [ ]    | [x]  | [ ]    | [ ]    | [ ]     | region |
| events                           | [ ]    | [ ]  | [x]    | [ ]    | [ ]     | team   |
| event_teams                      | [ ]    | [x]  | [ ]    | [ ]    | [ ]     | team   |
| event_volunteers                 | [x]    | [x]  | [x]    | [x]    | [ ]     | team   |
| event_assignments                | [x]    | [x]  | [x]    | [x]    | [ ]     | team   |
| event_metrics                    | [x]    | [x]  | [x]    | [x]    | [ ]     | team   |
| event_altar_calls                | [x]    | [x]  | [x]    | [x]    | [ ]     | team   |
| event_assignment_change_requests | [x]    | [x]  | [x]    | [x]    | [ ]     | team   |
| gen_weekly_report                | [ ]    | [ ]  | [ ]    | [ ]    | [x]     | team   |

#### 4. Member

| Resource                         | Create | Read | Update | Delete | Execute | Scope  |
|----------------------------------|--------|------|--------|--------|---------|--------|
| events                           | [ ]    | [x]  | [ ]    | [ ]    | [ ]     | region |
| events                           | [ ]    | [ ]  | [x]    | [ ]    | [ ]     | self   |
| event_assignment_change_requests | [x]    | [x]  | [ ]    | [ ]    | [ ]     | self   |
