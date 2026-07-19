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

  console.log("Seeding roles...");

  const roleNames = ["Admin", "Head Ministry", "Regional PIC", "SPV", "Member"];
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
        roleId: roleMap.get("Admin"),
        createdBy: SEEDER_USER,
        updatedBy: SEEDER_USER,
      })
      .returning();
    console.log("Created user: ADMIN");
  } else {
    adminUser = existingAdmin[0];
    console.log("User already exists: ADMIN");
  }

  if (adminUser) {
    const adminRoleId = roleMap.get("Admin");
    if (adminRoleId) {
      if (adminUser.roleId !== adminRoleId) {
        await db
          .update(users)
          .set({ roleId: adminRoleId, updatedBy: SEEDER_USER })
          .where(eq(users.id, adminUser.id));
        console.log("Assigned Admin role to admin user");
      } else {
        console.log("Admin user already has Admin role");
      }
    }
  }

  console.log("Seeding completed.");
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
