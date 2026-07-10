import {
  sqliteTable,
  text,
  integer,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { defineRelations, sql } from "drizzle-orm";

/* ============================================================================
 * ENUMS
 * ========================================================================== */

export const actionsEnum = [
  "create",
  "read",
  "update",
  "delete",
  "execute",
] as const;

export type Action = (typeof actionsEnum)[number];
export const eventStatusEnum = ["pending", "incomplete", "completed"] as const;
export type EventStatus = (typeof eventStatusEnum)[number];
export const eventModes = ["teams", "members", "manual_apply"] as const;
export type EventMode = (typeof eventModes)[number];
export const approvalStatusEnum = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof approvalStatusEnum)[number];
export const roleScopes = ["all", "self", "team", "region"] as const;
export type RoleScope = (typeof roleScopes)[number];

/* ============================================================================
 * MASTER TABLES
 * ========================================================================== */

export const regions = sqliteTable("regions", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  name: text("name").notNull(),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
});

export const teams = sqliteTable(
  "teams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    number: integer("number").notNull(),

    regionId: integer("region_id")
      .notNull()
      .references(() => regions.id),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [uniqueIndex("teams_number_unique").on(table.number)],
);

export const eventTypes = sqliteTable("event_types", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  name: text("name").notNull(),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
});

export const ministries = sqliteTable("ministries", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  name: text("name").notNull(),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
});

export const metrics = sqliteTable("metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  name: text("name").notNull(),
  notes: text("notes"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
});

export const tasks = sqliteTable("tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  name: text("name").notNull(),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
});

/* ============================================================================
 * CONFIGURATION
 * ========================================================================== */

export const configurations = sqliteTable(
  "configurations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    name: text("name").notNull(),
    value: text("value").notNull(),

    notes: text("notes"),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [uniqueIndex("configurations_name_unique").on(table.name)],
);

/* ============================================================================
 * USERS & PERMISSIONS
 * ========================================================================== */

export const users = sqliteTable(
  "users",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    fullName: text("full_name").notNull(),

    nij: text("nij").notNull(),

    email: text("email").notNull(),

    password: text("password"),

    sourceId: integer("source_id"),

    teamId: integer("team_id")
      .references(() => teams.id),

    roleId: integer("role_id").references(() => roles.id),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [uniqueIndex("users_email_unique").on(table.email)],
);

export const permissions = sqliteTable(
  "permissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    resource: text("resource").notNull(),

    action: text("action", {
      enum: actionsEnum,
    }).notNull(),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    uniqueIndex("permissions_resource_action_unique").on(
      table.resource,
      table.action,
    ),
  ],
);

export const roles = sqliteTable("roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  name: text("name").notNull(),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
});

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    roleId: integer("role_id")
      .notNull()
      .references(() => roles.id),

    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissions.id),

    scope: text("scope").$type<RoleScope>(),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    uniqueIndex("role_permissions_role_permission_unique").on(
      table.roleId,
      table.permissionId,
    ),
  ],
);

export const userPermissions = sqliteTable(
  "user_permissions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id),

    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissions.id),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    uniqueIndex("user_permissions_user_permission_unique").on(
      table.userId,
      table.permissionId,
    ),
  ],
);

/* ============================================================================
 * EVENT DATA COLLECTION
 * ========================================================================== */

export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  regionId: integer("region_id")
    .notNull()
    .references(() => regions.id),

  eventTypeId: integer("event_type_id")
    .notNull()
    .references(() => eventTypes.id),

  date: integer("date", { mode: "timestamp" }).notNull(),

  name: text("name").notNull(),

  mode: text("mode", {
    enum: eventModes,
  })
    .notNull()
    .default("teams"),

  configuration: text("configuration", { mode: "json" })
    .$type<{ field: string; value: string }[]>()
    .notNull()
    .default([]),

  sourceId: integer("source_id"),

  status: text("status", {
    enum: eventStatusEnum,
  })
    .notNull()
    .default("pending"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  createdBy: text("created_by").notNull(),
  updatedBy: text("updated_by").notNull(),
});

export const eventTeams = sqliteTable(
  "event_teams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    teamId: integer("team_id")
      .notNull()
      .references(() => teams.id),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    uniqueIndex("event_teams_event_team_unique").on(
      table.eventId,
      table.teamId,
    ),
  ],
);

export const eventAssignments = sqliteTable(
  "event_assignments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id),

    taskId: integer("task_id").references(() => tasks.id),

    blockName: text("block_name"),

    rating: integer("rating"),

    technicalNotes: text("technical_notes"),
    nonTechnicalNotes: text("non_technical_notes"),

    ratedByUserId: integer("rated_by_user_id").references(() => users.id),

    ratedBy: text("rated_by"),

    ratedAt: integer("rated_at", {
      mode: "timestamp",
    }),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    uniqueIndex("event_assignments_unique").on(
      table.userId,
      table.eventId,
      table.taskId,
      table.blockName,
    ),
  ],
);

export const eventAssignmentChangeRequests = sqliteTable(
  "event_assignment_change_requests",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    userFromId: integer("user_from_id")
      .notNull()
      .references(() => users.id),

    userToId: integer("user_to_id").references(() => users.id),

    status: text("status", {
      enum: approvalStatusEnum,
    })
      .notNull()
      .default("pending"),

    approvedBy: integer("approved_by").references(() => users.id),

    approvedAt: integer("approved_at", {
      mode: "timestamp",
    }).notNull(),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    uniqueIndex("event_assignment_change_requests_unique").on(
      table.eventId,
      table.userFromId,
      table.userToId,
    ),
  ],
);

export const eventMetrics = sqliteTable(
  "event_metrics",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    metricId: integer("metric_id")
      .notNull()
      .references(() => metrics.id),

    count: integer("count").notNull(),

    notes: text("notes"),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    uniqueIndex("event_metrics_event_metric_unique").on(
      table.eventId,
      table.metricId,
    ),
  ],
);

export const eventVolunteers = sqliteTable(
  "event_volunteers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    ministryId: integer("ministry_id")
      .notNull()
      .references(() => ministries.id),

    count: integer("count").notNull(),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    uniqueIndex("event_volunteers_event_ministry_unique").on(
      table.eventId,
      table.ministryId,
    ),
  ],
);

export const eventAltarCalls = sqliteTable(
  "event_altar_calls",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),

    eventId: integer("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    description: text("description").notNull(),

    count: integer("count").notNull(),

    sequence: integer("sequence").notNull().default(0),

    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .default(sql`CURRENT_TIMESTAMP`),

    createdBy: text("created_by").notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    uniqueIndex("event_altar_calls_event_sequence_unique").on(
      table.eventId,
      table.sequence,
    ),
  ],
);

/* ============================================================================
 * AUDIT TRAIL
 * ========================================================================== */

export const auditTrails = sqliteTable("audit_trails", {
  id: integer("id").primaryKey({ autoIncrement: true }),

  resource: text("resource").notNull(),
  recordId: integer("record_id").notNull(),

  action: text("action").notNull(),

  userId: integer("user_id").references(() => users.id),
  userName: text("user_name").notNull(),

  oldData: text("old_data").notNull(),
  newData: text("new_data").notNull(),

  changedAt: integer("changed_at", { mode: "timestamp" }).notNull(),
});

/* ============================================================================
 * RELATIONS
 * ========================================================================== */

export const schemaRelations = defineRelations(
  {
    teams,
    regions,
    eventTypes,
    ministries,
    metrics,
    tasks,
    configurations,
    users,
    permissions,
    roles,
    rolePermissions,
    userPermissions,
    events,
    eventTeams,
    eventAssignments,
    eventAssignmentChangeRequests,
    eventMetrics,
    eventVolunteers,
    eventAltarCalls,
    auditTrails,
  },
  (r) => ({
    regions: {
      teams: r.many.teams(),
    },

    teams: {
      region: r.one.regions({
        from: r.teams.regionId,
        to: r.regions.id,
        optional: false,
      }),
      users: r.many.users(),
    },

    users: {
      team: r.one.teams({
        from: r.users.teamId,
        to: r.teams.id,
        optional: false,
      }),
      role: r.one.roles({
        from: r.users.roleId,
        to: r.roles.id,
      }),
      permissions: r.many.permissions({
        from: r.users.id.through(r.userPermissions.userId),
        to: r.permissions.id.through(r.userPermissions.permissionId),
      }),
      assignments: r.many.eventAssignments({
        from: r.users.id,
        to: r.eventAssignments.userId,
      }),
      changeRequestsFrom: r.many.eventAssignmentChangeRequests({
        from: r.users.id,
        to: r.eventAssignmentChangeRequests.userFromId,
      }),
    },

    eventTypes: {
      events: r.many.events(),
    },

    ministries: {
      eventVolunteers: r.many.eventVolunteers(),
    },

    metrics: {
      eventMetrics: r.many.eventMetrics(),
    },

    tasks: {
      eventAssignments: r.many.eventAssignments(),
    },

    roles: {
      permissions: r.many.permissions({
        from: r.roles.id.through(r.rolePermissions.roleId),
        to: r.permissions.id.through(r.rolePermissions.permissionId),
      }),
      users: r.many.users(),
    },

    permissions: {
      roles: r.many.roles({
        from: r.permissions.id.through(r.rolePermissions.permissionId),
        to: r.roles.id.through(r.rolePermissions.roleId),
      }),
      users: r.many.users({
        from: r.permissions.id.through(r.userPermissions.permissionId),
        to: r.users.id.through(r.userPermissions.userId),
      }),
    },

    rolePermissions: {
      role: r.one.roles({
        from: r.rolePermissions.roleId,
        to: r.roles.id,
        optional: false,
      }),
      permission: r.one.permissions({
        from: r.rolePermissions.permissionId,
        to: r.permissions.id,
        optional: false,
      }),
    },

    userPermissions: {
      user: r.one.users({
        from: r.userPermissions.userId,
        to: r.users.id,
        optional: false,
      }),
      permission: r.one.permissions({
        from: r.userPermissions.permissionId,
        to: r.permissions.id,
        optional: false,
      }),
    },

    events: {
      region: r.one.regions({
        from: r.events.regionId,
        to: r.regions.id,
        optional: false,
      }),
      eventType: r.one.eventTypes({
        from: r.events.eventTypeId,
        to: r.eventTypes.id,
        optional: false,
      }),
      teams: r.many.teams({
        from: r.events.id.through(r.eventTeams.eventId),
        to: r.teams.id.through(r.eventTeams.teamId),
      }),
      assignments: r.many.eventAssignments({
        from: r.events.id,
        to: r.eventAssignments.eventId,
      }),
      changeRequests: r.many.eventAssignmentChangeRequests(),
      metrics: r.many.metrics({
        from: r.events.id.through(r.eventMetrics.eventId),
        to: r.metrics.id.through(r.eventMetrics.metricId),
      }),
      volunteers: r.many.ministries({
        from: r.events.id.through(r.eventVolunteers.eventId),
        to: r.ministries.id.through(r.eventVolunteers.ministryId),
      }),
      altarCalls: r.many.eventAltarCalls(),
    },

    eventTeams: {
      event: r.one.events({
        from: r.eventTeams.eventId,
        to: r.events.id,
        optional: false,
      }),
      team: r.one.teams({
        from: r.eventTeams.teamId,
        to: r.teams.id,
        optional: false,
      }),
    },

    eventAssignments: {
      event: r.one.events({
        from: r.eventAssignments.eventId,
        to: r.events.id,
        optional: false,
      }),
      user: r.one.users({
        from: r.eventAssignments.userId,
        to: r.users.id,
        optional: false,
      }),
      task: r.one.tasks({
        from: r.eventAssignments.taskId,
        to: r.tasks.id,
      }),
      ratedByUser: r.one.users({
        from: r.eventAssignments.ratedByUserId,
        to: r.users.id,
      }),
    },

    eventAssignmentChangeRequests: {
      event: r.one.events({
        from: r.eventAssignmentChangeRequests.eventId,
        to: r.events.id,
        optional: false,
      }),
      userFrom: r.one.users({
        from: r.eventAssignmentChangeRequests.userFromId,
        to: r.users.id,
        optional: false,
      }),
      userTo: r.one.users({
        from: r.eventAssignmentChangeRequests.userToId,
        to: r.users.id,
      }),
      approver: r.one.users({
        from: r.eventAssignmentChangeRequests.approvedBy,
        to: r.users.id,
      }),
    },

    eventMetrics: {
      event: r.one.events({
        from: r.eventMetrics.eventId,
        to: r.events.id,
        optional: false,
      }),
      metric: r.one.metrics({
        from: r.eventMetrics.metricId,
        to: r.metrics.id,
        optional: false,
      }),
    },

    eventVolunteers: {
      event: r.one.events({
        from: r.eventVolunteers.eventId,
        to: r.events.id,
        optional: false,
      }),

      ministry: r.one.ministries({
        from: r.eventVolunteers.ministryId,
        to: r.ministries.id,
        optional: false,
      }),
    },

    eventAltarCalls: {
      event: r.one.events({
        from: r.eventAltarCalls.eventId,
        to: r.events.id,
        optional: false,
      }),
    },

    auditTrails: {
      user: r.one.users({
        from: r.auditTrails.userId,
        to: r.users.id,
      }),
    },
  }),
);
