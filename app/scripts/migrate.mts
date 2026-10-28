// Applies ./drizzle migrations. Neon goes over HTTP; a localhost URL uses node-postgres.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { migrate as migrateNeon } from "drizzle-orm/neon-http/migrator";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import pg from "pg";

config({ path: process.env.ENV_FILE ?? ".env.local" });

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL_UNPOOLED is not set");

if (/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  const pool = new pg.Pool({ connectionString: url });
  await migratePg(drizzlePg(pool), { migrationsFolder: "./drizzle" });
  await pool.end();
} else {
  await migrateNeon(drizzleNeon(neon(url)), { migrationsFolder: "./drizzle" });
}
console.log("migrations applied");
