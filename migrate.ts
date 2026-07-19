import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function main() {
  const connectionString = process.env.POSTGRES_URL;
  if (!connectionString) {
    throw new Error("POSTGRES_URL environment variable is not set.");
  }

  const db = drizzle(postgres(connectionString, { max: 1 }));
  console.log("🚀 Running migrations...");
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("✅ Migrations applied successfully!");
  process.exit(0);
}

main().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
