import { eq, and } from "drizzle-orm";
import bcrypt from "bcrypt";

import { db } from "./connection";
import {
  regions,
  teams,
  eventTypes,
  ministries,
  metrics,
  tasks,
  users,
  roles,
  permissions,
  rolePermissions,
  type Action,
} from "./schema";

const SEEDER_USER = "seeder";

async function seed() {
  console.log("Seeding regions...");
  const regionName = "GMS Surabaya Selatan";

  let [region] = await db
    .select()
    .from(regions)
    .where(eq(regions.name, regionName))
    .limit(1);

  if (!region) {
    [region] = await db
      .insert(regions)
      .values({
        name: regionName,
        createdBy: SEEDER_USER,
        updatedBy: SEEDER_USER,
      })
      .returning();
    console.log(`Created region: ${region.name}`);
  } else {
    console.log(`Region already exists: ${region.name}`);
  }

  console.log("Seeding teams...");
  const teamNumbers = Array.from({ length: 6 }, (_, i) => i + 7);
  for (const number of teamNumbers) {
    const existing = await db
      .select()
      .from(teams)
      .where(and(eq(teams.number, number), eq(teams.regionId, region.id)))
      .limit(1);

    if (existing.length === 0) {
      const [team] = await db
        .insert(teams)
        .values({
          number,
          regionId: region.id,
          createdBy: SEEDER_USER,
          updatedBy: SEEDER_USER,
        })
        .returning();
      console.log(`Created team: ${team.number}`);
    } else {
      console.log(`Team already exists: ${number}`);
    }
  }

  console.log("Seeding event types...");
  const eventTypeNames = [
    "AOG TEEN",
    "AOG YOUTH",
    "DOA WILAYAH",
    "CT YOUTH",
    "CT TEEN",
    "CUSTOM",
  ];
  for (const name of eventTypeNames) {
    const existing = await db
      .select()
      .from(eventTypes)
      .where(eq(eventTypes.name, name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(eventTypes).values({
        name,
        createdBy: SEEDER_USER,
        updatedBy: SEEDER_USER,
      });
      console.log(`Created event type: ${name}`);
    } else {
      console.log(`Event type already exists: ${name}`);
    }
  }

  console.log("Seeding ministries...");
  const ministryNames = [
    "DM",
    "Crowd",
    "Usher",
    "PAW",
    "Prayer",
    "MM",
    "SM",
    "MUA",
    "First Aid",
    "Photography",
    "Lighting",
    "Greeter",
    "Communications",
    "Baptism",
    "Companion",
    "Stylist",
    "Hospitality",
    "General Affairs",
    "Drama",
    "Conceptor",
    "WHL",
    "Sound",
    "Choir",
  ];
  for (const name of ministryNames) {
    const existing = await db
      .select()
      .from(ministries)
      .where(eq(ministries.name, name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(ministries).values({
        name,
        createdBy: SEEDER_USER,
        updatedBy: SEEDER_USER,
      });
      console.log(`Created ministry: ${name}`);
    } else {
      console.log(`Ministry already exists: ${name}`);
    }
  }

  console.log("Seeding metrics...");
  const metricNames = [
    "Seat Counter",
    "Tally Counter",
    "WHL",
    "Bersedia Join CG",
    "Prayer Station",
    "One Minute Prayer",
    "Baptisan",
  ];
  for (const name of metricNames) {
    const existing = await db
      .select()
      .from(metrics)
      .where(eq(metrics.name, name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(metrics).values({
        name,
        createdBy: SEEDER_USER,
        updatedBy: SEEDER_USER,
      });
      console.log(`Created metric: ${name}`);
    } else {
      console.log(`Metric already exists: ${name}`);
    }
  }

  console.log("Seeding tasks...");
  const taskNames = [
    "Event PIC",
    "SC",
    "TC",
    "FD",
    "AC Left",
    "AC Right",
    "AC Mobile",
  ];
  for (const name of taskNames) {
    const existing = await db
      .select()
      .from(tasks)
      .where(eq(tasks.name, name))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(tasks).values({
        name,
        createdBy: SEEDER_USER,
        updatedBy: SEEDER_USER,
      });
      console.log(`Created task: ${name}`);
    } else {
      console.log(`Task already exists: ${name}`);
    }
  }

  console.log("Seeding roles and permissions...");

  const roleNames = ["ADMIN", "Head Ministry", "Regional PIC", "SPV", "Member"];
  const roleMap = new Map<string, number>();

  for (const name of roleNames) {
    let [role] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
    if (!role) {
      [role] = await db
        .insert(roles)
        .values({
          name,
          createdBy: SEEDER_USER,
          updatedBy: SEEDER_USER,
        })
        .returning();
      console.log(`Created role: ${role.name}`);
    } else {
      console.log(`Role already exists: ${role.name}`);
    }
    roleMap.set(role.name, role.id);
  }

  const permissionEntries: { resource: string; action: Action }[] = [
    // Master data
    { resource: "regions", action: "create" },
    { resource: "regions", action: "read" },
    { resource: "regions", action: "update" },
    { resource: "regions", action: "delete" },
    { resource: "teams", action: "create" },
    { resource: "teams", action: "read" },
    { resource: "teams", action: "update" },
    { resource: "teams", action: "delete" },
    { resource: "event_types", action: "create" },
    { resource: "event_types", action: "read" },
    { resource: "event_types", action: "update" },
    { resource: "event_types", action: "delete" },
    { resource: "ministries", action: "create" },
    { resource: "ministries", action: "read" },
    { resource: "ministries", action: "update" },
    { resource: "ministries", action: "delete" },
    { resource: "metrics", action: "create" },
    { resource: "metrics", action: "read" },
    { resource: "metrics", action: "update" },
    { resource: "metrics", action: "delete" },
    { resource: "tasks", action: "create" },
    { resource: "tasks", action: "read" },
    { resource: "tasks", action: "update" },
    { resource: "tasks", action: "delete" },
    { resource: "configurations", action: "create" },
    { resource: "configurations", action: "read" },
    { resource: "configurations", action: "update" },
    { resource: "configurations", action: "delete" },
    // Users
    { resource: "users", action: "create" },
    { resource: "users", action: "read" },
    { resource: "users", action: "update" },
    { resource: "users", action: "delete" },
    { resource: "roles", action: "create" },
    { resource: "roles", action: "read" },
    { resource: "roles", action: "update" },
    { resource: "roles", action: "delete" },
    { resource: "permissions", action: "create" },
    { resource: "permissions", action: "read" },
    { resource: "permissions", action: "update" },
    { resource: "permissions", action: "delete" },
    { resource: "role_permissions", action: "create" },
    { resource: "role_permissions", action: "read" },
    { resource: "role_permissions", action: "update" },
    { resource: "role_permissions", action: "delete" },
    { resource: "user_permissions", action: "create" },
    { resource: "user_permissions", action: "read" },
    { resource: "user_permissions", action: "update" },
    { resource: "user_permissions", action: "delete" },
    // Events
    { resource: "events", action: "create" },
    { resource: "events", action: "read" },
    { resource: "events", action: "update" },
    { resource: "events", action: "delete" },
    { resource: "event_teams", action: "create" },
    { resource: "event_teams", action: "read" },
    { resource: "event_teams", action: "update" },
    { resource: "event_teams", action: "delete" },
    { resource: "event_volunteers", action: "create" },
    { resource: "event_volunteers", action: "read" },
    { resource: "event_volunteers", action: "update" },
    { resource: "event_volunteers", action: "delete" },
    { resource: "event_assignments", action: "create" },
    { resource: "event_assignments", action: "read" },
    { resource: "event_assignments", action: "update" },
    { resource: "event_assignments", action: "delete" },
    { resource: "event_metrics", action: "create" },
    { resource: "event_metrics", action: "read" },
    { resource: "event_metrics", action: "update" },
    { resource: "event_metrics", action: "delete" },
    { resource: "event_altar_calls", action: "create" },
    { resource: "event_altar_calls", action: "read" },
    { resource: "event_altar_calls", action: "update" },
    { resource: "event_altar_calls", action: "delete" },
    { resource: "event_assignment_change_requests", action: "create" },
    { resource: "event_assignment_change_requests", action: "read" },
    { resource: "event_assignment_change_requests", action: "update" },
    { resource: "event_assignment_change_requests", action: "delete" },
    // Audit trails
    { resource: "audit_trails", action: "read" },
    // Other actions
    { resource: "gen_monthly_report", action: "execute" },
    { resource: "gen_weekly_report", action: "execute" },
    { resource: "gen_yearly_report", action: "execute" },
  ];

  const permissionMap = new Map<string, number>();

  for (const entry of permissionEntries) {
    const key = `${entry.resource}:${entry.action}`;
    let [permission] = await db
      .select()
      .from(permissions)
      .where(
        and(
          eq(permissions.resource, entry.resource),
          eq(permissions.action, entry.action),
        ),
      )
      .limit(1);

    if (!permission) {
      [permission] = await db
        .insert(permissions)
        .values({
          resource: entry.resource,
          action: entry.action,
          createdBy: SEEDER_USER,
          updatedBy: SEEDER_USER,
        })
        .returning();
      console.log(`Created permission: ${key}`);
    } else {
      console.log(`Permission already exists: ${key}`);
    }
    permissionMap.set(key, permission.id);
  }

  function getPermissionId(resource: string, action: string): number {
    const key = `${resource}:${action}`;
    const id = permissionMap.get(key);
    if (!id) {
      throw new Error(`Permission not found: ${key}`);
    }
    return id;
  }

  type Scope = "all" | "region" | "team" | "self";

  const rolePermissionEntries: {
    roleName: string;
    resource: string;
    actions: string[];
    scope: Scope;
  }[] = [
    // Head Ministry
    { roleName: "Head Ministry", resource: "regions", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "teams", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "event_types", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "ministries", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "metrics", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "tasks", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "configurations", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "users", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "roles", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "permissions", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "role_permissions", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "user_permissions", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "events", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "event_teams", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "event_volunteers", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "event_assignments", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "event_metrics", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "event_altar_calls", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "event_assignment_change_requests", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Head Ministry", resource: "audit_trails", actions: ["read"], scope: "all" },
    { roleName: "Head Ministry", resource: "gen_yearly_report", actions: ["execute"], scope: "all" },
    { roleName: "Head Ministry", resource: "gen_monthly_report", actions: ["execute"], scope: "all" },
    { roleName: "Head Ministry", resource: "gen_weekly_report", actions: ["execute"], scope: "all" },
    // Regional PIC
    { roleName: "Regional PIC", resource: "teams", actions: ["create", "read", "update", "delete"], scope: "region" },
    { roleName: "Regional PIC", resource: "event_types", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Regional PIC", resource: "ministries", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Regional PIC", resource: "metrics", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Regional PIC", resource: "tasks", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Regional PIC", resource: "users", actions: ["create", "read", "update", "delete"], scope: "region" },
    { roleName: "Regional PIC", resource: "roles", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Regional PIC", resource: "permissions", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Regional PIC", resource: "role_permissions", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Regional PIC", resource: "user_permissions", actions: ["create", "read", "update", "delete"], scope: "all" },
    { roleName: "Regional PIC", resource: "events", actions: ["create", "read", "update", "delete"], scope: "region" },
    { roleName: "Regional PIC", resource: "event_teams", actions: ["create", "read", "update", "delete"], scope: "region" },
    { roleName: "Regional PIC", resource: "event_volunteers", actions: ["create", "read", "update", "delete"], scope: "region" },
    { roleName: "Regional PIC", resource: "event_assignments", actions: ["create", "read", "update", "delete"], scope: "region" },
    { roleName: "Regional PIC", resource: "event_metrics", actions: ["create", "read", "update", "delete"], scope: "region" },
    { roleName: "Regional PIC", resource: "event_altar_calls", actions: ["create", "read", "update", "delete"], scope: "region" },
    { roleName: "Regional PIC", resource: "event_assignment_change_requests", actions: ["create", "read", "update", "delete"], scope: "region" },
    { roleName: "Regional PIC", resource: "audit_trails", actions: ["read"], scope: "all" },
    { roleName: "Regional PIC", resource: "gen_monthly_report", actions: ["execute"], scope: "region" },
    { roleName: "Regional PIC", resource: "gen_weekly_report", actions: ["execute"], scope: "region" },
    // SPV
    { roleName: "SPV", resource: "teams", actions: ["read"], scope: "region" },
    { roleName: "SPV", resource: "users", actions: ["read"], scope: "region" },
    { roleName: "SPV", resource: "events", actions: ["read"], scope: "region" },
    { roleName: "SPV", resource: "events", actions: ["update"], scope: "team" },
    { roleName: "SPV", resource: "event_teams", actions: ["read"], scope: "team" },
    { roleName: "SPV", resource: "event_volunteers", actions: ["create", "read", "update", "delete"], scope: "team" },
    { roleName: "SPV", resource: "event_assignments", actions: ["create", "read", "update", "delete"], scope: "team" },
    { roleName: "SPV", resource: "event_metrics", actions: ["create", "read", "update", "delete"], scope: "team" },
    { roleName: "SPV", resource: "event_altar_calls", actions: ["create", "read", "update", "delete"], scope: "team" },
    { roleName: "SPV", resource: "event_assignment_change_requests", actions: ["create", "read", "update", "delete"], scope: "team" },
    { roleName: "SPV", resource: "gen_weekly_report", actions: ["execute"], scope: "team" },
    // Member
    { roleName: "Member", resource: "events", actions: ["read"], scope: "region" },
    { roleName: "Member", resource: "events", actions: ["update"], scope: "self" },
    { roleName: "Member", resource: "event_assignment_change_requests", actions: ["create", "read"], scope: "self" },
  ];

  for (const entry of rolePermissionEntries) {
    const roleId = roleMap.get(entry.roleName);
    if (!roleId) continue;

    for (const action of entry.actions) {
      const permissionId = getPermissionId(entry.resource, action);

      const existing = await db
        .select()
        .from(rolePermissions)
        .where(
          and(
            eq(rolePermissions.roleId, roleId),
            eq(rolePermissions.permissionId, permissionId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(rolePermissions).values({
          roleId,
          permissionId,
          scope: entry.scope,
          createdBy: SEEDER_USER,
          updatedBy: SEEDER_USER,
        });
        console.log(
          `Created role permission: ${entry.roleName} -> ${entry.resource}:${action} (${entry.scope})`,
        );
      } else {
        console.log(
          `Role permission already exists: ${entry.roleName} -> ${entry.resource}:${action}`,
        );
      }
    }
  }

  console.log("Seeding users...");
  const adminEmail = "admin@email.com";
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  let adminUser;
  if (existingAdmin.length === 0) {
    const hashedPassword = bcrypt.hashSync("123456", 10);

    [adminUser] = await db
      .insert(users)
      .values({
        fullName: "ADMIN",
        nij: "ADMIN",
        email: adminEmail,
        password: hashedPassword,
        roleId: roleMap.get("ADMIN"),
        createdBy: SEEDER_USER,
        updatedBy: SEEDER_USER,
      })
      .returning();
    console.log("Created user: ADMIN");
  } else {
    adminUser = existingAdmin[0];
    console.log("User already exists: ADMIN");
  }

  // Ensure admin user has the ADMIN role.
  if (adminUser) {
    const adminRoleId = roleMap.get("ADMIN");
    if (adminRoleId) {
      if (adminUser.roleId !== adminRoleId) {
        await db
          .update(users)
          .set({ roleId: adminRoleId, updatedBy: SEEDER_USER })
          .where(eq(users.id, adminUser.id));
        console.log("Assigned ADMIN role to admin user");
      } else {
        console.log("Admin user already has ADMIN role");
      }
    }
  }

  console.log("Seeding completed.");
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
