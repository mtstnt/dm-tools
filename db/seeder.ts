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
  const teamNames = Array.from({ length: 6 }, (_, i) => String(i + 7));
  for (const name of teamNames) {
    const existing = await db
      .select()
      .from(teams)
      .where(and(eq(teams.name, name), eq(teams.regionId, region.id)))
      .limit(1);

    if (existing.length === 0) {
      const [team] = await db
        .insert(teams)
        .values({
          name,
          regionId: region.id,
          createdBy: SEEDER_USER,
          updatedBy: SEEDER_USER,
        })
        .returning();
      console.log(`Created team: ${team.name}`);
    } else {
      console.log(`Team already exists: ${name}`);
    }
  }

  console.log("Seeding event types...");
  const eventTypeNames = [
    "AOG TEEN",
    "AOG YOUTH",
    "DOA WILAYAH",
    "CT YOUTH",
    "CT TEEN",
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
    "Data Ministry",
    "Crowd",
    "Usher",
    "Praise & Worship",
    "Prayer",
    "Multimedia",
    "Service Ministry",
    "Make Up Artist",
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
    "Welcome Home Lounge",
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

  console.log("Seeding users...");
  const adminEmail = "admin@email.com";
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existingAdmin.length === 0) {
    const hashedPassword = bcrypt.hashSync("123456", 10);

    await db.insert(users).values({
      fullName: "ADMIN",
      email: adminEmail,
      password: hashedPassword,
      createdBy: SEEDER_USER,
      updatedBy: SEEDER_USER,
    });
    console.log("Created user: ADMIN");
  } else {
    console.log("User already exists: ADMIN");
  }

  console.log("Seeding completed.");
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
