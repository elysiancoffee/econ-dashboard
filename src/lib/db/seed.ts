import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { db } from "../../../index";
import * as schema from "./schema";

const DEFAULT_ROLES = [
  { id: "r-1", name: "Boss" },
  { id: "r-2", name: "Consigliere" },
  { id: "r-3", name: "Bagman" },
  { id: "r-4", name: "Associate" },
  { id: "r-5", name: "Custodian" },
];

const DEFAULT_USERS = [
  { id: "u-1", username: "admin", role: "Boss", password: "password" },
];

async function main() {
  console.log("🌱 Seeding database...");

  // Clean old data
  console.log("Cleaning old data...");
  await db.delete(schema.logs);
  await db.delete(schema.submissions);
  await db.delete(schema.tasks);
  await db.delete(schema.staffProgress);
  await db.delete(schema.permissions);
  await db.delete(schema.boards);
  await db.delete(schema.users);
  await db.delete(schema.roles);

  // Insert roles
  console.log("Inserting roles...");
  await db.insert(schema.roles).values(DEFAULT_ROLES);

  // Insert users
  console.log("Inserting users...");
  await db.insert(schema.users).values(DEFAULT_USERS);

  // Seeding logs is skipped to keep DB clean as requested
  console.log("No extra data seeded.");

  console.log("✅ Seeding completed!");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
